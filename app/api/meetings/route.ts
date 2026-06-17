import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET /api/meetings — list all recorded meetings for the user
export const GET = withAuth(async (_req: NextRequest, userId: string) => {
  const meetings = await prisma.meeting.findMany({
    where: { userId, recallBotId: { not: null } },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      title: true,
      startedAt: true,
      endedAt: true,
      duration: true,
      summary: true,
      actionItems: true,
      attendees: true,
      meetingUrl: true,
      prospectId: true,
      accountId: true,
      prospect: { select: { id: true, name: true, email: true } },
      account: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(meetings)
})
