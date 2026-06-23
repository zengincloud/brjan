import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import OpenAI from "openai"

export const dynamic = "force-dynamic"

export const POST = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!

  const meeting = await prisma.meeting.findUnique({
    where: { id: params.id, userId },
    include: {
      prospect: { select: { name: true, email: true, company: true, title: true } },
      account: { select: { name: true } },
    },
  })

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
  }

  if (!meeting.summary) {
    return NextResponse.json({ error: "Meeting summary not ready yet" }, { status: 400 })
  }

  const grokKey = process.env.GROK_API_KEY
  if (!grokKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
  }

  const grok = new OpenAI({ apiKey: grokKey, baseURL: "https://api.x.ai/v1" })
  const prospectName = meeting.prospect?.name || "the prospect"
  const prospectCompany = meeting.prospect?.company || meeting.account?.name || ""
  const actionItems = (meeting.actionItems as string[] | null) || []

  const response = await grok.chat.completions.create({
    model: "grok-3-mini-fast",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Draft a short follow-up email (2-3 sentences, casual and professional) from Sadid to ${prospectName}${prospectCompany ? ` at ${prospectCompany}` : ""}. Reference the meeting and any next steps.

Meeting summary: ${meeting.summary}
Action items: ${actionItems.join("; ") || "none"}

JSON only: {"emailSubject": "...", "emailBody": "..."}`,
      },
    ],
  })

  const text = response.choices[0]?.message?.content || ""

  let result: { emailSubject: string; emailBody: string }
  try {
    result = JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    result = JSON.parse(match[0])
  }

  return NextResponse.json({
    emailSubject: result.emailSubject,
    emailBody: result.emailBody,
    prospectEmail: meeting.prospect?.email || "",
    prospectName,
  })
})
