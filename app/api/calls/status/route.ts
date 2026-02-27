import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// POST /api/calls/status - Handle Twilio call status callbacks
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const callIdParam = url.searchParams.get("callId")

    const formData = await request.formData()
    const callSid = formData.get("CallSid") as string
    const callStatus = formData.get("CallStatus") as string
    const duration = formData.get("CallDuration") as string

    console.log(`Call status update: ${callSid} - ${callStatus}${callIdParam ? ` (callId: ${callIdParam})` : ""}`)

    if (!callSid && !callIdParam) {
      return NextResponse.json({ error: "Missing CallSid" }, { status: 400 })
    }

    // Find call by our callId (from query param) or by Twilio SID
    let call = callIdParam
      ? await prisma.call.findUnique({ where: { id: callIdParam } })
      : null

    if (!call && callSid) {
      call = await prisma.call.findUnique({ where: { twilioSid: callSid } })
    }

    if (!call) {
      console.warn(`Call not found for SID: ${callSid}, callId: ${callIdParam}`)
      return NextResponse.json({ received: true })
    }

    // Map Twilio status to our status
    let mappedStatus: any = callStatus.toLowerCase().replace("-", "_")
    // "answered" from child leg status callback means the prospect picked up
    if (mappedStatus === "answered") mappedStatus = "in_progress"

    // Update call record
    const updateData: any = {
      status: mappedStatus,
      updatedAt: new Date(),
    }

    if (callStatus === "completed" || callStatus === "no-answer" || callStatus === "busy" || callStatus === "failed") {
      updateData.endedAt = new Date()

      if (duration) {
        updateData.duration = parseInt(duration, 10)
      }
    }

    if (callStatus === "in-progress") {
      updateData.startedAt = new Date()
    }

    await prisma.call.update({
      where: { id: call.id },
      data: updateData,
    })

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Error processing call status:", error)
    return NextResponse.json(
      { error: "Failed to process status update" },
      { status: 500 }
    )
  }
}
