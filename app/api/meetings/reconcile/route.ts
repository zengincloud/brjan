import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import {
  listBotRecordings,
  createAsyncTranscript,
} from "@/lib/recall/client"

export const dynamic = "force-dynamic"

// POST /api/meetings/reconcile
// Fetches recent bots from Recall, ensures Meeting DB records exist,
// and processes any transcripts that were missed by the webhook.
export const POST = withAuth(async (_req: NextRequest, userId: string) => {
  const results: { botId: string; action: string }[] = []

  // Only look at our own meetings that are missing a summary (last 7 days)
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const pendingMeetings = await prisma.meeting.findMany({
    where: { userId, recallBotId: { not: null }, summary: null, startedAt: { gte: since } },
    select: { id: true, userId: true, recallBotId: true },
  })

  console.log(`[reconcile] ${pendingMeetings.length} meetings without summaries`)

  for (const meeting of pendingMeetings) {
    const botId = meeting.recallBotId!

    // Find recordings for this specific bot
    let recordings: Awaited<ReturnType<typeof listBotRecordings>>
    try {
      recordings = await listBotRecordings(botId)
      console.log(`[reconcile] bot ${botId}: ${recordings.results.length} recordings`)
    } catch (err) {
      console.warn(`[reconcile] bot ${botId}: error listing recordings:`, err)
      results.push({ botId, action: "error:list_recordings" })
      continue
    }

    if (recordings.results.length === 0) {
      results.push({ botId, action: "no_recordings" })
      continue
    }

    // Re-kick transcription for the first recording — forces Recall/ElevenLabs to
    // re-process and fire transcript.done again (which our fixed webhook now handles)
    const recording = recordings.results[0]
    try {
      await createAsyncTranscript(recording.id)
      console.log(`[reconcile] bot ${botId}: kicked off transcription for recording ${recording.id}`)
      results.push({ botId, action: "started_transcription" })
    } catch (err: any) {
      const msg = String(err)
      console.warn(`[reconcile] bot ${botId}: transcript start error:`, msg)
      // A conflict/duplicate means one already exists — webhook will fire when done
      if (msg.includes("409") || msg.includes("already") || msg.includes("duplicate")) {
        results.push({ botId, action: "transcript_pending_webhook" })
      } else {
        results.push({ botId, action: "error:start_transcription" })
      }
    }

    // Small delay between bots to avoid rate limiting
    await new Promise((r) => setTimeout(r, 300))
  }

  return NextResponse.json({ reconciled: results.length, results })
})

