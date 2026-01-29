import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// GET /api/calls/[id]/recording - Proxy Twilio recording with auth
export const GET = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    // Get call record
    const call = await prisma.call.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    if (!call.recordingUrl) {
      return NextResponse.json({ error: "No recording available" }, { status: 404 })
    }

    // Fetch recording from Twilio with authentication
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN

    if (!twilioAccountSid || !twilioAuthToken) {
      return NextResponse.json({ error: "Twilio credentials not configured" }, { status: 500 })
    }

    // Create Basic Auth header
    const authHeader = `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`

    // Fetch the recording from Twilio
    const response = await fetch(call.recordingUrl, {
      headers: {
        Authorization: authHeader,
      },
    })

    if (!response.ok) {
      console.error("Failed to fetch recording from Twilio:", response.status)
      return NextResponse.json({ error: "Failed to fetch recording" }, { status: response.status })
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer()

    // Return the audio with proper headers
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error: any) {
    console.error("Error serving recording:", error)
    return NextResponse.json(
      { error: "Failed to serve recording" },
      { status: 500 }
    )
  }
})
