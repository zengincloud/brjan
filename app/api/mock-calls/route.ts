import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { checkCredits, deductCredits } from "@/lib/credits"

export const dynamic = "force-dynamic"

const MOCK_CALL_CREDIT_COST = 2
const FREE_CALLS_WARNING_THRESHOLD = 5

// GET /api/mock-calls - Get user's mock call history + stats
export const GET = withAuth(async (_request: NextRequest, userId: string) => {
  const mockCalls = await prisma.mockCall.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      difficulty: true,
      character: true,
      score: true,
      status: true,
      createdAt: true,
    },
  })

  const completedCount = mockCalls.filter((c) => c.status === "completed").length
  const showWarning = completedCount >= FREE_CALLS_WARNING_THRESHOLD

  return NextResponse.json({ mockCalls, completedCount, showWarning })
})

// POST /api/mock-calls - Start a new mock call session
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  const body = await request.json()
  const { difficulty, character } = body

  if (!difficulty || !character) {
    return NextResponse.json({ error: "difficulty and character are required" }, { status: 400 })
  }

  const creditCheck = await checkCredits(userId, MOCK_CALL_CREDIT_COST)
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { error: creditCheck.error, creditsRemaining: creditCheck.creditsRemaining },
      { status: 402 }
    )
  }

  // Get the opening line from the character definition
  const openingLine = getCharacterOpener(character)

  const mockCall = await prisma.mockCall.create({
    data: {
      userId,
      difficulty,
      character,
      messages: [{ role: "prospect", content: openingLine }],
    },
  })

  await deductCredits(userId, MOCK_CALL_CREDIT_COST)

  // Check if they've hit the warning threshold after this call
  const completedCount = await prisma.mockCall.count({
    where: { userId, status: "completed" },
  })
  const showWarning = completedCount >= FREE_CALLS_WARNING_THRESHOLD - 1

  return NextResponse.json({ mockCall, showWarning })
})

function getCharacterOpener(character: string): string {
  const openers: Record<string, string> = {
    mike_reynolds: "Yeah, hello?",
    jessica_park: "Jessica Park.",
    derek_walsh: "Walsh.",
  }
  return openers[character] ?? "Hello?"
}
