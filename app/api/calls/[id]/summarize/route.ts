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
          select: { name: true, title: true, email: true, phone: true, company: true },
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
      return NextResponse.json({ error: "No transcription available for this call" }, { status: 400 })
    }

    const grokKey = process.env.GROK_API_KEY
    if (!grokKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    const grok = new OpenAI({ apiKey: grokKey, baseURL: "https://api.x.ai/v1" })
    const callerName = "Sadid"
    const prospectName = call.prospect?.name || "the prospect"

    const response = await grok.chat.completions.create({
      model: "grok-3-mini-fast",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Quick bullet-point summary of this sales call. Each bullet = one thing that happened. Be blunt and direct, no fluff.

Example: "${callerName} called John. John said they already use a competitor. ${callerName} pitched ROI angle. John asked to send info via email. No next meeting booked."

Transcript:
${transcriptText}

Return ONLY the summary text, no JSON, no formatting.`,
        },
      ],
    })

    const summary = response.choices[0]?.message?.content?.trim() || ""

    return NextResponse.json({
      summary,
      callId: call.id,
      prospectEmail: call.prospect?.email || "",
      prospectName,
    })
  } catch (error) {
    console.error("Error generating call summary:", error)
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
  }
})
