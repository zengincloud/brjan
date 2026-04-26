import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { deleteSalesforceIntegration } from "@/lib/salesforce/oauth"

export const dynamic = "force-dynamic"

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const result = await deleteSalesforceIntegration(userId)

    if (!result) {
      return NextResponse.json({ error: "Salesforce not connected" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Salesforce disconnect error:", error)
    return NextResponse.json(
      { error: "Failed to disconnect Salesforce" },
      { status: 500 }
    )
  }
})
