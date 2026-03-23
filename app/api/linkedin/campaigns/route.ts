import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  const campaigns = await prisma.linkedInCampaign.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { prospects: true } },
      prospects: {
        select: { status: true },
      },
    },
  })

  const result = campaigns.map(c => ({
    id: c.id,
    name: c.name,
    status: c.status,
    searchFilters: c.searchFilters,
    inviteMessage: c.inviteMessage,
    followUpMessage: c.followUpMessage,
    followUpDelayDays: c.followUpDelayDays,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    totalProspects: c._count.prospects,
    invited: c.prospects.filter(p => p.status === "invited" || p.status === "accepted" || p.status === "messaged" || p.status === "replied").length,
    accepted: c.prospects.filter(p => p.status === "accepted" || p.status === "messaged" || p.status === "replied").length,
    messaged: c.prospects.filter(p => p.status === "messaged" || p.status === "replied").length,
    replied: c.prospects.filter(p => p.status === "replied").length,
  }))

  return NextResponse.json({ campaigns: result })
})

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  const body = await request.json()
  const { name, searchFilters, inviteMessage, followUpMessage, followUpDelayDays } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "Campaign name required" }, { status: 400 })
  }

  const campaign = await prisma.linkedInCampaign.create({
    data: {
      userId,
      name: name.trim(),
      searchFilters: searchFilters || {},
      inviteMessage: inviteMessage || null,
      followUpMessage: followUpMessage || null,
      followUpDelayDays: followUpDelayDays ?? 1,
    },
  })

  return NextResponse.json({ campaign })
})
