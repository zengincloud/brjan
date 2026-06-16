import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import {
  verifyWebhookSignature,
  getBotTranscript,
  getBot,
  transcriptToText,
} from "@/lib/recall/client"

export const dynamic = "force-dynamic"

// POST /api/webhooks/meetings/recall - Recall.ai webhook handler
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

  if (!botId) {
    return NextResponse.json({ received: true })
  }

  // bot.done fires when the bot has shut down and transcript/recording are available
  if (event === "bot.done") {
    await processMeetingEnd(botId)
  }

  return NextResponse.json({ received: true })
}

async function processMeetingEnd(botId: string) {
  const meeting = await prisma.meeting.findUnique({ where: { recallBotId: botId } })
  if (!meeting) {
    console.warn(`Recall webhook: no meeting found for bot ${botId}`)
    return
  }

  try {
    // Fetch transcript
    const transcriptEntries = await getBotTranscript(botId)
    const transcriptText = transcriptToText(transcriptEntries)

    // Fetch bot metadata for timing
    const bot = await getBot(botId)
    const statusChanges = bot.status_changes || []
    const startEntry = statusChanges.find((s) => s.code === "in_call_recording" || s.code === "in_call_not_recording")
    const endEntry = statusChanges.find((s) => s.code === "done" || s.code === "call_ended")

    const startedAt = startEntry ? new Date(startEntry.created_at) : meeting.startedAt
    const endedAt = endEntry ? new Date(endEntry.created_at) : new Date()
    const duration =
      startedAt && endedAt ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000) : null

    // Store raw transcript immediately so it's available even if Claude fails
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        transcript: transcriptEntries as any,
        startedAt,
        endedAt,
        duration,
        title: bot.meeting_metadata?.title || meeting.title,
      },
    })

    if (!transcriptText.trim()) {
      return
    }

    // Generate summary + action items with Claude
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
      data: {
        summary: parsed.summary,
        actionItems: parsed.actionItems,
        prospectId,
        accountId,
      },
    })

    // Bump lastActivity on account/prospect
    if (accountId) {
      await prisma.account.update({ where: { id: accountId }, data: { lastActivity: new Date() } })
    }
    if (prospectId) {
      await prisma.prospect.update({
        where: { id: prospectId },
        data: { lastActivity: new Date() },
      })
    }
  } catch (error) {
    console.error("Error processing meeting end:", error)
  }
}
