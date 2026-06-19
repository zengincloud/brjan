import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import {
  verifyWebhookSignature,
  createAsyncTranscript,
  getAsyncTranscript,
  getBot,
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

  if (!botId) return NextResponse.json({ received: true })

  if (event === "recording.done" && recordingId) {
    // Kick off async transcription using the recording ID
    try {
      await createAsyncTranscript(recordingId, "elevenlabs_async")
    } catch (err) {
      console.error(`Recall: failed to start async transcript for recording ${recordingId}:`, err)
    }
  } else if (event === "transcript.done" && transcriptId) {
    await processTranscript(botId, transcriptId)
  } else if (event === "transcript.failed") {
    console.error(`Recall: transcript failed for bot ${botId}`, payload.data)
  } else if (event === "bot.done") {
    await updateBotTiming(botId)
  }

  return NextResponse.json({ received: true })
}

async function updateBotTiming(botId: string) {
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
  const meeting = await prisma.meeting.findUnique({ where: { recallBotId: botId } })
  if (!meeting) {
    console.warn(`Recall webhook: no meeting found for bot ${botId}`)
    return
  }

  try {
    // Fetch transcript download URL
    const transcriptData = await getAsyncTranscript(transcriptId)
    if (!transcriptData.download_url) return

    const transcriptRes = await fetch(transcriptData.download_url)
    if (!transcriptRes.ok) return
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

    // Generate summary with Claude
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) return

    const anthropic = new Anthropic({ apiKey: anthropicKey })
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
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

    const text = response.content[0].type === "text" ? response.content[0].text : ""
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

    if (accountId) await prisma.account.update({ where: { id: accountId }, data: { lastActivity: new Date() } })
    if (prospectId) await prisma.prospect.update({ where: { id: prospectId }, data: { lastActivity: new Date() } })
  } catch (error) {
    console.error("Error processing transcript:", error)
  }
}
