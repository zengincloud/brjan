import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { checkCredits, deductCredits } from "@/lib/credits"

export const dynamic = "force-dynamic"

// GET /api/mock-calls - Get user's mock call history + stats
export const GET = withAuth(async (_request: NextRequest, userId: string) => {
  const mockCalls = await prisma.mockCall.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      difficulty: true,
      character: true,
      whatYouSell: true,
      score: true,
      feedback: true,
      scoringBreakdown: true,
      status: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ mockCalls })
})

// POST /api/mock-calls - Start a new mock call session
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  const body = await request.json()
  const { difficulty, character, whatYouSell } = body

  if (!difficulty || !character) {
    return NextResponse.json({ error: "difficulty and character are required" }, { status: 400 })
  }

  const creditCheck = await checkCredits(userId, "mock_call")
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
      whatYouSell: whatYouSell?.trim() || null,
      messages: [{ role: "prospect", content: openingLine }],
    },
  })

  await deductCredits(userId, "mock_call")

  return NextResponse.json({ mockCall })
})

function getCharacterOpener(character: string): string {
  const openers: Record<string, string> = {
    mike_reynolds: "Hello, who's this?",
    jessica_park: "Hello, who's this?",
    derek_walsh: "Hello, who's this?",
  }
  return openers[character] ?? "Hello?"
}
