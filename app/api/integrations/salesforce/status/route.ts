import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { getSalesforceIntegration, getValidAccessToken } from "@/lib/salesforce/oauth"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const integration = await getSalesforceIntegration(userId)

    if (!integration) {
      return NextResponse.json({ connected: false, integration: null })
    }

    let tokenValid = integration.tokenExpiresAt > new Date()

    if (!tokenValid && integration.isActive) {
      const result = await getValidAccessToken(userId)
      tokenValid = !!result
    }

    const updatedIntegration = await getSalesforceIntegration(userId)

    return NextResponse.json({
      connected: !!updatedIntegration?.isActive,
      integration: updatedIntegration
        ? {
            orgId: updatedIntegration.orgId,
            instanceUrl: updatedIntegration.instanceUrl,
            isActive: updatedIntegration.isActive,
            connectedAt: updatedIntegration.createdAt,
            tokenValid: updatedIntegration.isActive && tokenValid,
          }
        : null,
    })
  } catch (error: any) {
    console.error("Salesforce status error:", error)
    return NextResponse.json(
      { error: "Failed to get Salesforce status" },
      { status: 500 }
    )
  }
})
