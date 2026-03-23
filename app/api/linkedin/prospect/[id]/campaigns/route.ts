import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string, context?: any) => {
  const { id: prospectId } = context?.params || {}

  // Verify prospect belongs to user
  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, userId },
  })
  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
  }

  const campaignProspects = await prisma.linkedInCampaignProspect.findMany({
    where: { prospectId, userId },
    orderBy: { createdAt: "desc" },
    include: {
      campaign: { select: { name: true } },
    },
  })

  const entries = campaignProspects.map(cp => ({
    id: cp.id,
    campaignName: cp.campaign.name,
    status: cp.status,
    inviteSentAt: cp.inviteSentAt,
    acceptedAt: cp.acceptedAt,
    messageSentAt: cp.messageSentAt,
    repliedAt: cp.repliedAt,
  }))

  return NextResponse.json({ entries })
})
