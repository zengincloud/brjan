import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// POST /api/sequences - Create a new sequence
export const POST = withAuth(async (
  request: NextRequest,
  userId: string
) => {
  try {
    const body = await request.json()
    const { name, description, steps } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Create sequence with steps
    const sequence = await prisma.sequence.create({
      data: {
        name,
        description,
        userId,
        steps: steps ? {
          create: steps.map((step: any, index: number) => ({
            type: step.type,
            name: step.name,
            order: index,
            delayDays: step.delayDays || 0,
            delayHours: step.delayHours || 0,
            emailSubject: step.emailSubject,
            emailBody: step.emailBody,
            callScript: step.callScript,
            taskNotes: step.taskNotes,
          }))
        } : undefined,
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            prospectSequences: true,
            accountSequences: true,
          }
        }
      }
    })

    return NextResponse.json({ sequence })
  } catch (error: any) {
    console.error("Error creating sequence:", error)
    return NextResponse.json(
      { error: "Failed to create sequence" },
      { status: 500 }
    )
  }
})

// GET /api/sequences - List all sequences
export const GET = withAuth(async (
  request: NextRequest,
  userId: string
) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const sequences = await prisma.sequence.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            prospectSequences: {
              where: { status: "active" }
            },
            accountSequences: {
              where: { status: "active" }
            },
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate stats for each sequence
    const sequencesWithStats = await Promise.all(
      sequences.map(async (sequence) => {
        const prospectSequences = await prisma.prospectSequence.findMany({
          where: { sequenceId: sequence.id }
        })

        const activeCount = prospectSequences.filter(ps => ps.status === 'active').length
        const completedCount = prospectSequences.filter(ps => ps.status === 'completed').length
        const pausedCount = prospectSequences.filter(ps => ps.status === 'paused').length
        const failedCount = prospectSequences.filter(ps => ps.status === 'failed').length

        return {
          ...sequence,
          stats: {
            active: activeCount,
            completed: completedCount,
            paused: pausedCount,
            failed: failedCount,
            total: prospectSequences.length,
          }
        }
      })
    )

    return NextResponse.json({ sequences: sequencesWithStats })
  } catch (error: any) {
    console.error("Error fetching sequences:", error)
    return NextResponse.json(
      { error: "Failed to fetch sequences" },
      { status: 500 }
    )
  }
})
