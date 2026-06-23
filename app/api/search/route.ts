import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  const q = request.nextUrl.searchParams.get("q")?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ prospects: [], accounts: [], calls: [] })
  }

  const [prospectsResult, accountsResult, callsResult] = await Promise.allSettled([
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
      select: { id: true, name: true, email: true, company: true, title: true, phone: true },
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
      select: { id: true, name: true, industry: true, location: true, website: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.call.findMany({
      where: {
        userId,
        recordingUrl: { not: null },
        OR: [
          { prospect: { name: { contains: q, mode: "insensitive" } } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        outcome: true,
        duration: true,
        recordingDuration: true,
        createdAt: true,
        prospect: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ])

  return NextResponse.json({
    prospects: prospectsResult.status === "fulfilled" ? prospectsResult.value : [],
    accounts: accountsResult.status === "fulfilled" ? accountsResult.value : [],
    calls: callsResult.status === "fulfilled" ? callsResult.value : [],
  })
})
