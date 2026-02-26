import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

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

export async function getDayLook(userId: string) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(startOfToday)
  endOfToday.setDate(endOfToday.getDate() + 1)

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

export async function getDayRecap(userId: string) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

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

export async function getQuickStats(userId: string) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
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
