import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { getAuthUrl } from "@/lib/gcal/oauth"
import crypto from "crypto"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    if (!process.env.GOOGLE_GCAL_CLIENT_ID || !process.env.GOOGLE_GCAL_CLIENT_SECRET) {
      return NextResponse.json({ error: "GCal OAuth not configured" }, { status: 500 })
    }

    const nonce = crypto.randomBytes(32).toString("hex")
    const stateData = JSON.stringify({ userId, nonce })
    const encodedState = Buffer.from(stateData).toString("base64url")

    const authUrl = getAuthUrl(encodedState)

    const response = NextResponse.json({ authUrl })
    response.cookies.set("gcal_oauth_state", encodedState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
    })

    return response
  } catch (error: any) {
    console.error("GCal connect error:", error)
    return NextResponse.json({ error: "Failed to initiate GCal connection" }, { status: 500 })
  }
})
