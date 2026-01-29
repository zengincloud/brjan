import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// POST /api/calls/recording-status - Webhook from Twilio when recording is complete
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const callSid = formData.get('CallSid') as string
    const recordingSid = formData.get('RecordingSid') as string
    const recordingUrl = formData.get('RecordingUrl') as string
    const recordingDuration = formData.get('RecordingDuration') as string

    console.log('Recording status callback:', {
      callSid,
      recordingSid,
      recordingUrl,
      recordingDuration,
    })

    if (!callSid || !recordingSid || !recordingUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Find call by Twilio SID and update with recording info
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

    // Update call with recording information
    await prisma.call.update({
      where: { id: call.id },
      data: {
        recordingSid,
        recordingUrl: `${recordingUrl}.mp3`, // Add .mp3 extension for audio format
        recordingDuration: parseInt(recordingDuration) || 0,
      },
    })

    console.log('Call updated with recording info:', call.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in recording status callback:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
