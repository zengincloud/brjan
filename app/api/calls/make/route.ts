import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import twilio from "twilio"

export const dynamic = 'force-dynamic'

// Initialize Twilio client
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error("Twilio credentials not configured")
}

const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null

// POST /api/calls/make - Initiate a call via Twilio
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
      return NextResponse.json(
        { error: "Twilio not configured" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { to, prospectId, accountId, metadata } = body

    // Validation
    if (!to) {
      return NextResponse.json(
        { error: "Missing required field: to" },
        { status: 400 }
      )
    }

    // Format phone number to E.164 if needed
    const formattedTo = to.startsWith("+") ? to : `+1${to.replace(/\D/g, "")}`

    // Create call record in database
    const callRecord = await prisma.call.create({
      data: {
        from: TWILIO_PHONE_NUMBER,
        to: formattedTo,
        prospectId,
        accountId,
        status: "queued",
        metadata,
        userId,
      },
    })

    try {
      // Make call via Twilio
      const call = await twilioClient.calls.create({
        to: formattedTo,
        from: TWILIO_PHONE_NUMBER,
        // This URL will handle the call flow (TwiML)
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/calls/twiml`,
        statusCallback: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/calls/status`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        record: true, // Enable call recording
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/calls/recording`,
      })

      console.log("Twilio call initiated:", call.sid)

      // Update call record with Twilio SID
      await prisma.call.update({
        where: { id: callRecord.id },
        data: {
          twilioSid: call.sid,
          status: "ringing",
          startedAt: new Date(),
        },
      })

      // Update prospect's last activity if applicable
      if (prospectId) {
        await prisma.prospect.update({
          where: {
            id: prospectId,
            userId,
          },
          data: {
            lastActivity: new Date(),
            status: "contacted",
          },
        })
      }

      return NextResponse.json({
        success: true,
        callId: callRecord.id,
        twilioSid: call.sid,
        status: call.status,
      })
    } catch (twilioError: any) {
      console.error("Twilio call error:", twilioError)

      // Update call record with failure
      await prisma.call.update({
        where: { id: callRecord.id },
        data: {
          status: "failed",
          failureReason: twilioError.message || "Unknown error",
        },
      })

      return NextResponse.json(
        {
          error: "Failed to initiate call",
          details: twilioError.message,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("Error in call endpoint:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    )
  }
})
