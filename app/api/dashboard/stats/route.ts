import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// In-memory cache: userId -> { data, timestamp }
const statsCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL_MS = 60_000 // 60 seconds

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  // Return cached data if fresh
  const cached = statsCache.get(userId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data)
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()) // Sunday

  // Fetch org targets for the user
  const userWithOrg = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      organization: {
        select: { targetEmails: true, targetCalls: true, targetLeads: true, targetLinkedin: true },
      },
    },
  })
  const org = userWithOrg?.organization

  const [
    // Prospect counts by status
    prospectStatusCounts,
    totalProspects,
    // Account counts by status
    accountStatusCounts,
    totalAccounts,
    // Calls today
    callsToday,
    // Emails sent today
    emailsSentToday,
    // Meetings booked (prospects with meeting_scheduled)
    meetingsBooked,
    // Weekly SDR progress
    emailsThisWeek,
    callsThisWeek,
    leadsThisWeek,
    linkedinTasksThisWeek,
    // Recent activity (calls + emails combined)
    recentCalls,
    recentEmails,
  ] = await Promise.all([
    // Prospect status breakdown
    prisma.prospect.groupBy({
      by: ["status"],
      where: { userId },
      _count: { id: true },
    }),
    prisma.prospect.count({ where: { userId } }),
    // Account status breakdown
    prisma.account.groupBy({
      by: ["status"],
      where: { userId },
      _count: { id: true },
    }),
    prisma.account.count({ where: { userId } }),
    // Calls today
    prisma.call.count({
      where: { userId, createdAt: { gte: startOfToday } },
    }),
    // Emails sent today
    prisma.email.count({
      where: { userId, status: "sent", sentAt: { gte: startOfToday } },
    }),
    // Meetings booked (prospects with meeting_scheduled status)
    prisma.prospect.count({
      where: { userId, status: "meeting_scheduled" },
    }),
    // Emails sent this week
    prisma.email.count({
      where: { userId, status: "sent", sentAt: { gte: startOfWeek } },
    }),
    // Calls this week
    prisma.call.count({
      where: { userId, createdAt: { gte: startOfWeek } },
    }),
    // New leads this week
    prisma.prospect.count({
      where: { userId, createdAt: { gte: startOfWeek } },
    }),
    // LinkedIn tasks this week
    prisma.task.count({
      where: { userId, type: "linkedin", createdAt: { gte: startOfWeek } },
    }),
    // Recent calls (last 10)
    prisma.call.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        to: true,
        status: true,
        outcome: true,
        duration: true,
        createdAt: true,
        prospect: { select: { name: true, company: true } },
      },
    }),
    // Recent emails (last 10)
    prisma.email.findMany({
      where: { userId, status: "sent" },
      orderBy: { sentAt: "desc" },
      take: 10,
      select: {
        id: true,
        to: true,
        subject: true,
        sentAt: true,
        createdAt: true,
      },
    }),
  ])

  // Build prospect status map
  const prospectStatuses: Record<string, number> = {}
  for (const row of prospectStatusCounts) {
    prospectStatuses[row.status] = row._count.id
  }

  // Build account status map
  const accountStatuses: Record<string, number> = {}
  for (const row of accountStatusCounts) {
    accountStatuses[row.status] = row._count.id
  }

  // Merge and sort recent activity
  const recentActivity = [
    ...recentCalls.map((c) => ({
      id: c.id,
      type: "call" as const,
      target: c.prospect?.name || c.to,
      company: c.prospect?.company || null,
      detail: c.outcome || c.status,
      time: c.createdAt,
    })),
    ...recentEmails.map((e) => ({
      id: e.id,
      type: "email" as const,
      target: e.to,
      company: null,
      detail: e.subject,
      time: e.sentAt || e.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10)

  const responseData = {
    quickStats: {
      activeProspects: totalProspects,
      callsToday,
      emailsSentToday,
      meetingsBooked,
    },
    prospectStatuses: {
      total: totalProspects,
      new_lead: prospectStatuses.new_lead || 0,
      in_sequence: prospectStatuses.in_sequence || 0,
      contacted: prospectStatuses.contacted || 0,
      meeting_scheduled: prospectStatuses.meeting_scheduled || 0,
      qualified: prospectStatuses.qualified || 0,
      unqualified: prospectStatuses.unqualified || 0,
    },
    accountStatuses: {
      total: totalAccounts,
      new_lead: accountStatuses.new_lead || 0,
      in_sequence: accountStatuses.in_sequence || 0,
      contacted: accountStatuses.contacted || 0,
      meeting_scheduled: accountStatuses.meeting_scheduled || 0,
      customer: accountStatuses.customer || 0,
      churned: accountStatuses.churned || 0,
    },
    weeklyProgress: {
      emails: emailsThisWeek,
      calls: callsThisWeek,
      leads: leadsThisWeek,
      linkedin: linkedinTasksThisWeek,
    },
    recentActivity,
    weeklyTargets: {
      emails: org?.targetEmails ?? 40,
      calls: org?.targetCalls ?? 500,
      leads: org?.targetLeads ?? 50,
      linkedin: org?.targetLinkedin ?? 20,
    },
  }

  // Cache the result
  statsCache.set(userId, { data: responseData, timestamp: Date.now() })

  return NextResponse.json(responseData)
})
