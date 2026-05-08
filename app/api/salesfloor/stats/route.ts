import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withSuperAdmin } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

export const GET = withSuperAdmin(async (_request: NextRequest) => {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const users = await prisma.user.findMany({
    where: { role: { not: "super_admin" } },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      organization: { select: { id: true, name: true } },
      _count: {
        select: {
          calls: { where: { createdAt: { gte: startOfToday } } },
          emails: { where: { status: "sent", sentAt: { gte: startOfToday } } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  const userIds = users.map((u) => u.id)

  const [connectsByUser, meetingsByUser] = await Promise.all([
    prisma.call.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        createdAt: { gte: startOfToday },
        outcome: {
          in: [
            "connected",
            "connected_intro_booked",
            "connected_referral",
            "connected_not_interested",
            "connected_info_gathered",
          ],
        },
      },
      _count: { id: true },
    }),
    prisma.prospect.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        status: "meeting_scheduled",
      },
      _count: { id: true },
    }),
  ])

  const connectsMap = Object.fromEntries(connectsByUser.map((r) => [r.userId, r._count.id]))
  const meetingsMap = Object.fromEntries(meetingsByUser.map((r) => [r.userId, r._count.id]))

  const result = users.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    avatarUrl: u.avatarUrl,
    role: u.role,
    org: u.organization ? { id: u.organization.id, name: u.organization.name } : null,
    stats: {
      callsToday: u._count.calls,
      emailsToday: u._count.emails,
      connectsToday: connectsMap[u.id] || 0,
      meetingsBooked: meetingsMap[u.id] || 0,
    },
  }))

  // Sort by engagement: meetings > connects > calls > emails
  result.sort((a, b) => {
    const scoreA = a.stats.meetingsBooked * 10 + a.stats.connectsToday * 3 + a.stats.callsToday + a.stats.emailsToday * 0.5
    const scoreB = b.stats.meetingsBooked * 10 + b.stats.connectsToday * 3 + b.stats.callsToday + b.stats.emailsToday * 0.5
    return scoreB - scoreA
  })

  return NextResponse.json({ users: result })
})
