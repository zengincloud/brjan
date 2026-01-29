import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// POST /api/calls/transcription-status - Webhook from Twilio when transcription is complete
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const callSid = formData.get('CallSid') as string
    const transcriptionText = formData.get('TranscriptionText') as string
    const transcriptionStatus = formData.get('TranscriptionStatus') as string

    console.log('Transcription status callback:', {
      callSid,
      transcriptionStatus,
      transcriptionLength: transcriptionText?.length || 0,
    })

    if (!callSid) {
      return NextResponse.json(
        { error: "Missing CallSid" },
        { status: 400 }
      )
    }

    // Find call by Twilio SID
    const call = await prisma.call.findUnique({
      where: { twilioSid: callSid },
    })

    if (!call) {
      console.error('Call not found for SID:', callSid)
      return NextResponse.json(
        { error: "Call not found" },
        { status: 404 }
      )
    }

    // Update call with transcription
    await prisma.call.update({
      where: { id: call.id },
      data: {
        transcription: transcriptionText || null,
        transcriptionStatus: transcriptionStatus || 'completed',
      },
    })

    console.log('Call updated with transcription:', call.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in transcription status callback:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
