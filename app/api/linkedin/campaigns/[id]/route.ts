import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string, context?: any) => {
  const { id } = context?.params || {}

  const campaign = await prisma.linkedInCampaign.findFirst({
    where: { id, userId },
    include: {
      _count: { select: { prospects: true } },
      prospects: {
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  return NextResponse.json({ campaign })
})

export const PATCH = withAuth(async (request: NextRequest, userId: string, context?: any) => {
  const { id } = context?.params || {}
  const body = await request.json()
  const { name, searchFilters, inviteMessage, followUpMessage, followUpDelayDays, status } = body

  const campaign = await prisma.linkedInCampaign.findFirst({
    where: { id, userId },
  })
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  const updated = await prisma.linkedInCampaign.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(searchFilters !== undefined && { searchFilters }),
      ...(inviteMessage !== undefined && { inviteMessage }),
      ...(followUpMessage !== undefined && { followUpMessage }),
      ...(followUpDelayDays !== undefined && { followUpDelayDays }),
      ...(status !== undefined && { status }),
    },
  })

  return NextResponse.json({ campaign: updated })
})

export const DELETE = withAuth(async (request: NextRequest, userId: string, context?: any) => {
  const { id } = context?.params || {}

  const campaign = await prisma.linkedInCampaign.findFirst({
    where: { id, userId },
  })
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  await prisma.linkedInCampaign.delete({ where: { id } })

  return NextResponse.json({ success: true })
})
