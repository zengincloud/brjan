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
    if (!user?.unipileAccountId) {
      return NextResponse.json({ error: "LinkedIn not connected" }, { status: 400 })
    }

    const { filters, page = 0 } = await request.json()
    const results = await searchLinkedIn(user.unipileAccountId, filters || {}, page)

    return NextResponse.json({ results })
  } catch (error: any) {
    console.error("LinkedIn search error:", error)
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    )
  }
})
