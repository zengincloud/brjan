import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { deleteGmailIntegration } from "@/lib/gmail/oauth"

export const dynamic = "force-dynamic"

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const result = await deleteGmailIntegration(userId)

    if (!result) {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Gmail disconnect error:", error)
    return NextResponse.json(
      { error: "Failed to disconnect Gmail" },
      { status: 500 }
    )
  }
})
