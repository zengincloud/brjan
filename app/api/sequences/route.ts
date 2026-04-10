import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { TRIAL_LIMITS } from "@/lib/trial-limits"

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

    // Trial plan: enforce 1-sequence limit
    const seqUser = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true } })
    if (seqUser?.tier === 'trial') {
      const seqCount = await prisma.sequence.count({ where: { userId } })
      if (seqCount >= TRIAL_LIMITS.sequences) {
        return NextResponse.json(
          { error: "You've run out of credits. Trial plan allows 1 sequence. Upgrade your plan for more." },
          { status: 403 }
        )
      }
    }

    // Create sequence with steps — default to active
    const sequence = await prisma.sequence.create({
      data: {
        name,
        description,
        status: "active",
        isActive: true,
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

    // Calculate stats for all sequences in a single query (avoids N+1)
    const sequenceIds = sequences.map(s => s.id)
    const statsRows = sequenceIds.length > 0
      ? await prisma.prospectSequence.groupBy({
          by: ['sequenceId', 'status'],
          where: { sequenceId: { in: sequenceIds } },
          _count: { id: true },
        })
      : []

    // Build a lookup map: sequenceId -> stats
    const statsMap: Record<string, { active: number; completed: number; paused: number; failed: number; total: number }> = {}
    for (const row of statsRows) {
      if (!statsMap[row.sequenceId]) {
        statsMap[row.sequenceId] = { active: 0, completed: 0, paused: 0, failed: 0, total: 0 }
      }
      const entry = statsMap[row.sequenceId]
      const count = row._count.id
      entry.total += count
      if (row.status === 'active') entry.active = count
      else if (row.status === 'completed') entry.completed = count
      else if (row.status === 'paused') entry.paused = count
      else if (row.status === 'failed') entry.failed = count
    }

    const sequencesWithStats = sequences.map(sequence => ({
      ...sequence,
      stats: statsMap[sequence.id] || { active: 0, completed: 0, paused: 0, failed: 0, total: 0 },
    }))

    return NextResponse.json({ sequences: sequencesWithStats })
  } catch (error: any) {
    console.error("Error fetching sequences:", error)
    return NextResponse.json(
      { error: "Failed to fetch sequences" },
      { status: 500 }
    )
  }
})
