import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// PATCH /api/sequences/[id]/steps/[stepId] - Update a step
export const PATCH = withAuth<{ params: { id: string; stepId: string } }>(async (
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
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    // Verify step belongs to sequence
    const existingStep = await prisma.sequenceStep.findUnique({
      where: {
        id: params.stepId,
      },
    })

    if (!existingStep || existingStep.sequenceId !== params.id) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 })
    }

    const updatedStep = await prisma.sequenceStep.update({
      where: {
        id: params.stepId,
      },
      data: {
        type,
        name,
        delayDays,
        delayHours,
        emailSubject,
        emailBody,
        callScript,
        taskNotes,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ step: updatedStep })
  } catch (error: any) {
    console.error("Error updating step:", error)
    return NextResponse.json(
      { error: "Failed to update step" },
      { status: 500 }
    )
  }
})

// DELETE /api/sequences/[id]/steps/[stepId] - Delete a step
export const DELETE = withAuth<{ params: { id: string; stepId: string } }>(async (
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

    // Verify step belongs to sequence
    const existingStep = await prisma.sequenceStep.findUnique({
      where: {
        id: params.stepId,
      },
    })

    if (!existingStep || existingStep.sequenceId !== params.id) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 })
    }

    await prisma.sequenceStep.delete({
      where: {
        id: params.stepId,
      },
    })

    // Reorder remaining steps
    const remainingSteps = await prisma.sequenceStep.findMany({
      where: { sequenceId: params.id },
      orderBy: { order: 'asc' }
    })

    await prisma.$transaction(
      remainingSteps.map((step, index) =>
        prisma.sequenceStep.update({
          where: { id: step.id },
          data: { order: index },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting step:", error)
    return NextResponse.json(
      { error: "Failed to delete step" },
      { status: 500 }
    )
  }
})
