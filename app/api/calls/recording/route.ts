import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// POST /api/calls/recording - Handle Twilio recording callbacks
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const callSid = formData.get("CallSid") as string
    const recordingUrl = formData.get("RecordingUrl") as string
    const recordingStatus = formData.get("RecordingStatus") as string

    console.log(`Recording status update: ${callSid} - ${recordingStatus}`)

    if (!callSid || !recordingUrl) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 })
    }

    // Find call by Twilio SID
    const call = await prisma.call.findUnique({
      where: { twilioSid: callSid },
    })

    if (!call) {
      console.warn(`Call not found for recording SID: ${callSid}`)
      return NextResponse.json({ received: true })
    }

    // Update call record with recording URL
    if (recordingStatus === "completed") {
      await prisma.call.update({
        where: { id: call.id },
        data: {
          recordingUrl,
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Error processing recording callback:", error)
    return NextResponse.json(
      { error: "Failed to process recording" },
      { status: 500 }
    )
  }
}
