import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import type { User } from "@prisma/client"

export const dynamic = "force-dynamic"

type ChatMessage = { role: "user" | "assistant" | "system"; content: string }

async function grokChat(
  system: string,
  messages: ChatMessage[],
  maxTokens = 512
): Promise<string> {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-3-mini",
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  })
  if (!res.ok) throw new Error(`Grok API error: ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ""
}

const SYSTEM_PROMPT = `You are HAL6900, an intelligent voice assistant built into Boilerroom, a B2B sales CRM. You speak like a sharp, no-bullshit sales colleague who knows everything about the user's pipeline. Be concise and direct.

Given a transcribed voice command, return a JSON object with the action to execute. For general questions you can answer without data, use "speak_only".

Available actions:

NAVIGATION (frontend handles):
{ "action": "navigate", "params": { "page": "leads" | "accounts" | "prospecting" | "sequences" | "calls" | "dialer" | "activity" | "settings" | "tasks" | "meetings" | "reports" } }
{ "action": "search_people", "params": { "name"?: string, "title"?: string, "company"?: string, "location"?: string, "keyword"?: string, "seniorityLevels"?: ("C-Suite" | "VP" | "Director" | "Manager" | "Individual Contributor")[] } }
{ "action": "search_companies", "params": { "industry"?: string, "location"?: string, "size"?: string, "keyword"?: string } }
{ "action": "open_prospect", "params": { "name": string } }

DATA RETRIEVAL (backend fetches, HAL speaks result):
{ "action": "get_recent_calls", "params": { "contact"?: string, "limit"?: number } }
{ "action": "get_call_summary", "params": { "contact"?: string } }
{ "action": "get_recent_meetings", "params": { "limit"?: number } }
{ "action": "get_meeting_summary", "params": { "contact"?: string, "company"?: string } }
{ "action": "get_stats", "params": { "period"?: "today" | "week" | "month" } }
{ "action": "get_tasks", "params": { "status"?: "pending" | "done" } }
{ "action": "get_emails", "params": { "contact"?: string, "limit"?: number } }
{ "action": "get_prospect_info", "params": { "name": string } }
{ "action": "search_my_prospects", "params": { "name"?: string, "company"?: string, "status"?: string } }

WRITE ACTIONS (backend executes, HAL confirms):
{ "action": "add_note", "params": { "name": string, "note": string } }
{ "action": "create_task", "params": { "title": string, "contactName"?: string, "priority"?: "high" | "medium" | "low", "dueDate"?: string } }
{ "action": "update_prospect_status", "params": { "name": string, "status": "new_lead" | "in_sequence" | "contacted" | "meeting_scheduled" | "qualified" | "unqualified" } }
{ "action": "draft_followup", "params": { "contact"?: string, "company"?: string } }

CONVERSATIONAL:
{ "action": "speak_only", "message": string }
{ "action": "unknown", "message": string }

Rules:
- Return ONLY valid JSON, no markdown, no explanation
- Be conversational and punchy in any message fields — never robotic
- Extract note/task content verbatim from what the user said
- Relative dates ("tomorrow", "next Monday", "next week") pass through as-is in dueDate
- If genuinely unclear, use "unknown" with a helpful one-liner

Examples:
"add a note for Bob Ross that he's interested in our Q3 pricing" → { "action": "add_note", "params": { "name": "Bob Ross", "note": "Interested in Q3 pricing" } }
"create a task to follow up with Sarah next Monday" → { "action": "create_task", "params": { "title": "Follow up with Sarah", "contactName": "Sarah", "dueDate": "next Monday", "priority": "medium" } }
"how many calls did I make this week" → { "action": "get_stats", "params": { "period": "week" } }
"what are my open tasks" → { "action": "get_tasks", "params": { "status": "pending" } }
"mark Bob Ross as qualified" → { "action": "update_prospect_status", "params": { "name": "Bob Ross", "status": "qualified" } }
"open Bob Ross" → { "action": "open_prospect", "params": { "name": "Bob Ross" } }
"what happened in my last meeting with Acme" → { "action": "get_meeting_summary", "params": { "company": "Acme" } }
"find me VPs of Sales in New York" → { "action": "search_people", "params": { "title": "Sales", "location": "New York", "seniorityLevels": ["VP"] } }
"search for directors and VPs at fintech companies in London" → { "action": "search_people", "params": { "keyword": "fintech", "location": "London", "seniorityLevels": ["VP", "Director"] } }
"find C-suite at Series B startups in San Francisco" → { "action": "search_people", "params": { "keyword": "Series B startup", "location": "San Francisco", "seniorityLevels": ["C-Suite"] } }
"look for heads of engineering in Austin" → { "action": "search_people", "params": { "title": "Engineering", "location": "Austin", "seniorityLevels": ["VP", "Director"] } }
"what should I say on a cold call" → { "action": "speak_only", "message": "Lead with a pattern interrupt, connect it to a pain point fast, and ask one tight question. Don't pitch on the first call." }`

function resolveDueDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined
  const lower = raw.toLowerCase().trim()
  const now = new Date()

  if (lower === "today") return now
  if (lower === "tomorrow") {
    const d = new Date(now); d.setDate(d.getDate() + 1); return d
  }
  if (lower === "next week") {
    const d = new Date(now); d.setDate(d.getDate() + 7); return d
  }
  if (lower === "next monday") {
    const d = new Date(now)
    const day = d.getDay()
    d.setDate(d.getDate() + ((1 + 7 - day) % 7 || 7))
    return d
  }

  const inDays = lower.match(/in (\d+) days?/)
  if (inDays) {
    const d = new Date(now); d.setDate(d.getDate() + parseInt(inDays[1])); return d
  }

  const parsed = new Date(raw)
  return isNaN(parsed.getTime()) ? undefined : parsed
}

async function handleAction(
  action: string,
  params: Record<string, any>,
  userId: string
): Promise<string> {

  // ── CALLS ──────────────────────────────────────────────────────────────
  if (action === "get_recent_calls") {
    const where: any = { userId }
    if (params.contact) {
      where.prospect = { name: { contains: params.contact, mode: "insensitive" } }
    }
    const calls = await prisma.call.findMany({
      where,
      include: { prospect: { select: { name: true, company: true } } },
      orderBy: { createdAt: "desc" },
      take: params.limit || 5,
    })
    if (!calls.length) return params.contact ? `No calls found with ${params.contact}.` : "No recent calls."
    const lines = calls.map(c => {
      const who = c.prospect?.name || "unknown"
      const outcome = c.outcome?.replace(/_/g, " ") || c.status
      return `${who} — ${outcome}`
    }).join(", ")
    return `Your last ${calls.length} call${calls.length > 1 ? "s" : ""}: ${lines}.`
  }

  if (action === "get_call_summary") {
    const where: any = { userId }
    if (params.contact) {
      where.prospect = { name: { contains: params.contact, mode: "insensitive" } }
    }
    const call = await prisma.call.findFirst({
      where,
      include: { prospect: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })
    if (!call) return `No call found${params.contact ? ` with ${params.contact}` : ""}.`
    const prospectName = call.prospect?.name || "that prospect"
    let transcriptText = ""
    if (call.transcription) {
      try {
        const parsed = JSON.parse(call.transcription)
        transcriptText = parsed.fullText || parsed.text || call.transcription
      } catch { transcriptText = call.transcription }
    }
    if (!transcriptText) return `Call with ${prospectName} has no transcript yet.`

    // Use cached AI analysis if available — avoids a second Grok call
    const meta = call.metadata as any
    if (meta?.analysis?.summary) return meta.analysis.summary
    if (meta?.analysis?.keyPoints?.length) return meta.analysis.keyPoints.join(". ")

    return await grokChat(
      "Summarize this sales call in 2-3 spoken sentences, like telling a colleague. No bullet points.",
      [{ role: "user", content: transcriptText.slice(0, 3000) }],
      150
    )
  }

  // ── MEETINGS ───────────────────────────────────────────────────────────
  if (action === "get_recent_meetings") {
    const meetings = await prisma.meeting.findMany({
      where: { userId },
      include: { prospect: { select: { name: true } }, account: { select: { name: true } } },
      orderBy: { startedAt: "desc" },
      take: params.limit || 5,
    })
    if (!meetings.length) return "No meetings on record yet."
    const lines = meetings.map(m => {
      const who = m.prospect?.name || m.account?.name || "unknown"
      return `${m.title || "Meeting"} with ${who}`
    }).join(", ")
    return `Your last ${meetings.length} meeting${meetings.length > 1 ? "s" : ""}: ${lines}.`
  }

  if (action === "get_meeting_summary") {
    const where: any = { userId }
    if (params.contact) where.prospect = { name: { contains: params.contact, mode: "insensitive" } }
    if (params.company) where.account = { name: { contains: params.company, mode: "insensitive" } }
    const meeting = await prisma.meeting.findFirst({
      where,
      include: { prospect: { select: { name: true } }, account: { select: { name: true } } },
      orderBy: { startedAt: "desc" },
    })
    if (!meeting) return "No meeting found for that."
    if (!meeting.summary) return `Found the meeting but it hasn't been summarized yet.`
    const actionItems = (meeting.actionItems as string[] | null) || []
    const aiText = actionItems.length ? ` Action items: ${actionItems.join("; ")}.` : ""
    return `${meeting.summary}${aiText}`
  }

  // ── STATS ──────────────────────────────────────────────────────────────
  if (action === "get_stats") {
    const period = params.period || "week"
    const now = new Date()
    let since = new Date()
    if (period === "today") since.setHours(0, 0, 0, 0)
    else if (period === "week") since.setDate(now.getDate() - 7)
    else if (period === "month") since.setDate(now.getDate() - 30)

    const [calls, emails, meetings, tasks, prospects] = await Promise.all([
      prisma.call.count({ where: { userId, createdAt: { gte: since } } }),
      prisma.email.count({ where: { userId, sentAt: { gte: since } } }),
      prisma.meeting.count({ where: { userId, startedAt: { gte: since } } }),
      prisma.task.count({ where: { userId, status: "to_do" } }),
      prisma.prospect.count({ where: { userId, createdAt: { gte: since } } }),
    ])

    const periodLabel = period === "today" ? "today" : `this ${period}`
    return await grokChat(
      "You are HAL6900. Give a punchy 2-sentence sales performance summary. Be direct, skip fluff.",
      [{ role: "user", content: `Stats ${periodLabel}: ${calls} calls, ${emails} emails sent, ${meetings} meetings, ${prospects} new prospects added. ${tasks} tasks still pending.` }],
      120
    )
  }

  // ── TASKS ──────────────────────────────────────────────────────────────
  if (action === "get_tasks") {
    const status = params.status === "done" ? "done" : "to_do"
    const tasks = await prisma.task.findMany({
      where: { userId, status },
      orderBy: { dueDate: "asc" },
      take: 5,
    })
    if (!tasks.length) return status === "to_do" ? "No pending tasks. Clean slate." : "No completed tasks found."
    const lines = tasks.map(t => t.title).join(", ")
    return `You have ${tasks.length} ${status === "to_do" ? "pending" : "completed"} task${tasks.length > 1 ? "s" : ""}: ${lines}.`
  }

  // ── EMAILS ─────────────────────────────────────────────────────────────
  if (action === "get_emails") {
    const where: any = { userId, status: "sent" }
    if (params.contact) where.to = { contains: params.contact, mode: "insensitive" }
    const emails = await prisma.email.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: params.limit || 5,
      select: { to: true, subject: true, sentAt: true, openedAt: true },
    })
    if (!emails.length) return "No emails found."
    const lines = emails.map(e => `"${e.subject}" to ${e.to}${e.openedAt ? " (opened)" : ""}`).join(", ")
    return `Last ${emails.length} email${emails.length > 1 ? "s" : ""}: ${lines}.`
  }

  // ── PROSPECT INFO ──────────────────────────────────────────────────────
  if (action === "get_prospect_info" || action === "search_my_prospects") {
    const where: any = { userId }
    if (params.name) {
      const words = params.name.split(/\s+/).filter((w: string) => w.length > 2)
      where.OR = [
        { name: { contains: params.name, mode: "insensitive" } },
        ...words.map((w: string) => ({ name: { contains: w, mode: "insensitive" } })),
      ]
    }
    if (params.company) where.company = { contains: params.company, mode: "insensitive" }
    if (params.status) where.status = params.status

    const prospects = await prisma.prospect.findMany({
      where,
      take: 5,
      select: { name: true, title: true, company: true, status: true, email: true, notes: true, lastActivity: true },
    })
    if (!prospects.length) return "No prospects found matching that."
    if (prospects.length === 1) {
      const p = prospects[0]
      const notes = p.notes ? ` Notes: ${p.notes.slice(0, 120)}.` : ""
      return `${p.name}${p.title ? `, ${p.title}` : ""}${p.company ? ` at ${p.company}` : ""}. Status: ${p.status?.replace(/_/g, " ")}.${notes}`
    }
    const list = prospects.map(p => `${p.name}${p.company ? ` at ${p.company}` : ""}`).join(", ")
    return `Found ${prospects.length}: ${list}.`
  }

  // ── ADD NOTE ───────────────────────────────────────────────────────────
  if (action === "add_note") {
    if (!params.name || !params.note) return "I need a name and what to note."
    const nameWords = params.name.split(/\s+/).filter((w: string) => w.length > 2)
    const nameConditions = [
      { name: { contains: params.name, mode: "insensitive" as const } },
      ...nameWords.map((w: string) => ({ name: { contains: w, mode: "insensitive" as const } })),
    ]

    const prospect = await prisma.prospect.findFirst({
      where: { userId, OR: nameConditions },
      select: { id: true, name: true, notes: true },
    })
    if (prospect) {
      const existing = prospect.notes ? `${prospect.notes}\n` : ""
      await prisma.prospect.update({
        where: { id: prospect.id },
        data: { notes: `${existing}${params.note}`, lastActivity: new Date() },
      })
      return `Got it. Note added to ${prospect.name}: "${params.note}".`
    }

    const account = await prisma.account.findFirst({
      where: { userId, OR: nameConditions },
      select: { id: true, name: true, notes: true },
    })
    if (account) {
      const existing = account.notes ? `${account.notes}\n` : ""
      await prisma.account.update({
        where: { id: account.id },
        data: { notes: `${existing}${params.note}`, lastActivity: new Date() },
      })
      return `Got it. Note added to ${account.name}: "${params.note}".`
    }

    return `Couldn't find anyone named ${params.name} in prospects or companies.`
  }

  // ── CREATE TASK ────────────────────────────────────────────────────────
  if (action === "create_task") {
    if (!params.title) return "I need a title for the task."
    const dueDate = resolveDueDate(params.dueDate)

    let contact: { id: string; name: string; company: string | null } | null = null
    if (params.contactName) {
      const prospect = await prisma.prospect.findFirst({
        where: { userId, name: { contains: params.contactName, mode: "insensitive" } },
        select: { id: true, name: true, company: true },
      })
      contact = prospect
    }

    await prisma.task.create({
      data: {
        userId,
        title: params.title,
        description: params.title,
        type: "follow_up",
        status: "to_do",
        priority: params.priority || "medium",
        dueDate: dueDate || null,
        contact: contact ? { id: contact.id, name: contact.name, company: contact.company } : undefined,
      },
    })
    const when = dueDate ? ` due ${params.dueDate}` : ""
    return `Task created: "${params.title}"${when}.`
  }

  // ── DRAFT FOLLOW-UP (opens compose modal) ──────────────────────────────
  if (action === "draft_followup") {
    const where: any = { userId, summary: { not: null } }
    if (params.contact) where.prospect = { name: { contains: params.contact, mode: "insensitive" } }
    if (params.company) where.account = { name: { contains: params.company, mode: "insensitive" } }

    const meeting = await prisma.meeting.findFirst({
      where,
      include: {
        prospect: { select: { name: true, email: true, company: true } },
        account: { select: { name: true } },
      },
      orderBy: { startedAt: "desc" },
    })

    if (!meeting) return "__compose__" + JSON.stringify({ action: "speak_only", message: "No summarized meeting found to follow up on." })

    const prospectName = meeting.prospect?.name || "the prospect"
    const prospectCompany = meeting.prospect?.company || meeting.account?.name || ""
    const actionItems = (meeting.actionItems as string[] | null) || []

    const draft = await grokChat(
      "Draft a short follow-up email (2-3 sentences, casual and professional) from Sadid. Reference the meeting specifically. Return JSON only: {\"subject\": \"...\", \"body\": \"...\"}",
      [{ role: "user", content: `To: ${prospectName}${prospectCompany ? ` at ${prospectCompany}` : ""}\nSummary: ${meeting.summary}\nAction items: ${actionItems.join("; ") || "none"}` }],
      300
    )

    let emailDraft: { subject: string; body: string }
    try { emailDraft = JSON.parse(draft) } catch {
      const match = draft.match(/\{[\s\S]*\}/)
      if (!match) return "Couldn't draft the email."
      emailDraft = JSON.parse(match[0])
    }

    // Return a special marker so the route knows to return open_compose
    return "__compose__" + JSON.stringify({
      to: meeting.prospect?.email || "",
      subject: emailDraft.subject,
      body: emailDraft.body,
      meetingId: meeting.id,
    })
  }

  // ── UPDATE STATUS ──────────────────────────────────────────────────────
  if (action === "update_prospect_status") {
    if (!params.name || !params.status) return "I need a name and a status."
    const nameWords = params.name.split(/\s+/).filter((w: string) => w.length > 2)
    const prospect = await prisma.prospect.findFirst({
      where: {
        userId,
        OR: [
          { name: { contains: params.name, mode: "insensitive" } },
          ...nameWords.map((w: string) => ({ name: { contains: w, mode: "insensitive" } })),
        ],
      },
      select: { id: true, name: true },
    })
    if (!prospect) return `Couldn't find ${params.name}.`
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { status: params.status, lastActivity: new Date() },
    })
    return `${prospect.name} marked as ${params.status.replace(/_/g, " ")}.`
  }

  return "I couldn't handle that one."
}

// For open_prospect — looks up the ID so frontend can navigate
async function resolveProspectPath(name: string, userId: string): Promise<string | null> {
  // Try full name first, then fall back to individual words (handles STT mishearing)
  const words = name.split(/\s+/).filter((w) => w.length > 2)

  const prospect = await prisma.prospect.findFirst({
    where: {
      userId,
      OR: [
        { name: { contains: name, mode: "insensitive" } },
        ...words.map((w) => ({ name: { contains: w, mode: "insensitive" } })),
      ],
    },
    select: { id: true, name: true },
  })
  return prospect ? `/prospects/${prospect.id}` : null
}

const DATA_ACTIONS = [
  "get_recent_calls", "get_call_summary",
  "get_recent_meetings", "get_meeting_summary",
  "get_stats", "get_tasks", "get_emails",
  "get_prospect_info", "search_my_prospects",
  "add_note", "create_task", "update_prospect_status",
  "draft_followup",
]

export const POST = withSuperAdmin(async (request: NextRequest, user: User) => {
  const body = await request.json().catch(() => null)
  const transcript = body?.transcript
  const history: ChatMessage[] = body?.history || []

  if (!transcript?.trim()) {
    return NextResponse.json({ action: "speak_only", message: "I didn't catch that." })
  }

  // Build messages: prior conversation + current command
  const messages: ChatMessage[] = [
    ...history.slice(-10), // keep last 5 exchanges (10 messages)
    { role: "user", content: transcript },
  ]

  let text: string
  try {
    text = await grokChat(SYSTEM_PROMPT, messages)
  } catch (err) {
    console.error("Grok API error:", err)
    return NextResponse.json({ action: "speak_only", message: "Something went wrong on my end." })
  }

  const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim()

  let parsed: { action: string; params?: Record<string, any>; message?: string }
  try {
    parsed = JSON.parse(clean)
  } catch {
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ action: "speak_only", message: "I couldn't parse that." })
    try { parsed = JSON.parse(match[0]) } catch {
      return NextResponse.json({ action: "speak_only", message: "I couldn't parse that." })
    }
  }

  // open_prospect needs a backend lookup to get the path
  if (parsed.action === "open_prospect" && parsed.params?.name) {
    const path = await resolveProspectPath(parsed.params.name, user.id)
    if (path) return NextResponse.json({ action: "navigate_url", params: { path } })
    return NextResponse.json({ action: "speak_only", message: `Couldn't find ${parsed.params.name} in your prospects.` })
  }

  // Data/write actions — backend handles, HAL speaks
  if (DATA_ACTIONS.includes(parsed.action)) {
    const result = await handleAction(parsed.action, parsed.params || {}, user.id).catch((err) => {
      console.error("HAL action error:", err)
      return "I ran into an issue fetching that."
    })
    // draft_followup returns a compose payload prefixed with __compose__
    if (result.startsWith("__compose__")) {
      const payload = result.slice("__compose__".length)
      try {
        const data = JSON.parse(payload)
        if (data.action === "speak_only") return NextResponse.json(data)
        return NextResponse.json({ action: "open_compose", params: data })
      } catch {
        return NextResponse.json({ action: "speak_only", message: "Couldn't open the draft." })
      }
    }
    return NextResponse.json({ action: "speak_only", message: result })
  }

  return NextResponse.json(parsed)
})
