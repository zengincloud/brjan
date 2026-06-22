import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

type Params = { params: { id: string } }

export const GET = withAuth(async (_req: NextRequest, userId: string, { params }: Params) => {
  const account = await prisma.account.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  })
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Get prospect IDs linked to this account so we catch meetings linked by prospectId too
  const prospects = await prisma.prospect.findMany({
    where: { userId, accountId: params.id },
    select: { id: true },
  })
  const prospectIds = prospects.map((p) => p.id)

  const meetings = await prisma.meeting.findMany({
    where: {
      userId,
      recallBotId: { not: null },
      OR: [
        { accountId: params.id },
        ...(prospectIds.length > 0 ? [{ prospectId: { in: prospectIds } }] : []),
      ],
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true, title: true, startedAt: true, endedAt: true, duration: true,
      summary: true, actionItems: true, attendees: true, meetingUrl: true,
      prospectId: true, accountId: true,
      prospect: { select: { id: true, name: true } },
      account: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(meetings)
})
