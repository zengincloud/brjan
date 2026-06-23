import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import OpenAI from "openai"
import {
  verifyWebhookSignature,
  createAsyncTranscript,
  getAsyncTranscript,
  getBot,
  resolveMeetingUrl,
} from "@/lib/recall/client"

export const dynamic = "force-dynamic"

// POST /api/webhooks/meetings/recall - Recall.ai webhook handler
// Handles async transcription flow:
//   recording.done  → kick off ElevenLabs transcription
//   transcript.done → fetch transcript, generate Claude summary
//   transcript.failed → log error
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (!verifyWebhookSignature(rawBody, request.headers)) {
    console.warn("Recall webhook: invalid signature")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const event = payload.event
  const botId = payload.data?.bot?.id ?? payload.data?.bot_id
  const recordingId = payload.data?.recording?.id
  const transcriptId = payload.data?.transcript?.id

  console.log(`[recall webhook] event=${event} botId=${botId} recordingId=${recordingId} transcriptId=${transcriptId}`)
  console.log(`[recall webhook] full data:`, JSON.stringify(payload.data))

  if (!botId) return NextResponse.json({ received: true })

  if (event === "recording.done" && recordingId) {
    try {
      const result = await createAsyncTranscript(recordingId)
      console.log(`[recall webhook] async transcript created:`, JSON.stringify(result))
    } catch (err) {
      console.error(`Recall: failed to start async transcript for recording ${recordingId}:`, err)
    }
  } else if (event === "recording.done" && !recordingId) {
    console.error(`[recall webhook] recording.done fired but no recordingId found in payload`)
  } else if (event === "transcript.done" && transcriptId) {
    await processTranscript(botId, transcriptId)
  } else if (event === "transcript.failed") {
    console.error(`Recall: transcript failed for bot ${botId}`, payload.data)
  } else if (event === "bot.done") {
    await updateBotTiming(botId)
  }

  return NextResponse.json({ received: true })
}

// When Calendar V1 auto-dispatches a bot, there's no Meeting row in our DB yet.
// This creates one using the bot's calendar_meetings[].calendar_user.external_id
// which equals the userId we passed when creating the Recall calendar token.
async function ensureMeetingRecord(botId: string): Promise<string | null> {
  const existing = await prisma.meeting.findUnique({ where: { recallBotId: botId } })
  if (existing) return existing.userId

  try {
    const bot = await getBot(botId)
    const externalId = bot.calendar_meetings?.[0]?.calendar_user?.external_id

    let resolvedUserId: string | null = null

    if (externalId) {
      const user = await prisma.user.findUnique({ where: { id: externalId }, select: { id: true } })
      if (user) resolvedUserId = user.id
    }

    // Fallback: if we can't get userId from Recall, find the one eligible user
    if (!resolvedUserId) {
      console.warn(`[recall webhook] bot ${botId} has no calendar_user.external_id — trying fallback user lookup`)
      const eligible = await prisma.user.findMany({
        where: { OR: [{ tier: "pro_max" }, { role: "super_admin" }] },
        select: { id: true, notetakerSettings: true },
      })
      const autoJoinUsers = eligible.filter((u) => {
        const ns = (u.notetakerSettings ?? {}) as Record<string, any>
        return ns.autoJoin !== false
      })
      if (autoJoinUsers.length === 1) {
        resolvedUserId = autoJoinUsers[0].id
        console.log(`[recall webhook] fallback resolved userId=${resolvedUserId}`)
      } else {
        console.warn(`[recall webhook] fallback found ${autoJoinUsers.length} eligible users, cannot auto-create meeting`)
        return null
      }
    }

    const user = { id: resolvedUserId }

    const statusChanges = bot.status_changes || []
    const startEntry = statusChanges.find((s) => s.code === "in_call_recording" || s.code === "in_call_not_recording")
    const endEntry = statusChanges.find((s) => s.code === "done" || s.code === "call_ended")
    const startedAt = startEntry ? new Date(startEntry.created_at) : null
    const endedAt = endEntry ? new Date(endEntry.created_at) : null
    const duration = startedAt && endedAt ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000) : null

    await prisma.meeting.create({
      data: {
        userId: user.id,
        recallBotId: botId,
        title: bot.meeting_metadata?.title || null,
        meetingUrl: resolveMeetingUrl(bot.meeting_url),
        startedAt,
        endedAt,
        duration,
      },
    })
    console.log(`[recall webhook] auto-created Meeting record for Calendar V1 bot ${botId}, userId=${user.id}`)
    return user.id
  } catch (err) {
    console.error(`[recall webhook] failed to auto-create meeting for bot ${botId}:`, err)
    return null
  }
}

async function updateBotTiming(botId: string) {
  await ensureMeetingRecord(botId)
  const meeting = await prisma.meeting.findUnique({ where: { recallBotId: botId } })
  if (!meeting) return
  try {
    const bot = await getBot(botId)
    const statusChanges = bot.status_changes || []
    const startEntry = statusChanges.find((s) => s.code === "in_call_recording" || s.code === "in_call_not_recording")
    const endEntry = statusChanges.find((s) => s.code === "done" || s.code === "call_ended")
    const startedAt = startEntry ? new Date(startEntry.created_at) : meeting.startedAt
    const endedAt = endEntry ? new Date(endEntry.created_at) : new Date()
    const duration = startedAt && endedAt ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000) : null
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { startedAt, endedAt, duration, title: bot.meeting_metadata?.title || meeting.title },
    })
  } catch (err) {
    console.error("Recall: failed to update bot timing:", err)
  }
}

async function processTranscript(botId: string, transcriptId: string) {
  await ensureMeetingRecord(botId)
  const meeting = await prisma.meeting.findUnique({ where: { recallBotId: botId } })
  if (!meeting) {
    console.warn(`Recall webhook: no meeting found for bot ${botId}`)
    return
  }

  try {
    // Fetch transcript download URL
    const transcriptData = await getAsyncTranscript(transcriptId)
    console.log(`[recall webhook] transcript ${transcriptId} status=${transcriptData.status?.code} download_url=${transcriptData.download_url ? "present" : "null"}`)
    if (!transcriptData.download_url) {
      console.warn(`[recall webhook] transcript ${transcriptId} has no download_url — skipping`)
      return
    }

    const transcriptRes = await fetch(transcriptData.download_url)
    if (!transcriptRes.ok) {
      console.warn(`[recall webhook] failed to download transcript: ${transcriptRes.status}`)
      return
    }
    const raw = await transcriptRes.json()

    // Recall async transcript format: array of { speaker, words[] } or { speaker, text }
    type TranscriptSegment = { speaker?: string; text?: string; words?: { text: string }[] }
    const segments: TranscriptSegment[] = Array.isArray(raw) ? raw : raw.segments || raw.transcript || []

    const transcriptText = segments
      .map((s) => {
        const text = s.text ?? s.words?.map((w) => w.text).join(" ") ?? ""
        return s.speaker ? `${s.speaker}: ${text}` : text
      })
      .filter(Boolean)
      .join("\n")

    console.log(`[recall webhook] transcript downloaded: ${segments.length} segments, ${transcriptText.length} chars`)

    // Update timing from bot status
    const bot = await getBot(botId)
    const statusChanges = bot.status_changes || []
    const startEntry = statusChanges.find((s) => s.code === "in_call_recording" || s.code === "in_call_not_recording")
    const endEntry = statusChanges.find((s) => s.code === "done" || s.code === "call_ended")
    const startedAt = startEntry ? new Date(startEntry.created_at) : meeting.startedAt
    const endedAt = endEntry ? new Date(endEntry.created_at) : new Date()
    const duration = startedAt && endedAt ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000) : null

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        transcript: segments as any,
        startedAt,
        endedAt,
        duration,
        title: bot.meeting_metadata?.title || meeting.title,
      },
    })

    if (!transcriptText.trim()) return

    // Generate summary with Grok
    const grokKey = process.env.GROK_API_KEY
    if (!grokKey) return

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

    if (!parsed) return

    // Match attendees to prospects/accounts
    const attendees = (meeting.attendees as { name?: string; email?: string }[] | null) || []
    const emails = attendees.map((a) => a.email).filter(Boolean) as string[]
    let prospectId = meeting.prospectId
    let accountId = meeting.accountId

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
      where: { id: meeting.id },
      data: { summary: parsed.summary, actionItems: parsed.actionItems, prospectId, accountId },
    })
    console.log(`[recall webhook] summary saved for meeting ${meeting.id} (bot ${botId})`)

    if (accountId) await prisma.account.update({ where: { id: accountId }, data: { lastActivity: new Date() } })
    if (prospectId) await prisma.prospect.update({ where: { id: prospectId }, data: { lastActivity: new Date() } })

    // Create in-app notification
    const meetingTitle = (await prisma.meeting.findUnique({ where: { id: meeting.id }, select: { title: true } }))?.title
    await prisma.notification.create({
      data: {
        userId: meeting.userId,
        type: "meeting_summary_ready",
        title: `Meeting summary ready${meetingTitle ? ` — ${meetingTitle}` : ""}`,
        body: parsed.summary,
        link: "/activity/meetings",
      },
    })
  } catch (error) {
    console.error("Error processing transcript:", error)
  }
}
