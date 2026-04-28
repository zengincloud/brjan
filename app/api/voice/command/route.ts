import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/auth/api-middleware"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a voice command parser for Boilerroom, a B2B sales prospecting tool.

Given a transcribed voice command, return a JSON object with the action to execute.

Available actions:
- { "action": "search_people", "params": { "title": string, "location": string, "company": string, "keyword": string } }
- { "action": "search_companies", "params": { "industry": string, "location": string, "size": string, "keyword": string } }
- { "action": "navigate", "params": { "page": "leads" | "accounts" | "prospecting" | "people" | "companies" | "settings" | "sequences" | "calls" } }
- { "action": "add_lead", "params": { "name": string, "company": string } }
- { "action": "add_account", "params": { "company": string } }
- { "action": "unknown", "params": {}, "message": string }

Rules:
- Only return valid JSON, no explanation
- All params are optional — only include what was mentioned
- If the command is unclear or not supported, use action "unknown" with a helpful message
- Keep the message field short (used for TTS response, under 20 words)

Examples:
"search for CTOs in San Francisco" → { "action": "search_people", "params": { "title": "CTO", "location": "San Francisco" } }
"go to my leads" → { "action": "navigate", "params": { "page": "leads" } }
"find software companies in New York" → { "action": "search_companies", "params": { "industry": "software", "location": "New York" } }`

export const POST = withSuperAdmin(async (request: NextRequest) => {
  const { transcript } = await request.json()

  if (!transcript || typeof transcript !== "string") {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 })
  }

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: transcript }],
  })

  const text = message.content[0].type === "text" ? message.content[0].text : ""

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: "Failed to parse command" }, { status: 500 })
  }

  return NextResponse.json(parsed)
})
