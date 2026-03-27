import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import { searchLinkedIn } from "@/lib/unipile"

export const dynamic = 'force-dynamic'

// POST /api/linkedin/search - Search LinkedIn Sales Navigator
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { unipileAccountId: true },
    })
    const accountId = user?.unipileAccountId?.trim()
    if (!accountId) {
      return NextResponse.json({ error: "LinkedIn not connected. Please connect your LinkedIn account first." }, { status: 400 })
    }

    const { filters, page = 0 } = await request.json()
    console.log("[LinkedIn Search API] filters:", JSON.stringify(filters), "page:", page, "accountId:", accountId, "accountIdLength:", accountId.length)

    let results
    try {
      results = await searchLinkedIn(accountId, filters || {}, page)
    } catch (err: any) {
      // If Sales Navigator fails, retry with classic LinkedIn
      console.warn("[LinkedIn Search API] Sales Nav search failed, trying classic:", err.message)
      const { searchLinkedInClassic } = await import("@/lib/unipile")
      results = await searchLinkedInClassic(accountId, filters || {}, page)
    }

    console.log("[LinkedIn Search API] results count:", results?.items?.length || 0)
    return NextResponse.json({ results })
  } catch (error: any) {
    console.error("LinkedIn search error:", error)
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    )
  }
})
