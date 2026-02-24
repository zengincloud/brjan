import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { deleteHubspotIntegration } from "@/lib/hubspot/oauth"

export const dynamic = "force-dynamic"

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const result = await deleteHubspotIntegration(userId)

    if (!result) {
      return NextResponse.json({ error: "HubSpot not connected" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("HubSpot disconnect error:", error)
    return NextResponse.json(
      { error: "Failed to disconnect HubSpot" },
      { status: 500 }
    )
  }
})
