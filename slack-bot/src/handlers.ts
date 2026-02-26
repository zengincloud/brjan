import { getDayLook, getDayRecap, getQuickStats, getUserByEmail, getAccounts, getProspects, getRecentCalls, getCallsWithTranscripts, getPipelineSummary, type BoileroomUser } from "./db"
import * as grok from "./grok"

// ─── Intent detection ──────────────────────────────────────────

type Intent = "day_look" | "day_recap" | "quick_stats" | "accounts" | "prospects" | "calls" | "transcripts" | "pipeline" | "general"

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
    lower.includes("results") ||
    lower.includes("my numbers") ||
    lower.includes("how i do")
  ) {
    return "day_recap"
  }

  // Accounts: "my accounts" / "companies" / "who am i working"
  if (
    lower.includes("account") ||
    lower.includes("companies") ||
    lower.includes("company") ||
    lower.includes("who am i working") ||
    lower.includes("what companies") ||
    lower.includes("my book")
  ) {
    return "accounts"
  }

  // Prospects: "my prospects" / "who are my leads" / "prospects"
  if (
    lower.includes("prospect") ||
    lower.includes("leads") ||
    lower.includes("contacts") ||
    lower.includes("who am i calling") ||
    lower.includes("who do i have")
  ) {
    return "prospects"
  }

  // Transcripts: "transcript" / "recording" / "what did i say" / "what did they say"
  if (
    lower.includes("transcript") ||
    lower.includes("recording") ||
    lower.includes("what did i say") ||
    lower.includes("what did they say") ||
    lower.includes("what was said") ||
    lower.includes("conversation with") ||
    lower.includes("call with")
  ) {
    return "transcripts"
  }

  // Calls: "who did i call" / "my calls" / "call history" / "who i talked to"
  if (
    lower.includes("call") ||
    lower.includes("talked to") ||
    lower.includes("spoke to") ||
    lower.includes("dialed") ||
    lower.includes("rang") ||
    lower.includes("who did i")
  ) {
    return "calls"
  }

  // Pipeline: "pipeline" / "funnel" / "where do i stand"
  if (
    lower.includes("pipeline") ||
    lower.includes("funnel") ||
    lower.includes("where do i stand") ||
    lower.includes("overview") ||
    lower.includes("big picture")
  ) {
    return "pipeline"
  }

  // "stats" / "numbers" / "metrics" / "summary"
  if (
    lower.includes("stats") ||
    lower.includes("metrics") ||
    lower.includes("numbers") ||
    lower.includes("score") ||
    lower.includes("summary")
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

function formatAccountsContext(accounts: Awaited<ReturnType<typeof getAccounts>>): string {
  if (accounts.length === 0) return "No accounts found."

  const lines: string[] = [`Total accounts shown: ${accounts.length}\n`]
  for (const a of accounts) {
    const details = [
      a.industry || null,
      a.employees ? `${a.employees.toLocaleString()} employees` : null,
      a.location || null,
    ].filter(Boolean).join(", ")

    lines.push(`• ${a.name} [${a.status.replace(/_/g, " ")}] — ${a.prospects} prospects, ${a.calls} calls${details ? ` (${details})` : ""}`)
  }
  return lines.join("\n")
}

function formatProspectsContext(prospects: Awaited<ReturnType<typeof getProspects>>): string {
  if (prospects.length === 0) return "No prospects found."

  const lines: string[] = [`Total prospects shown: ${prospects.length}\n`]
  for (const p of prospects) {
    const details = [
      p.title || null,
      p.company || null,
    ].filter(Boolean).join(" @ ")

    const seqInfo = p.sequence ? ` — in "${p.sequence}" (${p.sequenceStep || "?"})` : ""
    lines.push(`• ${p.name} [${p.status.replace(/_/g, " ")}] ${details ? `(${details})` : ""} — ${p.totalCalls} calls${seqInfo}`)
  }
  return lines.join("\n")
}

function formatRecentCallsContext(calls: Awaited<ReturnType<typeof getRecentCalls>>): string {
  if (calls.length === 0) return "No recent calls found."

  const connected = calls.filter((c) =>
    c.outcome?.startsWith("connected")
  )
  const other = calls.filter((c) =>
    !c.outcome?.startsWith("connected")
  )

  const lines: string[] = []

  if (connected.length > 0) {
    lines.push(`Connected calls (${connected.length}):\n`)
    for (const c of connected) {
      const who = c.prospectName + (c.prospectCompany ? ` @ ${c.prospectCompany}` : "")
      const title = c.prospectTitle ? ` (${c.prospectTitle})` : ""
      const dur = c.duration ? ` ${Math.floor(c.duration / 60)}m${c.duration % 60}s` : ""
      const date = c.date.toLocaleDateString()
      const notes = c.notes ? ` — "${c.notes.length > 80 ? c.notes.slice(0, 80) + "..." : c.notes}"` : ""
      lines.push(`• ${date}: ${who}${title} → ${(c.outcome || "unknown").replace(/_/g, " ")}${dur}${notes}`)
    }
  }

  if (other.length > 0) {
    if (connected.length > 0) lines.push("")
    lines.push(`Other calls (${other.length}):\n`)
    for (const c of other) {
      const who = c.prospectName + (c.prospectCompany ? ` @ ${c.prospectCompany}` : "")
      const dur = c.duration ? ` ${Math.floor(c.duration / 60)}m${c.duration % 60}s` : ""
      const date = c.date.toLocaleDateString()
      const notes = c.notes ? ` — "${c.notes.length > 60 ? c.notes.slice(0, 60) + "..." : c.notes}"` : ""
      lines.push(`• ${date}: ${who} → ${(c.outcome || "unknown").replace(/_/g, " ")}${dur}${notes}`)
    }
  }

  lines.push(`\nTotal: ${calls.length} calls, ${connected.length} connections`)
  return lines.join("\n")
}

function formatTranscriptsContext(calls: Awaited<ReturnType<typeof getCallsWithTranscripts>>): string {
  if (calls.length === 0) return "No call transcripts found. Transcripts are generated after recorded calls."

  const lines: string[] = [`Calls with transcripts (${calls.length}):\n`]
  for (const c of calls) {
    const who = c.prospectName + (c.prospectCompany ? ` @ ${c.prospectCompany}` : "")
    const date = c.date.toLocaleDateString()
    const outcome = (c.outcome || "unknown").replace(/_/g, " ")
    // Truncate transcripts to keep context reasonable — include enough for Grok to reference
    const transcript = c.transcription
      ? c.transcription.length > 800
        ? c.transcription.slice(0, 800) + "... [truncated]"
        : c.transcription
      : ""
    lines.push(`--- ${date}: ${who} (${outcome}) ---`)
    if (transcript) lines.push(transcript)
    lines.push("")
  }
  return lines.join("\n")
}

function formatPipelineContext(pipeline: Awaited<ReturnType<typeof getPipelineSummary>>): string {
  const lines: string[] = [
    `Total prospects: ${pipeline.totalProspects}`,
    `Total accounts: ${pipeline.totalAccounts}`,
    `Active in sequences: ${pipeline.activeSequences}`,
    `\nProspect breakdown by status:`,
  ]

  for (const [status, count] of Object.entries(pipeline.statusCounts)) {
    lines.push(`  • ${status.replace(/_/g, " ")}: ${count}`)
  }

  return lines.join("\n")
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
    case "accounts": {
      const data = await getAccounts(user.id)
      const context = formatAccountsContext(data)
      return grok.chat(text, context)
    }
    case "prospects": {
      const data = await getProspects(user.id)
      const context = formatProspectsContext(data)
      return grok.chat(text, context)
    }
    case "calls": {
      const data = await getRecentCalls(user.id)
      const context = formatRecentCallsContext(data)
      return grok.chat(text, context)
    }
    case "transcripts": {
      const data = await getCallsWithTranscripts(user.id, 5)
      const context = formatTranscriptsContext(data)
      return grok.chat(text, context)
    }
    case "pipeline": {
      const data = await getPipelineSummary(user.id)
      const context = formatPipelineContext(data)
      return grok.chat(text, context)
    }
    case "general": {
      // For general messages, pull quick stats + pipeline counts so Grok has context
      const [stats, pipeline] = await Promise.all([
        getQuickStats(user.id),
        getPipelineSummary(user.id),
      ])
      const context = formatQuickStatsContext(stats) + "\n\n" + formatPipelineContext(pipeline)
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
