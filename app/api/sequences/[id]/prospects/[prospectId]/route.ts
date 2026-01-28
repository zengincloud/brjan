import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// DELETE /api/sequences/[id]/prospects/[prospectId] - Remove prospect from sequence
export const DELETE = withAuth<{ params: { id: string; prospectId: string } }>(async (
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

    // Verify prospect belongs to user
    const prospect = await prisma.prospect.findUnique({
      where: {
        id: params.prospectId,
        userId,
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    // Remove prospect from sequence
    await prisma.prospectSequence.delete({
      where: {
        prospectId_sequenceId: {
          prospectId: params.prospectId,
          sequenceId: params.id,
        }
      },
    })

    // Update prospect status
    await prisma.prospect.update({
      where: {
        id: params.prospectId,
      },
      data: {
        sequence: null,
        sequenceStep: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error removing prospect from sequence:", error)
    return NextResponse.json(
      { error: "Failed to remove prospect from sequence" },
      { status: 500 }
    )
  }
})

// PATCH /api/sequences/[id]/prospects/[prospectId] - Update prospect sequence status (pause, resume, etc.)
export const PATCH = withAuth<{ params: { id: string; prospectId: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    const body = await request.json()
    const { status } = body

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

    // Verify prospect belongs to user
    const prospect = await prisma.prospect.findUnique({
      where: {
        id: params.prospectId,
        userId,
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    // Update prospect sequence status
    const updateData: any = {
      status,
      updatedAt: new Date(),
    }

    if (status === 'paused') {
      updateData.pausedAt = new Date()
    } else if (status === 'active') {
      updateData.pausedAt = null
    } else if (status === 'completed') {
      updateData.completedAt = new Date()
    } else if (status === 'failed') {
      updateData.failedAt = new Date()
    }

    const prospectSequence = await prisma.prospectSequence.update({
      where: {
        prospectId_sequenceId: {
          prospectId: params.prospectId,
          sequenceId: params.id,
        }
      },
      data: updateData,
    })

    return NextResponse.json({ prospectSequence })
  } catch (error: any) {
    console.error("Error updating prospect sequence:", error)
    return NextResponse.json(
      { error: "Failed to update prospect sequence" },
      { status: 500 }
    )
  }
})
