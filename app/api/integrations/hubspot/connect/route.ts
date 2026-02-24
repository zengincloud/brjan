import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { getAuthUrl } from "@/lib/hubspot/oauth"
import crypto from "crypto"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    if (
      !process.env.HUBSPOT_CLIENT_ID ||
      !process.env.HUBSPOT_CLIENT_SECRET
    ) {
      return NextResponse.json(
        { error: "HubSpot OAuth not configured" },
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
    response.cookies.set("hubspot_oauth_state", encodedState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    })

    return response
  } catch (error: any) {
    console.error("HubSpot connect error:", error)
    return NextResponse.json(
      { error: "Failed to initiate HubSpot connection" },
      { status: 500 }
    )
  }
})
