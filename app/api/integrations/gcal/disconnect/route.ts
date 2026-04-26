import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { deleteGcalIntegration } from "@/lib/gcal/oauth"

export const dynamic = "force-dynamic"

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const result = await deleteGcalIntegration(userId)
    if (!result) {
      return NextResponse.json({ error: "GCal not connected" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("GCal disconnect error:", error)
    return NextResponse.json({ error: "Failed to disconnect GCal" }, { status: 500 })
  }
})
