import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withExtensionAuth } from "@/lib/auth/extension-middleware"

export const dynamic = 'force-dynamic'

// POST /api/extension/add-to-sequence
// Adds a prospect to a sequence. Accepts prospectId and sequenceId.
export const POST = withExtensionAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { prospectId, sequenceId } = body

    if (!prospectId || !sequenceId) {
      return NextResponse.json(
        { error: "prospectId and sequenceId are required" },
        { status: 400 }
      )
    }

    // Verify sequence belongs to user and has steps
    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId, userId },
      include: {
        steps: { orderBy: { order: "asc" } },
      },
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    if (sequence.steps.length === 0) {
      return NextResponse.json(
        { error: "Cannot add prospect to an empty sequence" },
        { status: 400 }
      )
    }

    // Verify prospect belongs to user
    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId, userId },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    // Calculate next action time based on first step delay
    const firstStep = sequence.steps[0]
    const nextActionAt = new Date()
    nextActionAt.setDate(nextActionAt.getDate() + firstStep.delayDays)
    nextActionAt.setHours(nextActionAt.getHours() + firstStep.delayHours)

    // Upsert into ProspectSequence
    const prospectSequence = await prisma.prospectSequence.upsert({
      where: {
        prospectId_sequenceId: { prospectId, sequenceId },
      },
      update: {
        status: "active",
        currentStep: 0,
        nextActionAt,
        pausedAt: null,
      },
      create: {
        prospectId,
        sequenceId,
        currentStep: 0,
        status: "active",
        nextActionAt,
      },
    })

    // Update prospect status
    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        status: "in_sequence",
        sequence: sequence.name,
        sequenceStep: firstStep.name,
      },
    })

    return NextResponse.json({
      success: true,
      prospectSequence,
      sequenceName: sequence.name,
    })
  } catch (error: any) {
    console.error("Extension add-to-sequence error:", error)
    return NextResponse.json(
      { error: "Failed to add prospect to sequence" },
      { status: 500 }
    )
  }
})
