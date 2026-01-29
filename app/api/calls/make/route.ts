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

    // Create call record in database (browser client will make the actual call)
    const callRecord = await prisma.call.create({
      data: {
        from: TWILIO_PHONE_NUMBER || "Browser Client",
        to: formattedTo,
        prospectId,
        accountId,
        status: "queued",
        metadata,
        userId,
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
      twilioSid: null, // Will be updated by status callback from Twilio
      status: "queued",
    })
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
