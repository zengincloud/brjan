import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { getGmailIntegration, refreshAccessToken } from "@/lib/gmail/oauth"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const integration = await getGmailIntegration(userId)

    if (!integration) {
      return NextResponse.json({
        connected: false,
        integration: null,
      })
    }

    // Check if token is expired and try to refresh it
    let tokenValid = integration.tokenExpiresAt > new Date()

    if (!tokenValid && integration.isActive) {
      // Try to refresh the token
      const newToken = await refreshAccessToken(userId)
      tokenValid = !!newToken
    }

    // Re-fetch integration in case it was updated during refresh
    const updatedIntegration = await getGmailIntegration(userId)

    return NextResponse.json({
      connected: !!updatedIntegration,
      integration: updatedIntegration
        ? {
            email: updatedIntegration.gmailEmail,
            isActive: updatedIntegration.isActive,
            connectedAt: updatedIntegration.createdAt,
            tokenValid: updatedIntegration.isActive && tokenValid,
          }
        : null,
    })
  } catch (error: any) {
    console.error("Gmail status error:", error)
    return NextResponse.json(
      { error: "Failed to get Gmail status" },
      { status: 500 }
    )
  }
})
