import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import {
  submitTranscription,
  getTranscriptionStatus,
  formatTranscript,
  analyzeTranscript,
  calculateOverallSentiment
} from "@/lib/assemblyai/transcribe"

export const dynamic = 'force-dynamic'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN

// POST /api/calls/[id]/transcribe - Start transcription for a call recording
export const POST = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!

  try {
    // Get the call with recording URL
    const call = await prisma.call.findUnique({
      where: {
        id: params.id,
        userId,
      },
      include: {
        prospect: true,
      },
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    if (!call.recordingUrl) {
      return NextResponse.json(
        { error: "No recording available for this call" },
        { status: 400 }
      )
    }

    // Check if already transcribing or completed
    if (call.transcriptionStatus === "processing" || call.transcriptionStatus === "queued") {
      return NextResponse.json(
        { error: "Transcription already in progress", status: call.transcriptionStatus },
        { status: 400 }
      )
    }

    // Submit to AssemblyAI - pass Twilio credentials so it can fetch and upload the audio
    console.log('Manual transcription request with credentials:', {
      hasTwilioSid: !!TWILIO_ACCOUNT_SID,
      hasTwilioToken: !!TWILIO_AUTH_TOKEN,
      recordingUrl: call.recordingUrl.substring(0, 50) + '...',
    })

    const { id: transcriptId, error } = await submitTranscription(
      call.recordingUrl,
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN
    )

    if (error || !transcriptId) {
      console.error("Failed to submit transcription:", error)
      return NextResponse.json(
        { error: error || "Failed to submit transcription" },
        { status: 500 }
      )
    }

    // Store the transcript ID in metadata for polling
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

    return NextResponse.json({
      success: true,
      transcriptId,
      status: "queued",
      message: "Transcription started. Poll /api/calls/[id]/transcribe to check status.",
    })
  } catch (error: any) {
    console.error("Error starting transcription:", error)
    return NextResponse.json(
      { error: "Failed to start transcription" },
      { status: 500 }
    )
  }
})

// GET /api/calls/[id]/transcribe - Check transcription status and get result
export const GET = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!

  try {
    const call = await prisma.call.findUnique({
      where: {
        id: params.id,
        userId,
      },
      include: {
        prospect: true,
      },
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    // If already completed, return the stored transcription
    if (call.transcriptionStatus === "completed" && call.transcription) {
      // Try to parse stored formatted transcript
      try {
        const storedTranscript = JSON.parse(call.transcription)
        return NextResponse.json({
          status: "completed",
          transcript: storedTranscript,
        })
      } catch {
        // If plain text, return as-is
        return NextResponse.json({
          status: "completed",
          transcript: {
            fullText: call.transcription,
            segments: [],
            duration: call.duration || 0,
          },
        })
      }
    }

    // Check if we have a pending transcription
    const metadata = (call.metadata as Record<string, unknown>) || {}
    const transcriptId = metadata.assemblyaiTranscriptId as string

    if (!transcriptId) {
      return NextResponse.json({
        status: "none",
        message: "No transcription requested for this call",
      })
    }

    // Poll AssemblyAI for status
    const result = await getTranscriptionStatus(transcriptId)

    if (result.status === "error") {
      await prisma.call.update({
        where: { id: call.id },
        data: {
          transcriptionStatus: "failed",
          metadata: {
            ...metadata,
            transcriptionError: result.error,
          },
        },
      })

      return NextResponse.json({
        status: "error",
        error: result.error,
      })
    }

    if (result.status === "completed") {
      // Log debug info for speaker diarization
      console.log("Transcription completed:", {
        hasText: !!result.text,
        textLength: result.text?.length,
        hasUtterances: !!result.utterances,
        utteranceCount: result.utterances?.length || 0,
        hasWords: !!result.words,
        wordCount: result.words?.length || 0,
        hasSentiment: !!result.sentiment_analysis_results,
      })

      // Format the transcript with speaker labels
      const prospectName = call.prospect?.name || "Prospect"
      let formattedTranscript = formatTranscript(result, "You", prospectName)

      // Fallback if formatTranscript returns null but we have text
      if (!formattedTranscript && result.text) {
        formattedTranscript = {
          fullText: result.text,
          segments: [],
          duration: result.audio_duration || 0,
        }
      }

      // Calculate sentiment from AssemblyAI's sentiment analysis
      const sentimentData = calculateOverallSentiment(result.sentiment_analysis_results)

      // Get AI analysis using LeMUR
      const aiAnalysis = await analyzeTranscript(transcriptId)

      // Merge sentiment and AI analysis
      if (formattedTranscript) {
        formattedTranscript.analysis = aiAnalysis || {
          sentiment: sentimentData.sentiment,
          sentimentScore: sentimentData.score,
          outcome: "unknown",
          summary: "",
          keyPoints: [],
          nextSteps: null,
        }

        // Update sentiment score from actual sentiment analysis if AI didn't provide it
        if (formattedTranscript.analysis && !aiAnalysis) {
          formattedTranscript.analysis.sentimentScore = sentimentData.score
        }
      }

      // Store the formatted transcript with analysis
      await prisma.call.update({
        where: { id: call.id },
        data: {
          transcription: JSON.stringify(formattedTranscript),
          transcriptionStatus: "completed",
          metadata: {
            ...metadata,
            transcriptionCompletedAt: new Date().toISOString(),
            speakerDiarizationAvailable: (formattedTranscript?.segments?.length || 0) > 0,
          },
        },
      })

      return NextResponse.json({
        status: "completed",
        transcript: formattedTranscript,
      })
    }

    // Still processing
    await prisma.call.update({
      where: { id: call.id },
      data: {
        transcriptionStatus: result.status,
      },
    })

    return NextResponse.json({
      status: result.status,
      message: "Transcription in progress...",
    })
  } catch (error: any) {
    console.error("Error checking transcription status:", error)
    return NextResponse.json(
      { error: "Failed to check transcription status" },
      { status: 500 }
    )
  }
})
