import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"

type Message = { role: "user" | "prospect"; content: string }

type ScoringCriterion = {
  passed: boolean
  points: number
  maxPoints: number
  note: string
}

type ScoringBreakdown = {
  opener: ScoringCriterion
  permission: ScoringCriterion
  value_prop: ScoringCriterion
  discovery: ScoringCriterion
  objection_handling: ScoringCriterion
  close: ScoringCriterion
}

export const POST = withAuth<{ params: { id: string } }>(
  async (request: NextRequest, userId: string, context) => {
    const { id } = context!.params

    const mockCall = await prisma.mockCall.findUnique({
      where: { id, userId },
    })

    if (!mockCall) {
      return NextResponse.json({ error: "Mock call not found" }, { status: 404 })
    }

    if (mockCall.status === "completed") {
      return NextResponse.json({
        score: mockCall.score,
        feedback: mockCall.feedback,
        scoringBreakdown: mockCall.scoringBreakdown,
      })
    }

    const messages = (mockCall.messages as Message[]) ?? []
    const userMessages = messages.filter((m) => m.role === "user")

    if (userMessages.length < 1) {
      // Call ended with no user input — minimal score
      await prisma.mockCall.update({
        where: { id },
        data: { status: "completed", score: 0, feedback: "The call ended before you said anything." },
      })
      return NextResponse.json({ score: 0, feedback: "The call ended before you said anything.", scoringBreakdown: null })
    }

    // Format transcript for evaluation
    const transcript = messages
      .map((m) => `${m.role === "user" ? "CALLER" : "PROSPECT"}: ${m.content}`)
      .join("\n")

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const scoringPrompt = `You are an expert cold call coach evaluating a sales rep's cold call performance.

Analyze this cold call transcript and return a JSON object scoring the caller on 6 criteria.

TRANSCRIPT:
${transcript}

SCORING CRITERIA (score each independently):
1. opener (max 10pts): Did they open with a pattern interrupt or confident hook instead of "How are you?" or a weak intro?
2. permission (max 10pts): Did they ask for the prospect's time or permission early on (e.g. "Did I catch you at a bad time?")?
3. value_prop (max 20pts): Did they state a clear, concise value proposition that leads with a problem, not just product features?
4. discovery (max 20pts): Did they ask at least one genuine discovery question to understand the prospect's situation before pitching?
5. objection_handling (max 20pts): Did they handle at least one objection effectively (not just repeat their pitch or give up)?
6. close (max 20pts): Did they ask for a specific next step — a meeting, a follow-up call, or a concrete commitment?

Return ONLY valid JSON in this exact format, no explanation:
{
  "opener": { "passed": boolean, "points": number, "maxPoints": 10, "note": "short specific note" },
  "permission": { "passed": boolean, "points": number, "maxPoints": 10, "note": "short specific note" },
  "value_prop": { "passed": boolean, "points": number, "maxPoints": 20, "note": "short specific note" },
  "discovery": { "passed": boolean, "points": number, "maxPoints": 20, "note": "short specific note" },
  "objection_handling": { "passed": boolean, "points": number, "maxPoints": 20, "note": "short specific note" },
  "close": { "passed": boolean, "points": number, "maxPoints": 20, "note": "short specific note" },
  "feedback": "2–3 sentence overall coaching note. Be direct and specific. Mention the #1 thing they did well and the #1 thing to fix."
}`

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: scoringPrompt }],
    })

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "{}"

    let parsed: ScoringBreakdown & { feedback: string }
    try {
      // Strip any markdown code fences if present
      const cleaned = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "")
      parsed = JSON.parse(cleaned)
    } catch {
      // Fallback if parsing fails
      parsed = {
        opener: { passed: false, points: 0, maxPoints: 10, note: "Could not evaluate" },
        permission: { passed: false, points: 0, maxPoints: 10, note: "Could not evaluate" },
        value_prop: { passed: false, points: 0, maxPoints: 20, note: "Could not evaluate" },
        discovery: { passed: false, points: 0, maxPoints: 20, note: "Could not evaluate" },
        objection_handling: { passed: false, points: 0, maxPoints: 20, note: "Could not evaluate" },
        close: { passed: false, points: 0, maxPoints: 20, note: "Could not evaluate" },
        feedback: "We weren't able to score this call automatically. Review the transcript above.",
      }
    }

    const score =
      (parsed.opener?.points ?? 0) +
      (parsed.permission?.points ?? 0) +
      (parsed.value_prop?.points ?? 0) +
      (parsed.discovery?.points ?? 0) +
      (parsed.objection_handling?.points ?? 0) +
      (parsed.close?.points ?? 0)

    const { feedback, ...scoringBreakdown } = parsed

    await prisma.mockCall.update({
      where: { id },
      data: {
        status: "completed",
        score,
        feedback,
        scoringBreakdown,
      },
    })

    return NextResponse.json({ score, feedback, scoringBreakdown })
  }
)
