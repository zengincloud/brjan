import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import { searchLinkedIn } from "@/lib/unipile"

export const POST = withAuth(async (request: NextRequest, userId: string, context?: any) => {
  const { id } = context?.params || {}
  const body = await request.json()
  const { page = 0 } = body

  const campaign = await prisma.linkedInCampaign.findFirst({
    where: { id, userId },
  })
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { unipileAccountId: true },
  })
  if (!user?.unipileAccountId) {
    return NextResponse.json({ error: "LinkedIn not connected" }, { status: 400 })
  }

  const filters = campaign.searchFilters as any
  const results = await searchLinkedIn(user.unipileAccountId, filters, page)

  return NextResponse.json({ results })
})
