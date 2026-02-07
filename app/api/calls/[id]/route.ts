import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { advanceSequenceStep } from "@/lib/sequences"

export const dynamic = 'force-dynamic'

// PATCH /api/calls/[id] - Update call outcome and notes
export const PATCH = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!;
  try {
    const body = await request.json()
    const { outcome, notes, duration, endedAt, twilioSid, status, startedAt } = body

    const call = await prisma.call.findUnique({
      where: {
        id: params.id,
        userId,
      },
      include: {
        prospect: {
          include: {
            prospectSequences: {
              where: { status: 'active' },
              include: {
                sequence: {
                  include: {
                    steps: { orderBy: { order: 'asc' } }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (outcome) updateData.outcome = outcome
    if (notes !== undefined) updateData.notes = notes
    if (duration !== undefined) updateData.duration = duration
    if (endedAt) updateData.endedAt = new Date(endedAt)
    if (twilioSid) updateData.twilioSid = twilioSid
    if (status) updateData.status = status
    if (startedAt) updateData.startedAt = new Date(startedAt)

    // If we have an outcome, mark as completed
    if (outcome) {
      updateData.status = "completed"
    }

    // Update call with outcome, notes, duration, and completion status
    const updatedCall = await prisma.call.update({
      where: {
        id: params.id,
        userId,
      },
      data: updateData,
    })

    // If call completed with an outcome and prospect is in a sequence, advance the sequence
    let sequenceAdvanced = null
    if (outcome && call.prospectId && call.prospect?.prospectSequences?.length) {
      const activeSequence = call.prospect.prospectSequences[0]
      const currentStep = activeSequence.sequence.steps[activeSequence.currentStep]

      // Only advance if current step is a call step
      if (currentStep?.type === 'call') {
        console.log(`Call completed for prospect ${call.prospectId} in sequence ${activeSequence.sequence.name}, advancing...`)

        const advanceResult = await advanceSequenceStep(
          call.prospectId,
          activeSequence.sequenceId,
          userId
        )

        if (advanceResult.success) {
          sequenceAdvanced = {
            completed: advanceResult.completed,
            nextStep: advanceResult.nextStep,
          }
          console.log(`Sequence advanced:`, advanceResult)
        } else {
          console.error(`Failed to advance sequence:`, advanceResult.error)
        }
      }
    }

    return NextResponse.json({ call: updatedCall, sequenceAdvanced })
  } catch (error: any) {
    console.error("Error updating call:", error)
    return NextResponse.json(
      { error: "Failed to update call" },
      { status: 500 }
    )
  }
})

// GET /api/calls/[id] - Get call details
export const GET = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!;
  try {
    const call = await prisma.call.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    return NextResponse.json({ call })
  } catch (error: any) {
    console.error("Error fetching call:", error)
    return NextResponse.json(
      { error: "Failed to fetch call" },
      { status: 500 }
    )
  }
})
