import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"

export const POST = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    const call = await prisma.call.findUnique({
      where: { id: params.id, userId },
      include: {
        prospect: {
          select: { name: true, title: true, email: true, phone: true, company: true },
        },
      },
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    // Get transcription text
    let transcriptText = ""
    if (call.transcription) {
      try {
        const parsed = JSON.parse(call.transcription)
        // If it's a formatted transcript object, extract the full text
        transcriptText = parsed.fullText || parsed.text || call.transcription
      } catch {
        transcriptText = call.transcription
      }
    }

    if (!transcriptText) {
      return NextResponse.json({ error: "No transcription available for this call" }, { status: 400 })
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey })

    const prospectName = call.prospect?.name || "the prospect"
    const prospectTitle = call.prospect?.title || ""
    const prospectCompany = call.prospect?.company || ""
    const prospectEmail = call.prospect?.email || ""
    const callerName = "Sadid"

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `You are a sales assistant. Based on this call transcript, provide two things:

1. A brief call summary (2-3 sentences max). Format: "${callerName} spoke with [name]. [What was discussed]. [Outcome/next steps]."

2. A short follow-up email draft from ${callerName} to ${prospectName}. Keep it casual and professional — 3-5 sentences max. Reference specific things discussed. Include a clear next step if one was established.

Prospect info:
- Name: ${prospectName}
- Title: ${prospectTitle}
- Company: ${prospectCompany}

Call transcript:
${transcriptText}

Respond in this exact JSON format:
{
  "summary": "...",
  "emailSubject": "...",
  "emailBody": "..."
}

Only output the JSON, nothing else.`,
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""

    let result
    try {
      result = JSON.parse(text)
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
      }
    }

    return NextResponse.json({
      summary: result.summary,
      emailSubject: result.emailSubject,
      emailBody: result.emailBody,
      prospectEmail,
      prospectName,
    })
  } catch (error) {
    console.error("Error generating call summary:", error)
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
  }
})
