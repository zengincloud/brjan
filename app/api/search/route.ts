import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/search?q=... — Global search across prospects and accounts
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim()
    if (!q || q.length < 2) {
      return NextResponse.json({ prospects: [], accounts: [] })
    }

    const [prospects, accounts] = await Promise.all([
      prisma.prospect.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          title: true,
          phone: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.account.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { industry: { contains: q, mode: "insensitive" } },
            { website: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          industry: true,
          location: true,
          website: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ])

    return NextResponse.json({ prospects, accounts })
  } catch (error: any) {
    console.error("Global search error:", error)
    return NextResponse.json({ prospects: [], accounts: [] })
  }
})
