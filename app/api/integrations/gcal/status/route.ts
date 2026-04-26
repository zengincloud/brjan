import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { getGcalIntegration, refreshAccessToken } from "@/lib/gcal/oauth"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const integration = await getGcalIntegration(userId)

    if (!integration) {
      return NextResponse.json({ connected: false, integration: null })
    }

    let tokenValid = integration.tokenExpiresAt > new Date()

    if (!tokenValid && integration.isActive) {
      const newToken = await refreshAccessToken(userId)
      tokenValid = !!newToken
    }

    const updated = await getGcalIntegration(userId)

    return NextResponse.json({
      connected: !!updated,
      integration: updated
        ? {
            email: updated.calendarEmail,
            isActive: updated.isActive,
            connectedAt: updated.createdAt,
            tokenValid: updated.isActive && tokenValid,
          }
        : null,
    })
  } catch (error: any) {
    console.error("GCal status error:", error)
    return NextResponse.json({ error: "Failed to get GCal status" }, { status: 500 })
  }
})
