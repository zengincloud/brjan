import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import OpenAI from "openai"
import {
  listBots,
  listBotRecordings,
  listRecordingTranscripts,
  createAsyncTranscript,
  getBot,
  resolveMeetingUrl,
} from "@/lib/recall/client"

export const dynamic = "force-dynamic"

// POST /api/meetings/reconcile
// Fetches recent bots from Recall, ensures Meeting DB records exist,
// and processes any transcripts that were missed by the webhook.
export const POST = withAuth(async (_req: NextRequest, userId: string) => {
  const results: { botId: string; action: string }[] = []

  let botsResp: Awaited<ReturnType<typeof listBots>>
  try {
    botsResp = await listBots(30)
  } catch (err) {
    console.error("[reconcile] failed to list bots:", err)
    return NextResponse.json({ error: "Failed to fetch bots from Recall" }, { status: 500 })
  }

  const doneBots = botsResp.results.filter((b) =>
    b.status_changes?.some((s) => s.code === "done" || s.code === "call_ended")
  )

  for (const bot of doneBots) {
    const botId = bot.id

    // Ensure Meeting record exists
    let meeting = await prisma.meeting.findUnique({ where: { recallBotId: botId } })
    if (!meeting) {
      const resolvedUserId = await resolveUserId(bot, userId)
      if (!resolvedUserId) {
        results.push({ botId, action: "skipped:no_user" })
        continue
      }

      const statusChanges = bot.status_changes || []
      const startEntry = statusChanges.find((s) => s.code === "in_call_recording" || s.code === "in_call_not_recording")
      const endEntry = statusChanges.find((s) => s.code === "done" || s.code === "call_ended")
      const startedAt = startEntry ? new Date(startEntry.created_at) : null
      const endedAt = endEntry ? new Date(endEntry.created_at) : null
      const duration = startedAt && endedAt ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000) : null

      meeting = await prisma.meeting.create({
        data: {
          userId: resolvedUserId,
          recallBotId: botId,
          title: bot.meeting_metadata?.title || null,
          meetingUrl: resolveMeetingUrl(bot.meeting_url),
          startedAt,
          endedAt,
          duration,
        },
      })
      results.push({ botId, action: "created_meeting_record" })
    }

    // Only process transcripts for this user's meetings
    if (meeting.userId !== userId) {
      results.push({ botId, action: "skipped:other_user" })
      continue
    }

    if (meeting.summary) {
      results.push({ botId, action: "already_done" })
      continue
    }

    // Find recordings and transcripts
    let recordings: Awaited<ReturnType<typeof listBotRecordings>>
    try {
      recordings = await listBotRecordings(botId)
    } catch {
      results.push({ botId, action: "error:list_recordings" })
      continue
    }

    let processed = false
    for (const recording of recordings.results) {
      let transcripts: Awaited<ReturnType<typeof listRecordingTranscripts>>
      try {
        transcripts = await listRecordingTranscripts(recording.id)
      } catch {
        continue
      }

      const ready = transcripts.results.find((t) => t.status?.code === "completed" && t.download_url)
      if (ready?.download_url) {
        const saved = await processAndSaveTranscript(meeting.id, meeting.userId, botId, ready.download_url)
        if (saved) {
          results.push({ botId, action: "processed_transcript" })
          processed = true
          break
        }
      } else if (transcripts.results.length === 0) {
        // No transcript exists yet — kick one off
        try {
          await createAsyncTranscript(recording.id)
          results.push({ botId, action: "started_transcription" })
          processed = true
          break
        } catch {
          results.push({ botId, action: "error:start_transcription" })
        }
      } else {
        // Transcript exists but still processing
        results.push({ botId, action: "transcription_in_progress" })
        processed = true
        break
      }
    }

    if (!processed && recordings.results.length === 0) {
      results.push({ botId, action: "no_recordings" })
    }
  }

  return NextResponse.json({ reconciled: results.length, results })
})

async function resolveUserId(bot: Awaited<ReturnType<typeof listBots>>["results"][number], fallbackUserId: string): Promise<string | null> {
  const externalId = bot.calendar_meetings?.[0]?.calendar_user?.external_id
  if (externalId) {
    const user = await prisma.user.findUnique({ where: { id: externalId }, select: { id: true } })
    if (user) return user.id
  }
  // Use the authenticated user as fallback
  return fallbackUserId
}

async function processAndSaveTranscript(
  meetingId: string,
  userId: string,
  botId: string,
  downloadUrl: string
): Promise<boolean> {
  try {
    const res = await fetch(downloadUrl)
    if (!res.ok) return false
    const raw = await res.json()

    type Seg = { speaker?: string; text?: string; words?: { text: string }[] }
    const segments: Seg[] = Array.isArray(raw) ? raw : raw.segments || raw.transcript || []

    const transcriptText = segments
      .map((s) => {
        const text = s.text ?? s.words?.map((w) => w.text).join(" ") ?? ""
        return s.speaker ? `${s.speaker}: ${text}` : text
      })
      .filter(Boolean)
      .join("\n")

    // Update timing from bot
    const bot = await getBot(botId)
    const statusChanges = bot.status_changes || []
    const startEntry = statusChanges.find((s) => s.code === "in_call_recording" || s.code === "in_call_not_recording")
    const endEntry = statusChanges.find((s) => s.code === "done" || s.code === "call_ended")
    const startedAt = startEntry ? new Date(startEntry.created_at) : undefined
    const endedAt = endEntry ? new Date(endEntry.created_at) : undefined
    const duration = startedAt && endedAt ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000) : undefined

    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        transcript: segments as any,
        ...(startedAt ? { startedAt } : {}),
        ...(endedAt ? { endedAt } : {}),
        ...(duration ? { duration } : {}),
        title: bot.meeting_metadata?.title || undefined,
      },
    })

    if (!transcriptText.trim()) return true

    const grokKey = process.env.GROK_API_KEY
    if (!grokKey) return true

    const grok = new OpenAI({ apiKey: grokKey, baseURL: "https://api.x.ai/v1" })
    const response = await grok.chat.completions.create({
      model: "grok-3-mini-fast",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Analyze this sales meeting transcript and return JSON only.

Transcript:
${transcriptText}

Return this exact shape:
{
  "summary": "2-4 sentence recap of what was discussed, any pain points surfaced, and sentiment",
  "actionItems": ["action 1", "action 2"]
}`,
        },
      ],
    })

    const text = response.choices[0]?.message?.content || ""
    let parsed: { summary: string; actionItems: string[] } | null = null
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) parsed = JSON.parse(match[0])
    }
    if (!parsed) return true

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { attendees: true, prospectId: true, accountId: true },
    })
    const attendees = (meeting?.attendees as { name?: string; email?: string }[] | null) || []
    const emails = attendees.map((a) => a.email).filter(Boolean) as string[]
    let prospectId = meeting?.prospectId
    let accountId = meeting?.accountId

    if (emails.length > 0 && (!prospectId || !accountId)) {
      const prospect = await prisma.prospect.findFirst({
        where: { email: { in: emails } },
        select: { id: true, accountId: true },
      })
      if (prospect) {
        prospectId = prospect.id
        accountId = prospect.accountId || accountId
      }
    }

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { summary: parsed.summary, actionItems: parsed.actionItems, prospectId, accountId },
    })

    if (accountId) await prisma.account.update({ where: { id: accountId }, data: { lastActivity: new Date() } })
    if (prospectId) await prisma.prospect.update({ where: { id: prospectId }, data: { lastActivity: new Date() } })

    const title = (await prisma.meeting.findUnique({ where: { id: meetingId }, select: { title: true } }))?.title
    await prisma.notification.create({
      data: {
        userId,
        type: "meeting_summary_ready",
        title: `Meeting summary ready${title ? ` — ${title}` : ""}`,
        body: parsed.summary,
        link: "/activity/meetings",
      },
    })

    return true
  } catch (err) {
    console.error("[reconcile] processAndSaveTranscript error:", err)
    return false
  }
}
