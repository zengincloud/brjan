import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { getAuthUrl } from "@/lib/gmail/oauth"
import crypto from "crypto"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    // Check if Gmail OAuth is configured
    if (
      !process.env.GOOGLE_GMAIL_CLIENT_ID ||
      !process.env.GOOGLE_GMAIL_CLIENT_SECRET
    ) {
      return NextResponse.json(
        { error: "Gmail OAuth not configured" },
        { status: 500 }
      )
    }

    // Generate a state token to prevent CSRF
    const nonce = crypto.randomBytes(32).toString("hex")
    const stateData = JSON.stringify({ userId, nonce })
    const encodedState = Buffer.from(stateData).toString("base64url")

    const authUrl = getAuthUrl(encodedState)

    // Set state cookie for verification in callback
    const response = NextResponse.json({ authUrl })
    response.cookies.set("gmail_oauth_state", encodedState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    })

    return response
  } catch (error: any) {
    console.error("Gmail connect error:", error)
    return NextResponse.json(
      { error: "Failed to initiate Gmail connection" },
      { status: 500 }
    )
  }
})
