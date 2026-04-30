import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"

function parseNotes(notes: string | null): { text: string; date: string }[] {
  if (!notes) return []
  try {
    const parsed = JSON.parse(notes)
    if (Array.isArray(parsed)) return parsed
    if (typeof parsed === "string") return [{ text: parsed, date: "" }]
    return []
  } catch {
    if (notes.trim()) return [{ text: notes, date: "" }]
    return []
  }
}

// POST /api/prospects/[id]/compose-email — Generate a draft email from notes + POV
export const POST = withAuth<{ params: { id: string } }>(async (
  _request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!

  const prospect = await prisma.prospect.findFirst({
    where: { id: params.id, userId },
    select: {
      name: true,
      title: true,
      company: true,
      email: true,
      notes: true,
      povData: true,
    },
  })

  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
  }

  // Build context sections
  const noteEntries = parseNotes(prospect.notes)
  const notesSection = noteEntries.length > 0
    ? noteEntries.map(n => `- ${n.text}`).join("\n")
    : "No notes recorded."

  let povSection = "No point of view data available."
  if (prospect.povData && typeof prospect.povData === "object") {
    const pov = prospect.povData as Record<string, any>
    const lines: string[] = []
    if (pov.opportunity) lines.push(`Opportunity: ${pov.opportunity}`)
    if (pov.industryContext) lines.push(`Industry context: ${pov.industryContext}`)
    if (pov.howToHelp) lines.push(`How we can help: ${pov.howToHelp}`)
    if (pov.angle) lines.push(`Angle: ${pov.angle}`)
    if (pov.whatTheyDo) lines.push(`What they do: ${pov.whatTheyDo}`)
    if (pov.specificIndustry) lines.push(`Specific industry: ${pov.specificIndustry}`)
    if (pov.exampleUseCase) lines.push(`Use case: ${pov.exampleUseCase}`)
    if (lines.length > 0) povSection = lines.join("\n")
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey })

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are a sales professional. Write a concise, personalized outreach email to the prospect below. Use the notes and point of view context to make it relevant. Keep it short (3-4 sentences), human, and end with a clear ask or question.

Prospect: ${prospect.name}${prospect.title ? `, ${prospect.title}` : ""}${prospect.company ? ` at ${prospect.company}` : ""}

Notes from previous interactions:
${notesSection}

Point of view / research:
${povSection}

Return ONLY this JSON (no markdown, no extra text):
{"subject": "...", "body": "..."}`,
      },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  let result: { subject: string; body: string }
  try {
    result = JSON.parse(text)
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0])
    } else {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    }
  }

  return NextResponse.json({
    subject: result.subject,
    body: result.body,
    to: prospect.email || "",
  })
})
