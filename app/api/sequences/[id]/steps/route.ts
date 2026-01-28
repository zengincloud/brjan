import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// POST /api/sequences/[id]/steps - Add a step to a sequence
export const POST = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    const body = await request.json()
    const { type, name, delayDays, delayHours, emailSubject, emailBody, callScript, taskNotes } = body

    // Verify sequence belongs to user
    const sequence = await prisma.sequence.findUnique({
      where: {
        id: params.id,
        userId,
      },
      include: {
        steps: true,
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    // Get the next order number
    const maxOrder = sequence.steps.length > 0
      ? Math.max(...sequence.steps.map(s => s.order))
      : -1

    const step = await prisma.sequenceStep.create({
      data: {
        sequenceId: params.id,
        type,
        name,
        order: maxOrder + 1,
        delayDays: delayDays || 0,
        delayHours: delayHours || 0,
        emailSubject,
        emailBody,
        callScript,
        taskNotes,
      },
    })

    return NextResponse.json({ step })
  } catch (error: any) {
    console.error("Error creating step:", error)
    return NextResponse.json(
      { error: "Failed to create step" },
      { status: 500 }
    )
  }
})

// PUT /api/sequences/[id]/steps - Reorder all steps
export const PUT = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    const body = await request.json()
    const { steps } = body // Array of { id, order }

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

    // Update all steps in a transaction
    await prisma.$transaction(
      steps.map((step: { id: string; order: number }) =>
        prisma.sequenceStep.update({
          where: { id: step.id },
          data: { order: step.order },
        })
      )
    )

    const updatedSteps = await prisma.sequenceStep.findMany({
      where: { sequenceId: params.id },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ steps: updatedSteps })
  } catch (error: any) {
    console.error("Error reordering steps:", error)
    return NextResponse.json(
      { error: "Failed to reorder steps" },
      { status: 500 }
    )
  }
})
