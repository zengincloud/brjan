import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { getGmailIntegration } from "@/lib/gmail/oauth"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const integration = await getGmailIntegration(userId)

    return NextResponse.json({
      connected: !!integration,
      integration: integration
        ? {
            email: integration.gmailEmail,
            isActive: integration.isActive,
            connectedAt: integration.createdAt,
            tokenValid: integration.tokenExpiresAt > new Date(),
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
