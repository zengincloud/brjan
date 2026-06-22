import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET /api/meetings — list all recorded meetings for the user
// Supports ?prospectId=xxx and ?accountId=xxx filters
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  const { searchParams } = new URL(req.url)
  const prospectId = searchParams.get("prospectId") || undefined
  const accountId = searchParams.get("accountId") || undefined

  const meetings = await prisma.meeting.findMany({
    where: { userId, recallBotId: { not: null }, ...(prospectId ? { prospectId } : {}), ...(accountId ? { accountId } : {}) },
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
      recordingUrl: true,
      prospectId: true,
      accountId: true,
      prospect: { select: { id: true, name: true, email: true } },
      account: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(meetings)
})
