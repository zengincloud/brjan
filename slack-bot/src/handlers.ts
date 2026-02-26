import { getDayLook, getDayRecap, getQuickStats, getUserByEmail, type BoileroomUser } from "./db"
import * as grok from "./grok"

// ─── Intent detection ──────────────────────────────────────────

type Intent = "day_look" | "day_recap" | "quick_stats" | "general"

function detectIntent(text: string): Intent {
  const lower = text.toLowerCase()

  // "what does my day look like" / "what's on my plate" / "what's up today"
  if (
    lower.includes("day look") ||
    lower.includes("look like") ||
    lower.includes("today look") ||
    lower.includes("on my plate") ||
    lower.includes("what's up") ||
    lower.includes("whats up") ||
    lower.includes("what do i have") ||
    lower.includes("what's today") ||
    lower.includes("morning") ||
    lower.includes("schedule") ||
    lower.includes("lineup") ||
    lower.includes("agenda")
  ) {
    return "day_look"
  }

  // "how'd my day go" / "how was my day" / "end of day" / "eod"
  if (
    lower.includes("how'd") ||
    lower.includes("howd") ||
    lower.includes("how was") ||
    lower.includes("how did") ||
    lower.includes("recap") ||
    lower.includes("end of day") ||
    lower.includes("eod") ||
    lower.includes("wrap up") ||
    lower.includes("summary") ||
    lower.includes("results") ||
    lower.includes("my numbers") ||
    lower.includes("how i do")
  ) {
    return "day_recap"
  }

  // "stats" / "numbers" / "metrics"
  if (
    lower.includes("stats") ||
    lower.includes("metrics") ||
    lower.includes("numbers") ||
    lower.includes("score")
  ) {
    return "quick_stats"
  }

  return "general"
}

// ─── Format data as context string for Grok ────────────────────

function formatDayLookContext(data: Awaited<ReturnType<typeof getDayLook>>): string {
  const lines: string[] = []

  lines.push(`Tasks due today: ${data.tasksDueToday.length}`)
  for (const t of data.tasksDueToday.slice(0, 8)) {
    const contact = t.contact ? (t.contact as any).name || "" : ""
    const company = t.company ? (t.company as any).name || "" : ""
    lines.push(`  • [${t.type}/${t.priority}] ${t.title}${contact ? ` — ${contact}` : ""}${company ? ` @ ${company}` : ""}`)
  }

  lines.push(`\nOverdue tasks: ${data.overdueTasks.length}`)
  for (const t of data.overdueTasks.slice(0, 5)) {
    lines.push(`  • [${t.type}] ${t.title} (due ${t.dueDate?.toLocaleDateString()})`)
  }

  lines.push(`\nSequence prospects needing action today: ${data.sequenceProspectsToday.length}`)
  for (const ps of data.sequenceProspectsToday.slice(0, 8)) {
    lines.push(`  • ${ps.prospect.name}${ps.prospect.company ? ` @ ${ps.prospect.company}` : ""} — ${ps.sequence.name} (step ${ps.currentStep + 1})`)
  }

  lines.push(`\nProgress so far today:`)
  lines.push(`  • Calls: ${data.callsAlreadyMade} / ${data.targets.calls} weekly target`)
  lines.push(`  • Emails: ${data.emailsAlreadySent} / ${data.targets.emails} weekly target`)

  return lines.join("\n")
}

function formatDayRecapContext(data: Awaited<ReturnType<typeof getDayRecap>>): string {
  const lines: string[] = []

  lines.push(`Calls made today: ${data.callsMade}`)
  lines.push(`Connected calls: ${data.connectedCalls}`)
  if (Object.keys(data.callOutcomes).length > 0) {
    lines.push(`Call outcome breakdown:`)
    for (const [outcome, count] of Object.entries(data.callOutcomes)) {
      lines.push(`  • ${outcome.replace(/_/g, " ")}: ${count}`)
    }
  }

  lines.push(`\nEmails sent: ${data.emailsSent}`)
  lines.push(`Emails opened: ${data.emailsOpened}`)
  lines.push(`\nMeetings booked (intros): ${data.meetingsBooked}`)
  lines.push(`New prospects added: ${data.newProspects}`)
  lines.push(`\nTasks completed: ${data.tasksCompleted}`)
  lines.push(`Tasks created: ${data.tasksCreated}`)

  lines.push(`\nWeekly targets:`)
  lines.push(`  • Calls: ${data.targets.calls}`)
  lines.push(`  • Emails: ${data.targets.emails}`)
  lines.push(`  • Leads: ${data.targets.leads}`)
  lines.push(`  • LinkedIn: ${data.targets.linkedin}`)

  return lines.join("\n")
}

function formatQuickStatsContext(data: Awaited<ReturnType<typeof getQuickStats>>): string {
  return [
    `Calls today: ${data.callsToday}`,
    `Emails today: ${data.emailsToday}`,
    `Calls this week: ${data.callsThisWeek}`,
    `Emails this week: ${data.emailsThisWeek}`,
    `Open tasks: ${data.openTasks}`,
  ].join("\n")
}

// ─── Main handler ──────────────────────────────────────────────

export async function handleMessage(
  text: string,
  slackEmail: string
): Promise<string> {
  // 1. Find the Boilerroom user
  const user = await getUserByEmail(slackEmail)
  if (!user) {
    return "hey, I don't recognize your email in Boilerroom. make sure you're using the same email for Slack and Boilerroom!"
  }

  // 2. Detect intent
  const intent = detectIntent(text)

  // 3. Fetch data + send to Grok
  switch (intent) {
    case "day_look": {
      const data = await getDayLook(user.id)
      const context = formatDayLookContext(data)
      return grok.formatDayLook(context)
    }
    case "day_recap": {
      const data = await getDayRecap(user.id)
      const context = formatDayRecapContext(data)
      return grok.formatDayRecap(context)
    }
    case "quick_stats": {
      const data = await getQuickStats(user.id)
      const context = formatQuickStatsContext(data)
      return grok.chat(text, context)
    }
    case "general": {
      // For general messages, still pull quick stats so Grok has context
      const data = await getQuickStats(user.id)
      const context = formatQuickStatsContext(data)
      return grok.chat(text, context)
    }
  }
}

// ─── Proactive message builders (for scheduler) ────────────────

export async function buildMorningBrief(userId: string): Promise<string> {
  const data = await getDayLook(userId)
  const context = formatDayLookContext(data)
  return grok.formatMorningBrief(context)
}

export async function buildEodRecap(userId: string): Promise<string> {
  const data = await getDayRecap(userId)
  const context = formatDayRecapContext(data)
  return grok.formatDayRecap(context)
}
