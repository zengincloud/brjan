import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { getHubspotIntegration, getValidAccessToken } from "@/lib/hubspot/oauth"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const integration = await getHubspotIntegration(userId)

    if (!integration) {
      return NextResponse.json({
        connected: false,
        integration: null,
      })
    }

    // Check if token is expired and try to refresh it
    let tokenValid = integration.tokenExpiresAt > new Date()

    if (!tokenValid && integration.isActive) {
      const newToken = await getValidAccessToken(userId)
      tokenValid = !!newToken
    }

    // Re-fetch integration in case it was updated during refresh
    const updatedIntegration = await getHubspotIntegration(userId)

    return NextResponse.json({
      connected: !!updatedIntegration?.isActive,
      integration: updatedIntegration
        ? {
            portalId: updatedIntegration.portalId,
            isActive: updatedIntegration.isActive,
            connectedAt: updatedIntegration.createdAt,
            tokenValid: updatedIntegration.isActive && tokenValid,
          }
        : null,
    })
  } catch (error: any) {
    console.error("HubSpot status error:", error)
    return NextResponse.json(
      { error: "Failed to get HubSpot status" },
      { status: 500 }
    )
  }
})
