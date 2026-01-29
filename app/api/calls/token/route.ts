import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import twilio from "twilio"

export const dynamic = 'force-dynamic'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_API_KEY = process.env.TWILIO_API_KEY
const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET

// GET /api/calls/token - Generate Twilio access token for browser calling
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET) {
      return NextResponse.json(
        { error: "Twilio not configured properly" },
        { status: 500 }
      )
    }

    // Create an identity for this user (use userId as the identity)
    const identity = `user_${userId}`

    // Create an access token
    const AccessToken = twilio.jwt.AccessToken
    const VoiceGrant = AccessToken.VoiceGrant

    const token = new AccessToken(
      TWILIO_ACCOUNT_SID,
      TWILIO_API_KEY,
      TWILIO_API_SECRET,
      { identity }
    )

    // Create a Voice grant for this token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true, // Allow incoming calls
    })

    token.addGrant(voiceGrant)

    return NextResponse.json({
      identity,
      token: token.toJwt(),
    })
  } catch (error: any) {
    console.error("Error generating token:", error)
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    )
  }
})
