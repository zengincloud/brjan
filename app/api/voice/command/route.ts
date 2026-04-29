import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import type { User } from "@prisma/client"

export const dynamic = "force-dynamic"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a voice command parser for Boilerroom, a B2B sales prospecting tool.

Given a transcribed voice command, return a JSON object with the action to execute.

Available actions:
- { "action": "search_people", "params": { "name": string, "title": string, "location": string, "company": string, "keyword": string } }
- { "action": "search_companies", "params": { "industry": string, "location": string, "size": string, "keyword": string } }
- { "action": "navigate", "params": { "page": "leads" | "accounts" | "prospecting" | "people" | "companies" | "settings" | "sequences" | "calls" | "dialer" | "activity" } }
- { "action": "get_recent_calls", "params": { "contact": string, "limit": number } }
- { "action": "get_call_summary", "params": { "contact": string } }
- { "action": "search_my_prospects", "params": { "name": string, "company": string } }
- { "action": "add_lead", "params": { "name": string, "company": string } }
- { "action": "add_account", "params": { "company": string } }
- { "action": "unknown", "params": {}, "message": string }

Rules:
- Only return valid JSON, no explanation, no markdown
- All params are optional — only include what was mentioned
- For questions about past calls, transcriptions, or call history → use get_recent_calls or get_call_summary
- For searching existing prospects in the database → use search_my_prospects
- If the command is unclear or not supported, use action "unknown" with a helpful message

Examples:
"search for CTOs in San Francisco" → { "action": "search_people", "params": { "title": "CTO", "location": "San Francisco" } }
"go to my leads" → { "action": "navigate", "params": { "page": "leads" } }
"what happened in my last call with John" → { "action": "get_call_summary", "params": { "contact": "John" } }
"show me recent calls" → { "action": "get_recent_calls", "params": { "limit": 5 } }
"find Jason Smith in my prospects" → { "action": "search_my_prospects", "params": { "name": "Jason Smith" } }`

async function handleDataRetrieval(action: string, params: Record<string, any>, userId: string): Promise<string> {
  if (action === "get_recent_calls" || action === "get_call_summary") {
    const where: any = { userId }
    if (params.contact) {
      where.prospect = {
        name: { contains: params.contact, mode: "insensitive" },
      }
    }

    const calls = await prisma.call.findMany({
      where,
      include: {
        prospect: { select: { name: true, company: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: action === "get_recent_calls" ? (params.limit || 5) : 1,
    })

    if (calls.length === 0) {
      return params.contact
        ? `No calls found with ${params.contact}.`
        : "You have no recent calls."
    }

    if (action === "get_recent_calls") {
      const names = calls.map(c => c.prospect?.name || "Unknown").join(", ")
      return `Your ${calls.length} most recent calls were with: ${names}.`
    }

    // get_call_summary — summarize the transcript
    const call = calls[0]
    const prospectName = call.prospect?.name || "the prospect"

    let transcriptText = ""
    if (call.transcription) {
      try {
        const parsed = JSON.parse(call.transcription)
        transcriptText = parsed.fullText || parsed.text || call.transcription
      } catch {
        transcriptText = call.transcription
      }
    }

    if (!transcriptText) {
      return `Your last call with ${prospectName} has no transcription yet.`
    }

    const summary = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [{
        role: "user",
        content: `Summarize this sales call in 2-3 spoken sentences max, as if telling a colleague verbally. No bullet points.\n\nTranscript:\n${transcriptText.slice(0, 3000)}`,
      }],
    })

    return summary.content[0].type === "text" ? summary.content[0].text.trim() : `Call with ${prospectName} found but couldn't summarize.`
  }

  if (action === "search_my_prospects") {
    const where: any = { userId }
    if (params.name) where.name = { contains: params.name, mode: "insensitive" }
    if (params.company) where.company = { contains: params.company, mode: "insensitive" }

    const prospects = await prisma.prospect.findMany({
      where,
      select: { name: true, company: true, title: true },
      take: 5,
    })

    if (prospects.length === 0) return `No prospects found matching your search.`
    const list = prospects.map(p => `${p.name}${p.company ? ` at ${p.company}` : ""}`).join(", ")
    return `Found ${prospects.length} prospect${prospects.length > 1 ? "s" : ""}: ${list}.`
  }

  return "I couldn't retrieve that data."
}

export const POST = withSuperAdmin(async (request: NextRequest, user: User) => {
  let transcript: string
  try {
    const body = await request.json()
    transcript = body.transcript
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!transcript || typeof transcript !== "string") {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 })
  }

  let aiMessage
  try {
    aiMessage = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: transcript }],
    })
  } catch (err) {
    console.error("Anthropic API error:", err)
    return NextResponse.json({ error: "AI request failed" }, { status: 500 })
  }

  const text = aiMessage.content[0].type === "text" ? aiMessage.content[0].text : ""
  const clean = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim()

  let parsed
  try {
    parsed = JSON.parse(clean)
  } catch {
    return NextResponse.json({ error: "Failed to parse command" }, { status: 500 })
  }

  // Handle data retrieval actions server-side
  const dataActions = ["get_recent_calls", "get_call_summary", "search_my_prospects"]
  if (dataActions.includes(parsed.action)) {
    try {
      const message = await handleDataRetrieval(parsed.action, parsed.params || {}, user.id)
      return NextResponse.json({ action: "speak_only", message })
    } catch (err) {
      console.error("Data retrieval error:", err)
      return NextResponse.json({ action: "speak_only", message: "I had trouble fetching that data." })
    }
  }

  return NextResponse.json(parsed)
})
