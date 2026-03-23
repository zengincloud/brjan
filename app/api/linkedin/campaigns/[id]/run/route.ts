import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const POST = withAuth(async (request: NextRequest, userId: string, context?: any) => {
  const { id } = context?.params || {}
  const body = await request.json()
  const { prospects } = body // array of { linkedinProfileId, name, company?, title?, linkedinUrl? }

  const campaign = await prisma.linkedInCampaign.findFirst({
    where: { id, userId },
  })
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  // Upsert prospects into the campaign
  if (prospects?.length) {
    await prisma.$transaction(
      prospects.map((p: any) =>
        prisma.linkedInCampaignProspect.upsert({
          where: {
            campaignId_linkedinProfileId: {
              campaignId: id,
              linkedinProfileId: p.linkedinProfileId,
            },
          },
          create: {
            campaignId: id,
            userId,
            linkedinProfileId: p.linkedinProfileId,
            name: p.name,
            company: p.company || null,
            title: p.title || null,
            linkedinUrl: p.linkedinUrl || null,
            status: "pending",
          },
          update: {},
        })
      )
    )
  }

  // Activate the campaign
  const updated = await prisma.linkedInCampaign.update({
    where: { id },
    data: { status: "active" },
  })

  return NextResponse.json({ campaign: updated })
})
