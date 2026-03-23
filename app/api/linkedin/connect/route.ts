import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { createHostedAuth } from "@/lib/unipile"

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

    const data = await createHostedAuth(
      `${siteUrl}/api/linkedin/connect/callback`,
      `${siteUrl}/linkedin?error=connection_failed`
    )

    return NextResponse.json({ url: data.url })
  } catch (error: any) {
    console.error("Error creating Unipile hosted auth:", error)
    return NextResponse.json({ error: error.message || "Failed to initiate LinkedIn connection" }, { status: 500 })
  }
})
