import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withSuperAdmin } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

export const GET = withSuperAdmin(async (_request: NextRequest) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [notableCalls, recentMeetings] = await Promise.all([
    prisma.call.findMany({
      where: {
        createdAt: { gte: oneDayAgo },
        outcome: {
          in: [
            "connected_intro_booked",
            "connected_referral",
            "connected",
            "connected_info_gathered",
            "connected_not_interested",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        outcome: true,
        duration: true,
        createdAt: true,
        prospect: { select: { name: true, company: true } },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.prospect.findMany({
      where: {
        status: "meeting_scheduled",
        updatedAt: { gte: oneDayAgo },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        company: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    }),
  ])

  const events = [
    ...notableCalls.map((c) => ({
      id: `call-${c.id}`,
      type: "call" as const,
      outcome: c.outcome as string,
      user: c.user,
      prospect: c.prospect?.name || null,
      company: c.prospect?.company || null,
      duration: c.duration || null,
      time: c.createdAt.toISOString(),
    })),
    ...recentMeetings.map((p) => ({
      id: `meeting-${p.id}`,
      type: "meeting" as const,
      outcome: "meeting_scheduled",
      user: p.user,
      prospect: p.name,
      company: p.company || null,
      duration: null,
      time: p.updatedAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 50)

  return NextResponse.json({ events })
})
