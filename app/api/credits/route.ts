import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { getCreditStatus } from "@/lib/credits"

export const dynamic = "force-dynamic"

// GET /api/credits - Get current user's credit status
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const status = await getCreditStatus(userId)
    return NextResponse.json(status)
  } catch (error) {
    console.error("Error fetching credit status:", error)
    return NextResponse.json({ error: "Failed to fetch credit status" }, { status: 500 })
  }
})
