import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import {
  submitTranscription,
  getTranscriptionStatus,
  formatTranscript
} from "@/lib/assemblyai/transcribe"

export const dynamic = 'force-dynamic'

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

    // Submit to AssemblyAI
    const { id: transcriptId, error } = await submitTranscription(call.recordingUrl)

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
      // Format the transcript with speaker labels
      const prospectName = call.prospect?.name || "Prospect"
      const formattedTranscript = formatTranscript(result, "You", prospectName)

      // Store the formatted transcript
      await prisma.call.update({
        where: { id: call.id },
        data: {
          transcription: JSON.stringify(formattedTranscript),
          transcriptionStatus: "completed",
          metadata: {
            ...metadata,
            transcriptionCompletedAt: new Date().toISOString(),
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
