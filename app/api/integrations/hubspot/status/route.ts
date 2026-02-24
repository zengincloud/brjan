import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { checkConnection, isConfigured } from "@/lib/hubspot/client"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    if (!isConfigured()) {
      return NextResponse.json({ connected: false, error: "HubSpot access token not configured" })
    }

    const status = await checkConnection()
    return NextResponse.json(status)
  } catch (error: any) {
    console.error("HubSpot status check failed:", error)
    return NextResponse.json({ connected: false, error: error.message })
  }
})
