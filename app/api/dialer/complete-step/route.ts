import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/complete-step
 *
 * After a call is completed in the dialer, advance the prospect's sequence
 * to the next step so they don't reappear in the queue until the next step is due.
 */
export const POST = withAuth(async (
  request: NextRequest,
  userId: string
) => {
  try {
    const { prospectId, sequenceId } = await request.json()

    if (!prospectId || !sequenceId) {
      return NextResponse.json(
        { error: "prospectId and sequenceId are required" },
        { status: 400 }
      )
    }

    // Find the active prospect sequence
    const ps = await prisma.prospectSequence.findUnique({
      where: {
        prospectId_sequenceId: {
          prospectId,
          sequenceId,
        },
      },
      include: {
        sequence: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })

    if (!ps || ps.sequence.userId !== userId) {
      return NextResponse.json({ error: "Prospect sequence not found" }, { status: 404 })
    }

    if (ps.status !== 'active') {
      return NextResponse.json({ advanced: false, reason: "Sequence is not active" })
    }

    const now = new Date()
    const nextStepIndex = ps.currentStep + 1
    const nextStep = ps.sequence.steps[nextStepIndex]

    if (nextStep) {
      // Calculate next action time based on next step's delay
      const nextActionAt = new Date(now)
      nextActionAt.setDate(nextActionAt.getDate() + nextStep.delayDays)
      nextActionAt.setHours(nextActionAt.getHours() + nextStep.delayHours)

      await prisma.prospectSequence.update({
        where: { id: ps.id },
        data: {
          currentStep: nextStepIndex,
          nextActionAt,
        },
      })

      await prisma.prospect.update({
        where: { id: prospectId },
        data: {
          sequenceStep: nextStep.name,
        },
      })

      return NextResponse.json({
        advanced: true,
        nextStep: nextStep.name,
        nextActionAt,
      })
    } else {
      // No more steps — sequence complete
      await prisma.prospectSequence.update({
        where: { id: ps.id },
        data: {
          status: 'completed',
          completedAt: now,
          nextActionAt: null,
        },
      })

      await prisma.prospect.update({
        where: { id: prospectId },
        data: {
          status: 'contacted',
          sequence: null,
          sequenceStep: null,
        },
      })

      return NextResponse.json({
        advanced: true,
        completed: true,
      })
    }
  } catch (error: any) {
    console.error("Error advancing sequence step:", error)
    return NextResponse.json(
      { error: "Failed to advance sequence step" },
      { status: 500 }
    )
  }
})
