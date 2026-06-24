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
  try {
    const call = await prisma.call.findUnique({
      where: { id: params.id, userId },
      include: {
        prospect: {
          select: { name: true, title: true, email: true, company: true },
        },
      },
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

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
      return NextResponse.json({ error: "No transcription available" }, { status: 400 })
    }

    const grokKey = process.env.GROK_API_KEY
    if (!grokKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    const grok = new OpenAI({ apiKey: grokKey, baseURL: "https://api.x.ai/v1" })
    const callerName = "Sadid"
    const prospectName = call.prospect?.name || "the prospect"
    const prospectCompany = call.prospect?.company || ""

    const response = await grok.chat.completions.create({
      model: "grok-3-mini-fast",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Draft a short follow-up email (2-3 sentences max, casual and professional) from ${callerName} to ${prospectName}${prospectCompany ? ` at ${prospectCompany}` : ""}. Reference specific things discussed. Include a clear next step if one was established.

Transcript:
${transcriptText}

JSON only:
{"emailSubject": "...", "emailBody": "..."}`,
        },
      ],
    })

    const text = response.choices[0]?.message?.content || ""

    let result
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
      emailSubject: result.emailSubject,
      emailBody: result.emailBody,
      prospectEmail: call.prospect?.email || "",
      prospectName,
    })
  } catch (error) {
    console.error("Error drafting email:", error)
    return NextResponse.json({ error: "Failed to draft email" }, { status: 500 })
  }
})
