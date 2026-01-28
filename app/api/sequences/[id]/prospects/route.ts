import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// POST /api/sequences/[id]/prospects - Add prospects to a sequence
export const POST = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    const body = await request.json()
    const { prospectIds } = body // Array of prospect IDs

    if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json({ error: "Prospect IDs are required" }, { status: 400 })
    }

    // Verify sequence belongs to user
    const sequence = await prisma.sequence.findUnique({
      where: {
        id: params.id,
        userId,
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    if (sequence.steps.length === 0) {
      return NextResponse.json({ error: "Cannot add prospects to an empty sequence" }, { status: 400 })
    }

    // Verify all prospects belong to user
    const prospects = await prisma.prospect.findMany({
      where: {
        id: { in: prospectIds },
        userId,
      },
    })

    if (prospects.length !== prospectIds.length) {
      return NextResponse.json({ error: "Some prospects not found" }, { status: 404 })
    }

    // Calculate next action time based on first step delay
    const firstStep = sequence.steps[0]
    const nextActionAt = new Date()
    nextActionAt.setDate(nextActionAt.getDate() + firstStep.delayDays)
    nextActionAt.setHours(nextActionAt.getHours() + firstStep.delayHours)

    // Add prospects to sequence (skip if already in sequence)
    const prospectSequences = await prisma.$transaction(
      prospectIds.map((prospectId: string) =>
        prisma.prospectSequence.upsert({
          where: {
            prospectId_sequenceId: {
              prospectId,
              sequenceId: params.id,
            }
          },
          update: {
            status: 'active',
            currentStep: 0,
            nextActionAt,
            pausedAt: null,
          },
          create: {
            prospectId,
            sequenceId: params.id,
            currentStep: 0,
            status: 'active',
            nextActionAt,
          },
        })
      )
    )

    // Update prospect status to in_sequence
    await prisma.prospect.updateMany({
      where: {
        id: { in: prospectIds },
      },
      data: {
        status: 'in_sequence',
        sequence: sequence.name,
        sequenceStep: firstStep.name,
      },
    })

    return NextResponse.json({
      added: prospectSequences.length,
      prospectSequences
    })
  } catch (error: any) {
    console.error("Error adding prospects to sequence:", error)
    return NextResponse.json(
      { error: "Failed to add prospects to sequence" },
      { status: 500 }
    )
  }
})

// GET /api/sequences/[id]/prospects - Get prospects in a sequence
export const GET = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    // Verify sequence belongs to user
    const sequence = await prisma.sequence.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    const prospectSequences = await prisma.prospectSequence.findMany({
      where: {
        sequenceId: params.id,
      },
      include: {
        prospect: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ prospects: prospectSequences })
  } catch (error: any) {
    console.error("Error fetching prospects in sequence:", error)
    return NextResponse.json(
      { error: "Failed to fetch prospects" },
      { status: 500 }
    )
  }
})
