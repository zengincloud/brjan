import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { getAuthUrl } from "@/lib/salesforce/oauth"
import crypto from "crypto"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    if (
      !process.env.SALESFORCE_CLIENT_ID ||
      !process.env.SALESFORCE_CLIENT_SECRET
    ) {
      return NextResponse.json(
        { error: "Salesforce OAuth not configured" },
        { status: 500 }
      )
    }

    const nonce = crypto.randomBytes(32).toString("hex")
    const stateData = JSON.stringify({ userId, nonce })
    const encodedState = Buffer.from(stateData).toString("base64url")

    // PKCE
    const codeVerifier = crypto.randomBytes(32).toString("base64url")
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url")

    const authUrl = getAuthUrl(encodedState, codeChallenge)

    const response = NextResponse.json({ authUrl })
    response.cookies.set("salesforce_oauth_state", encodedState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
    })
    response.cookies.set("salesforce_pkce_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
    })

    return response
  } catch (error: any) {
    console.error("Salesforce connect error:", error)
    return NextResponse.json(
      { error: "Failed to initiate Salesforce connection" },
      { status: 500 }
    )
  }
})
