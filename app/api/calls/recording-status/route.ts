import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { submitTranscription } from "@/lib/assemblyai/transcribe"

export const dynamic = 'force-dynamic'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN

// POST /api/calls/recording-status - Webhook from Twilio when recording is complete
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const url = new URL(request.url)

    const callSid = formData.get('CallSid') as string
    const recordingSid = formData.get('RecordingSid') as string
    const recordingUrl = formData.get('RecordingUrl') as string
    const recordingDuration = formData.get('RecordingDuration') as string
    const callId = url.searchParams.get('callId') // Get callId from query param

    console.log('Recording status callback:', {
      callSid,
      recordingSid,
      recordingUrl,
      recordingDuration,
      callId,
    })

    if (!recordingSid || !recordingUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Find call by callId (if provided) or twilioSid
    let call = null

    if (callId) {
      call = await prisma.call.findUnique({
        where: { id: callId },
      })
    } else if (callSid) {
      call = await prisma.call.findUnique({
        where: { twilioSid: callSid },
      })
    }

    if (!call) {
      console.error('Call not found for callId/SID:', callId || callSid)
      return NextResponse.json(
        { error: "Call not found" },
        { status: 404 }
      )
    }

    const fullRecordingUrl = `${recordingUrl}.mp3`

    // Update call with recording information
    await prisma.call.update({
      where: { id: call.id },
      data: {
        twilioSid: callSid || call.twilioSid, // Save twilioSid if we have it
        recordingSid,
        recordingUrl: fullRecordingUrl,
        recordingDuration: parseInt(recordingDuration) || 0,
      },
    })

    console.log('Call updated with recording info:', call.id)

    // Auto-transcribe the recording using AssemblyAI
    // Pass Twilio credentials so the function can fetch and upload the audio
    try {
      const { id: transcriptId, error: transcriptError } = await submitTranscription(
        fullRecordingUrl,
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN
      )

      if (transcriptId && !transcriptError) {
        // Store the transcript ID for polling
        const existingMetadata = (call.metadata as Record<string, unknown>) || {}

        await prisma.call.update({
          where: { id: call.id },
          data: {
            transcriptionStatus: "queued",
            metadata: {
              ...existingMetadata,
              assemblyaiTranscriptId: transcriptId,
              transcriptionStartedAt: new Date().toISOString(),
            },
          },
        })

        console.log('Auto-transcription started for call:', call.id, 'transcriptId:', transcriptId)
      } else {
        console.error('Failed to start auto-transcription:', transcriptError)
      }
    } catch (transcriptError) {
      // Don't fail the webhook if transcription fails
      console.error('Error starting auto-transcription:', transcriptError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in recording status callback:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
