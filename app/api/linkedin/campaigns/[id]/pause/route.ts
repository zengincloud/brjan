import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const PATCH = withAuth(async (request: NextRequest, userId: string, context?: any) => {
  const { id } = context?.params || {}

  const campaign = await prisma.linkedInCampaign.findFirst({
    where: { id, userId },
  })
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  const updated = await prisma.linkedInCampaign.update({
    where: { id },
    data: { status: "paused" },
  })

  return NextResponse.json({ campaign: updated })
})
