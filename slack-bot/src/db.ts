import { PrismaClient } from "@prisma/client"

const dbUrl = process.env.DATABASE_URL || ""
const separator = dbUrl.includes("?") ? "&" : "?"

const prisma = new PrismaClient({
  datasources: {
    db: { url: `${dbUrl}${separator}connection_limit=2` },
  },
})

// ─── Timezone helpers ───────────────────────────────────────────

const TZ_MAP: Record<string, string> = {
  pst: "America/Los_Angeles",
  mst: "America/Denver",
  cst: "America/Chicago",
  est: "America/New_York",
}

/** Get start-of-today and start-of-tomorrow in UTC, based on the user's timezone */
function getUserDayBounds(tz: string = "est"): { startOfDay: Date; endOfDay: Date } {
  const ianaZone = TZ_MAP[tz.toLowerCase()] || TZ_MAP.est

  // Get current time formatted in the user's timezone to extract the date parts
  const now = new Date()
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ianaZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)

  const year = parseInt(parts.find((p) => p.type === "year")!.value)
  const month = parseInt(parts.find((p) => p.type === "month")!.value) - 1
  const day = parseInt(parts.find((p) => p.type === "day")!.value)

  // Build "midnight in user's timezone" by computing the UTC offset
  // Create a reference date at midnight UTC for that calendar date
  const midnightUTC = new Date(Date.UTC(year, month, day, 0, 0, 0))
  // Figure out the offset: format the reference date in the target zone
  const refParts = new Intl.DateTimeFormat("en-US", {
    timeZone: ianaZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(midnightUTC)

  const refDay = parseInt(refParts.find((p) => p.type === "day")!.value)
  const refHour = parseInt(refParts.find((p) => p.type === "hour")!.value)
  const refMinute = parseInt(refParts.find((p) => p.type === "minute")!.value)

  // Calculate offset in ms: if midnight UTC shows as e.g. 19:00 previous day in PT,
  // then the zone is UTC-5 (EST) or UTC-8 (PST), etc.
  let offsetMs = refHour * 60 * 60 * 1000 + refMinute * 60 * 1000
  if (refDay !== day) {
    // The zone is behind UTC (negative offset), so midnight UTC is the previous day in that zone
    offsetMs = offsetMs - 24 * 60 * 60 * 1000
  }

  // startOfDay = midnight in user's tz, expressed as UTC
  const startOfDay = new Date(midnightUTC.getTime() - offsetMs)
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  return { startOfDay, endOfDay }
}

// ─── User lookup ───────────────────────────────────────────────

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      timezone: true,
      workStartTime: true,
      workEndTime: true,
      organization: {
        select: {
          targetEmails: true,
          targetCalls: true,
          targetLeads: true,
          targetLinkedin: true,
        },
      },
    },
  })
}

export type BoileroomUser = NonNullable<Awaited<ReturnType<typeof getUserByEmail>>>

// ─── Day Look (morning / "what does my day look like") ─────────

export async function getDayLook(userId: string, tz?: string) {
  const { startOfDay: startOfToday, endOfDay: endOfToday } = getUserDayBounds(tz)

  const [
    tasksDueToday,
    overdueTasks,
    sequenceProspectsToday,
    callsAlreadyMade,
    emailsAlreadySent,
    user,
  ] = await Promise.all([
    // Tasks due today
    prisma.task.findMany({
      where: {
        userId,
        status: { not: "done" },
        dueDate: { gte: startOfToday, lt: endOfToday },
      },
      select: {
        id: true,
        title: true,
        type: true,
        priority: true,
        status: true,
        contact: true,
        company: true,
      },
      orderBy: { priority: "asc" },
    }),
    // Overdue tasks
    prisma.task.findMany({
      where: {
        userId,
        status: { not: "done" },
        dueDate: { lt: startOfToday },
      },
      select: {
        id: true,
        title: true,
        type: true,
        priority: true,
        dueDate: true,
        contact: true,
        company: true,
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    // Sequence prospects needing action today
    prisma.prospectSequence.findMany({
      where: {
        prospect: { userId },
        status: "active",
        nextActionAt: { gte: startOfToday, lt: endOfToday },
      },
      select: {
        prospect: { select: { name: true, company: true } },
        sequence: { select: { name: true } },
        currentStep: true,
      },
      take: 20,
    }),
    // Calls already made today
    prisma.call.count({
      where: { userId, createdAt: { gte: startOfToday } },
    }),
    // Emails already sent today
    prisma.email.count({
      where: { userId, status: "sent", sentAt: { gte: startOfToday } },
    }),
    // User + org targets
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        organization: {
          select: { targetEmails: true, targetCalls: true, targetLeads: true, targetLinkedin: true },
        },
      },
    }),
  ])

  return {
    tasksDueToday,
    overdueTasks,
    sequenceProspectsToday,
    callsAlreadyMade,
    emailsAlreadySent,
    targets: {
      emails: user?.organization?.targetEmails ?? 40,
      calls: user?.organization?.targetCalls ?? 500,
      leads: user?.organization?.targetLeads ?? 50,
      linkedin: user?.organization?.targetLinkedin ?? 20,
    },
  }
}

// ─── Day Recap (EOD / "how'd my day go") ───────────────────────

export async function getDayRecap(userId: string, tz?: string) {
  const { startOfDay: startOfToday } = getUserDayBounds(tz)

  const [
    callsMade,
    callOutcomes,
    emailsSent,
    emailsOpened,
    tasksCompleted,
    tasksCreated,
    meetingsBooked,
    newProspects,
    user,
  ] = await Promise.all([
    // Total calls today
    prisma.call.count({
      where: { userId, createdAt: { gte: startOfToday } },
    }),
    // Call outcomes breakdown
    prisma.call.groupBy({
      by: ["outcome"],
      where: { userId, createdAt: { gte: startOfToday }, outcome: { not: null } },
      _count: { id: true },
    }),
    // Emails sent today
    prisma.email.count({
      where: { userId, status: "sent", sentAt: { gte: startOfToday } },
    }),
    // Emails opened today (tracked emails with opens)
    prisma.trackedEmail.count({
      where: {
        userId,
        sentAt: { gte: startOfToday },
        opens: { some: {} },
      },
    }),
    // Tasks completed (done status) — no updatedAt on Task, so we count
    // tasks with "done" status that have recent events as a proxy
    prisma.task.count({
      where: { userId, status: "done", events: { some: { createdAt: { gte: startOfToday } } } },
    }),
    // Tasks created today
    prisma.task.count({
      where: { userId, createdAt: { gte: startOfToday } },
    }),
    // Meetings booked (connected_intro_booked calls today)
    prisma.call.count({
      where: { userId, createdAt: { gte: startOfToday }, outcome: "connected_intro_booked" },
    }),
    // New prospects added today
    prisma.prospect.count({
      where: { userId, createdAt: { gte: startOfToday } },
    }),
    // User + org targets
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        organization: {
          select: { targetEmails: true, targetCalls: true, targetLeads: true, targetLinkedin: true },
        },
      },
    }),
  ])

  // Build outcome map
  const outcomes: Record<string, number> = {}
  for (const row of callOutcomes) {
    if (row.outcome) outcomes[row.outcome] = row._count.id
  }

  return {
    callsMade,
    callOutcomes: outcomes,
    connectedCalls: (outcomes.connected || 0) +
      (outcomes.connected_intro_booked || 0) +
      (outcomes.connected_referral || 0) +
      (outcomes.connected_not_interested || 0) +
      (outcomes.connected_info_gathered || 0),
    emailsSent,
    emailsOpened,
    tasksCompleted,
    tasksCreated,
    meetingsBooked,
    newProspects,
    targets: {
      emails: user?.organization?.targetEmails ?? 40,
      calls: user?.organization?.targetCalls ?? 500,
      leads: user?.organization?.targetLeads ?? 50,
      linkedin: user?.organization?.targetLinkedin ?? 20,
    },
  }
}

// ─── Upcoming tasks (for reminders) ────────────────────────────

export async function getUpcomingTasks(userId: string, withinMinutes: number = 30) {
  const now = new Date()
  const soon = new Date(now.getTime() + withinMinutes * 60 * 1000)

  return prisma.task.findMany({
    where: {
      userId,
      status: { not: "done" },
      dueDate: { gte: now, lte: soon },
    },
    select: {
      id: true,
      title: true,
      type: true,
      priority: true,
      dueDate: true,
      contact: true,
      company: true,
    },
    orderBy: { dueDate: "asc" },
  })
}

// ─── Quick stats snapshot ──────────────────────────────────────

export async function getQuickStats(userId: string, tz?: string) {
  const { startOfDay: startOfToday } = getUserDayBounds(tz)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

  const [callsToday, emailsToday, callsThisWeek, emailsThisWeek, openTasks] = await Promise.all([
    prisma.call.count({ where: { userId, createdAt: { gte: startOfToday } } }),
    prisma.email.count({ where: { userId, status: "sent", sentAt: { gte: startOfToday } } }),
    prisma.call.count({ where: { userId, createdAt: { gte: startOfWeek } } }),
    prisma.email.count({ where: { userId, status: "sent", sentAt: { gte: startOfWeek } } }),
    prisma.task.count({ where: { userId, status: { not: "done" } } }),
  ])

  return { callsToday, emailsToday, callsThisWeek, emailsThisWeek, openTasks }
}

// ─── Accounts overview ────────────────────────────────────────

export async function getAccounts(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      industry: true,
      location: true,
      website: true,
      employees: true,
      status: true,
      lastActivity: true,
      _count: {
        select: { prospects: true, calls: true },
      },
    },
    orderBy: { lastActivity: "desc" },
    take: 25,
  })

  return accounts.map((a) => ({
    name: a.name,
    industry: a.industry,
    location: a.location,
    website: a.website,
    employees: a.employees,
    status: a.status,
    prospects: a._count.prospects,
    calls: a._count.calls,
    lastActivity: a.lastActivity,
  }))
}

// ─── Prospects overview ───────────────────────────────────────

export async function getProspects(userId: string) {
  const prospects = await prisma.prospect.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      email: true,
      title: true,
      company: true,
      phone: true,
      status: true,
      sequence: true,
      sequenceStep: true,
      lastActivity: true,
      _count: {
        select: { calls: true },
      },
    },
    orderBy: { lastActivity: "desc" },
    take: 30,
  })

  return prospects.map((p) => ({
    name: p.name,
    email: p.email,
    title: p.title,
    company: p.company,
    phone: p.phone,
    status: p.status,
    sequence: p.sequence,
    sequenceStep: p.sequenceStep,
    totalCalls: p._count.calls,
    lastActivity: p.lastActivity,
  }))
}

// ─── Recent call history ──────────────────────────────────────

export async function getRecentCalls(userId: string, limit: number = 20) {
  const calls = await prisma.call.findMany({
    where: { userId, outcome: { not: null } },
    select: {
      id: true,
      outcome: true,
      notes: true,
      duration: true,
      createdAt: true,
      prospect: {
        select: { name: true, company: true, title: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return calls.map((c) => ({
    prospectName: c.prospect?.name || "Unknown",
    prospectCompany: c.prospect?.company || "",
    prospectTitle: c.prospect?.title || "",
    outcome: c.outcome,
    notes: c.notes,
    duration: c.duration,
    date: c.createdAt,
  }))
}

// ─── Calls with transcripts (for transcript-specific queries) ──

export async function getCallsWithTranscripts(userId: string, limit: number = 10) {
  const calls = await prisma.call.findMany({
    where: {
      userId,
      transcription: { not: null },
    },
    select: {
      id: true,
      outcome: true,
      notes: true,
      duration: true,
      createdAt: true,
      transcription: true,
      prospect: {
        select: { name: true, company: true, title: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return calls.map((c) => ({
    prospectName: c.prospect?.name || "Unknown",
    prospectCompany: c.prospect?.company || "",
    prospectTitle: c.prospect?.title || "",
    outcome: c.outcome,
    notes: c.notes,
    duration: c.duration,
    date: c.createdAt,
    transcription: c.transcription,
  }))
}

// ─── Pipeline summary ─────────────────────────────────────────

export async function getPipelineSummary(userId: string, retries = 2): Promise<{
  totalProspects: number
  totalAccounts: number
  activeSequences: number
  statusCounts: Record<string, number>
}> {
  try {
    const [
      totalProspects,
      byStatus,
      activeSequences,
      totalAccounts,
    ] = await Promise.all([
      prisma.prospect.count({ where: { userId } }),
      prisma.prospect.groupBy({
        by: ["status"],
        where: { userId },
        _count: { id: true },
      }),
      prisma.prospectSequence.count({
        where: { prospect: { userId }, status: "active" },
      }),
      prisma.account.count({ where: { userId } }),
    ])

    const statusCounts: Record<string, number> = {}
    for (const row of byStatus) {
      statusCounts[row.status] = row._count.id
    }

    return {
      totalProspects,
      totalAccounts,
      activeSequences,
      statusCounts,
    }
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 500))
      return getPipelineSummary(userId, retries - 1)
    }
    throw err
  }
}

// ─── Get all active users (for scheduled broadcasts) ──────────

export async function getAllActiveUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      timezone: true,
      workStartTime: true,
      workEndTime: true,
    },
  })
}

export { prisma }
