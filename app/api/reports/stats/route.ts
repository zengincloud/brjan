import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, differenceInDays, subDays } from "date-fns"

export const dynamic = "force-dynamic"

// Helper: group an array by a key function
function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of items) {
    const key = keyFn(item)
    if (!result[key]) result[key] = []
    result[key].push(item)
  }
  return result
}

// Helper: determine time bucket labels based on range length
function getTimePeriod(date: Date, rangeDays: number): { key: string; label: string } {
  if (rangeDays <= 31) {
    return { key: format(date, "yyyy-MM-dd"), label: format(date, "MMM d") }
  } else if (rangeDays <= 90) {
    // Group by week (starting Monday)
    const weekStart = new Date(date)
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
    return { key: format(weekStart, "yyyy-'W'II"), label: format(weekStart, "MMM d") }
  } else {
    return { key: format(date, "yyyy-MM"), label: format(date, "MMM yyyy") }
  }
}

// Build ordered period labels for the range
function buildPeriodLabels(from: Date, to: Date, rangeDays: number): { key: string; label: string }[] {
  if (rangeDays <= 31) {
    return eachDayOfInterval({ start: from, end: to }).map(d => ({
      key: format(d, "yyyy-MM-dd"),
      label: format(d, "MMM d"),
    }))
  } else if (rangeDays <= 90) {
    return eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 }).map(d => ({
      key: format(d, "yyyy-'W'II"),
      label: format(d, "MMM d"),
    }))
  } else {
    return eachMonthOfInterval({ start: from, end: to }).map(d => ({
      key: format(d, "yyyy-MM"),
      label: format(d, "MMM yyyy"),
    }))
  }
}

const CONNECTED_OUTCOMES = [
  "connected",
  "connected_intro_booked",
  "connected_referral",
  "connected_not_interested",
  "connected_info_gathered",
]

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")

    const to = toParam ? new Date(toParam) : new Date()
    const from = fromParam ? new Date(fromParam) : subDays(to, 30)
    const rangeDays = Math.max(differenceInDays(to, from), 1)

    // Previous period (same length, immediately before)
    const prevFrom = subDays(from, rangeDays)
    const prevTo = from

    const [
      // Current period calls
      calls,
      // Previous period call counts
      prevCallCount,
      prevConnectedCount,
      prevMeetingsBooked,
      // Current period emails
      emailsSent,
      prevEmailsSent,
      // Email engagement
      emailsOpened,
      emailsClicked,
      emailsBounced,
      // Prospect statuses (current snapshot)
      prospectStatusCounts,
      // Account statuses (current snapshot)
      accountStatusCounts,
      // Prospects created in range
      newProspects,
      // Tasks in range
      taskStatusCounts,
      taskTypeCounts,
      // Sequence performance
      sequenceStatusCounts,
      // Recent activity
      recentCalls,
      recentEmails,
    ] = await Promise.all([
      // All calls in range with details for grouping
      prisma.call.findMany({
        where: { userId, createdAt: { gte: from, lte: to } },
        select: { id: true, createdAt: true, outcome: true, duration: true, status: true },
      }),
      // Previous period totals
      prisma.call.count({
        where: { userId, createdAt: { gte: prevFrom, lte: prevTo } },
      }),
      prisma.call.count({
        where: {
          userId,
          createdAt: { gte: prevFrom, lte: prevTo },
          outcome: { in: CONNECTED_OUTCOMES as any },
        },
      }),
      prisma.call.count({
        where: {
          userId,
          createdAt: { gte: prevFrom, lte: prevTo },
          outcome: "connected_intro_booked",
        },
      }),
      // Emails sent in range
      prisma.email.findMany({
        where: { userId, status: "sent", sentAt: { gte: from, lte: to } },
        select: { id: true, sentAt: true, emailType: true },
      }),
      prisma.email.count({
        where: { userId, status: "sent", sentAt: { gte: prevFrom, lte: prevTo } },
      }),
      // Email engagement
      prisma.email.count({
        where: { userId, sentAt: { gte: from, lte: to }, openedAt: { not: null } },
      }),
      prisma.email.count({
        where: { userId, sentAt: { gte: from, lte: to }, clickedAt: { not: null } },
      }),
      prisma.email.count({
        where: { userId, sentAt: { gte: from, lte: to }, status: "bounced" },
      }),
      // Prospect status distribution (current)
      prisma.prospect.groupBy({
        by: ["status"],
        where: { userId },
        _count: { id: true },
      }),
      // Account status distribution (current)
      prisma.account.groupBy({
        by: ["status"],
        where: { userId },
        _count: { id: true },
      }),
      // New prospects in range
      prisma.prospect.findMany({
        where: { userId, createdAt: { gte: from, lte: to } },
        select: { id: true, createdAt: true, status: true },
      }),
      // Task status counts
      prisma.task.groupBy({
        by: ["status"],
        where: { userId, createdAt: { gte: from, lte: to } },
        _count: { id: true },
      }),
      // Task type counts
      prisma.task.groupBy({
        by: ["type"],
        where: { userId, createdAt: { gte: from, lte: to } },
        _count: { id: true },
      }),
      // Sequence performance
      prisma.prospectSequence.groupBy({
        by: ["status"],
        where: {
          prospect: { userId },
          startedAt: { gte: from, lte: to },
        },
        _count: { id: true },
      }),
      // Recent calls
      prisma.call.findMany({
        where: { userId, createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          to: true,
          outcome: true,
          duration: true,
          createdAt: true,
          prospect: { select: { name: true, company: true } },
        },
      }),
      // Recent emails
      prisma.email.findMany({
        where: { userId, status: "sent", sentAt: { gte: from, lte: to } },
        orderBy: { sentAt: "desc" },
        take: 15,
        select: {
          id: true,
          to: true,
          subject: true,
          sentAt: true,
        },
      }),
    ])

    // ========== OVERVIEW ==========
    const totalCalls = calls.length
    const completedCalls = calls.filter(c => c.outcome)
    const connectedCalls = completedCalls.filter(c => CONNECTED_OUTCOMES.includes(c.outcome!))
    const meetingsBooked = completedCalls.filter(c => c.outcome === "connected_intro_booked").length
    const connectRate = completedCalls.length > 0
      ? Math.round((connectedCalls.length / completedCalls.length) * 100)
      : 0
    const prevConnectRate = prevCallCount > 0
      ? Math.round((prevConnectedCount / prevCallCount) * 100)
      : 0

    const overview = {
      totalCalls,
      totalEmailsSent: emailsSent.length,
      connectRate,
      meetingsBooked,
      prevTotalCalls: prevCallCount,
      prevTotalEmailsSent: prevEmailsSent,
      prevConnectRate,
      prevMeetingsBooked,
    }

    // ========== ACTIVITY BY DAY ==========
    const periods = buildPeriodLabels(from, to, rangeDays)
    const callsByPeriod = groupBy(calls, c => getTimePeriod(c.createdAt, rangeDays).key)
    const emailsByPeriod = groupBy(emailsSent, e => getTimePeriod(e.sentAt!, rangeDays).key)

    const activityByDay = periods.map(p => ({
      date: p.key,
      label: p.label,
      calls: callsByPeriod[p.key]?.length || 0,
      emailsSent: emailsByPeriod[p.key]?.length || 0,
    }))

    // ========== ACTIVITY BY TYPE ==========
    const callOutcomeMap: Record<string, number> = {}
    for (const c of completedCalls) {
      callOutcomeMap[c.outcome!] = (callOutcomeMap[c.outcome!] || 0) + 1
    }

    const emailTypeMap: Record<string, number> = {}
    for (const e of emailsSent) {
      emailTypeMap[e.emailType] = (emailTypeMap[e.emailType] || 0) + 1
    }

    const taskTypeMap: Record<string, number> = {}
    for (const t of taskTypeCounts) {
      taskTypeMap[t.type] = t._count.id
    }

    const activityByType = {
      calls: { total: totalCalls, byOutcome: callOutcomeMap },
      emails: { total: emailsSent.length, byType: emailTypeMap },
      tasks: {
        total: taskTypeCounts.reduce((sum, t) => sum + t._count.id, 0),
        byType: taskTypeMap,
      },
    }

    // ========== RECENT ACTIVITY ==========
    const recentActivity = [
      ...recentCalls.map(c => ({
        id: c.id,
        type: "call" as const,
        target: c.prospect?.name || c.to,
        company: c.prospect?.company || null,
        detail: c.outcome || "in progress",
        time: c.createdAt.toISOString(),
        duration: c.duration,
      })),
      ...recentEmails.map(e => ({
        id: e.id,
        type: "email" as const,
        target: e.to,
        company: null,
        detail: e.subject || "",
        time: (e.sentAt || new Date()).toISOString(),
        duration: null,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 20)

    // ========== CALL PERFORMANCE ==========
    const callTimeline = periods.map(p => {
      const periodCalls = callsByPeriod[p.key] || []
      const periodCompleted = periodCalls.filter(c => c.outcome)
      const periodConnected = periodCompleted.filter(c => CONNECTED_OUTCOMES.includes(c.outcome!))
      const periodVoicemail = periodCompleted.filter(c => c.outcome === "voicemail")
      const periodNoAnswer = periodCompleted.filter(c => c.outcome === "no_answer")
      const durations = periodCalls.filter(c => c.duration).map(c => c.duration!)
      const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

      return {
        period: p.key,
        label: p.label,
        totalCalls: periodCalls.length,
        connected: periodConnected.length,
        voicemail: periodVoicemail.length,
        noAnswer: periodNoAnswer.length,
        avgDuration,
      }
    })

    const allDurations = calls.filter(c => c.duration).map(c => c.duration!)
    const callPerformance = {
      timeline: callTimeline,
      summary: {
        totalCalls,
        totalConnected: connectedCalls.length,
        totalVoicemail: completedCalls.filter(c => c.outcome === "voicemail").length,
        totalNoAnswer: completedCalls.filter(c => c.outcome === "no_answer").length,
        avgDuration: allDurations.length > 0
          ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length)
          : 0,
        connectRate,
      },
      outcomeBreakdown: callOutcomeMap,
    }

    // ========== EMAIL ENGAGEMENT ==========
    const totalSent = emailsSent.length
    const emailEngagement = {
      sent: totalSent,
      opened: emailsOpened,
      clicked: emailsClicked,
      bounced: emailsBounced,
      openRate: totalSent > 0 ? Math.round((emailsOpened / totalSent) * 100) : 0,
      clickRate: totalSent > 0 ? Math.round((emailsClicked / totalSent) * 100) : 0,
      bounceRate: totalSent > 0 ? Math.round((emailsBounced / totalSent) * 100) : 0,
    }

    // ========== PIPELINE ==========
    const prospectStatusLabels: Record<string, string> = {
      new_lead: "New Lead",
      in_sequence: "In Sequence",
      contacted: "Contacted",
      meeting_scheduled: "Meeting Scheduled",
      qualified: "Qualified",
      unqualified: "Unqualified",
    }

    const accountStatusLabels: Record<string, string> = {
      new_lead: "New Lead",
      in_sequence: "In Sequence",
      contacted: "Contacted",
      meeting_scheduled: "Meeting Scheduled",
      customer: "Customer",
      churned: "Churned",
    }

    const prospectsByStatus = Object.keys(prospectStatusLabels).map(status => ({
      status,
      label: prospectStatusLabels[status],
      count: prospectStatusCounts.find(r => r.status === status)?._count.id || 0,
    }))

    const accountsByStatus = Object.keys(accountStatusLabels).map(status => ({
      status,
      label: accountStatusLabels[status],
      count: accountStatusCounts.find(r => r.status === status)?._count.id || 0,
    }))

    // Prospects created over time
    const newProspectsByPeriod = groupBy(newProspects, p => getTimePeriod(p.createdAt, rangeDays).key)
    const prospectCreationTimeline = periods.map(p => ({
      period: p.key,
      label: p.label,
      newProspects: newProspectsByPeriod[p.key]?.length || 0,
    }))

    const pipeline = {
      prospectsByStatus,
      prospectCreationTimeline,
      accountsByStatus,
    }

    // ========== CONVERSION ==========
    const funnelOrder = ["new_lead", "in_sequence", "contacted", "meeting_scheduled", "qualified"]
    const funnelColors = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#22c55e"]
    const funnel = funnelOrder.map((status, i) => ({
      stage: status,
      label: prospectStatusLabels[status],
      count: prospectStatusCounts.find(r => r.status === status)?._count.id || 0,
      fill: funnelColors[i],
    }))

    // Connect rate trend over time
    const connectRateTrend = periods.map(p => {
      const periodCalls = callsByPeriod[p.key] || []
      const periodCompleted = periodCalls.filter(c => c.outcome)
      const periodConnected = periodCompleted.filter(c => CONNECTED_OUTCOMES.includes(c.outcome!))
      const periodMeetings = periodCompleted.filter(c => c.outcome === "connected_intro_booked")

      return {
        period: p.key,
        label: p.label,
        connectRate: periodCompleted.length > 0
          ? Math.round((periodConnected.length / periodCompleted.length) * 100)
          : 0,
        meetingRate: periodCompleted.length > 0
          ? Math.round((periodMeetings.length / periodCompleted.length) * 100)
          : 0,
      }
    })

    const conversion = { funnel, connectRateTrend }

    // ========== SEQUENCES ==========
    const seqMap: Record<string, number> = {}
    for (const s of sequenceStatusCounts) {
      seqMap[s.status] = s._count.id
    }
    const seqTotal = Object.values(seqMap).reduce((a, b) => a + b, 0)
    const sequences = {
      total: seqTotal,
      active: seqMap.active || 0,
      completed: seqMap.completed || 0,
      failed: seqMap.failed || 0,
      paused: seqMap.paused || 0,
      completionRate: seqTotal > 0 ? Math.round(((seqMap.completed || 0) / seqTotal) * 100) : 0,
    }

    // ========== TASKS ==========
    const taskStatusMap: Record<string, number> = {}
    for (const t of taskStatusCounts) {
      taskStatusMap[t.status] = t._count.id
    }
    const tasks = {
      total: taskStatusCounts.reduce((sum, t) => sum + t._count.id, 0),
      byStatus: taskStatusMap,
      byType: taskTypeMap,
    }

    return NextResponse.json({
      overview,
      activityByDay,
      activityByType,
      recentActivity,
      callPerformance,
      emailEngagement,
      pipeline,
      conversion,
      sequences,
      tasks,
    })
  } catch (error: any) {
    console.error("Reports stats error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch report stats" }, { status: 500 })
  }
})
