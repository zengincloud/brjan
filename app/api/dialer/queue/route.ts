import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

/**
 * GET /api/dialer/queue
 *
 * Fetches prospects that need to be called from:
 * 1. Tasks with type 'follow_up' that have a prospectId in contact
 * 2. Tasks with descriptions that indicate a call
 * 3. Active prospects in sequences with call steps due
 */
export const GET = withAuth(async (
  request: NextRequest,
  userId: string
) => {
  try {
    const { searchParams } = new URL(request.url)
    const sequenceId = searchParams.get("sequenceId")

    // Get call-related tasks for this user
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ['to_do', 'in_progress'] },
        OR: [
          // Tasks created by sequence call steps
          {
            title: { startsWith: 'Call:' }
          },
          // Tasks with type that indicates calls
          {
            type: 'follow_up',
            contact: { not: null }
          }
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'asc' }
      ],
      take: 50
    })

    // Transform tasks into dialer queue items
    const queueItems = []

    for (const task of tasks) {
      const contact = task.contact as any
      if (!contact?.phone && !contact?.prospectId) continue

      // If we have a prospectId, fetch the full prospect data
      let prospect = null
      if (contact?.prospectId) {
        prospect = await prisma.prospect.findUnique({
          where: { id: contact.prospectId },
          include: {
            prospectSequences: {
              where: { status: 'active' },
              include: {
                sequence: {
                  select: {
                    id: true,
                    name: true,
                    steps: {
                      orderBy: { order: 'asc' },
                      select: {
                        id: true,
                        name: true,
                        type: true,
                        order: true,
                        callScript: true
                      }
                    }
                  }
                }
              }
            }
          }
        })
      }

      // Filter by sequence if specified
      if (sequenceId && sequenceId !== 'all') {
        const hasSequence = prospect?.prospectSequences?.some(
          ps => ps.sequenceId === sequenceId
        )
        if (!hasSequence) continue
      }

      // Get sequence info
      const activeSequence = prospect?.prospectSequences?.[0]
      const sequence = activeSequence?.sequence
      const currentStep = sequence?.steps?.[activeSequence?.currentStep || 0]

      queueItems.push({
        id: task.id,
        taskId: task.id,
        prospectId: contact?.prospectId || null,
        name: contact?.name || prospect?.name || 'Unknown',
        company: contact?.company || prospect?.company || '',
        phone: contact?.phone || prospect?.phone || '',
        title: contact?.title || prospect?.title || '',
        email: contact?.email || prospect?.email || '',
        linkedin: contact?.linkedin || prospect?.linkedin || null,

        // Sequence info
        sequence: sequence?.name || null,
        sequenceId: sequence?.id || null,
        sequenceStage: currentStep?.name || task.title || '',
        callScript: currentStep?.callScript || task.description || '',

        // Prior activity
        priorCalls: [], // Could be fetched separately if needed
        lastEmailSent: null,

        // Task info
        priority: task.priority,
        dueDate: task.dueDate,
        status: task.status,
      })
    }

    // Also get prospects with active call steps (include all active, not just due)
    const prospectsWithCallSteps = await prisma.prospectSequence.findMany({
      where: {
        status: 'active',
        sequence: {
          userId,
          status: 'active',
          ...(sequenceId && sequenceId !== 'all' ? { id: sequenceId } : {}),
        },
        // Include all active sequences - don't filter by nextActionAt
        // so we don't miss prospects whose call step just became active
      },
      include: {
        prospect: true,
        sequence: {
          include: {
            steps: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    })

    // Add prospects whose current step is a call
    for (const ps of prospectsWithCallSteps) {
      const currentStep = ps.sequence.steps[ps.currentStep]
      if (currentStep?.type !== 'call') continue

      // Check if already in queue (has a task)
      const alreadyInQueue = queueItems.some(
        item => item.prospectId === ps.prospectId
      )
      if (alreadyInQueue) continue

      queueItems.push({
        id: `ps-${ps.id}`,
        taskId: null,
        prospectId: ps.prospectId,
        name: ps.prospect.name,
        company: ps.prospect.company || '',
        phone: ps.prospect.phone || '',
        title: ps.prospect.title || '',
        email: ps.prospect.email,
        linkedin: ps.prospect.linkedin || null,

        // Sequence info
        sequence: ps.sequence.name,
        sequenceId: ps.sequenceId,
        sequenceStage: currentStep.name,
        callScript: currentStep.callScript || '',

        // Prior activity
        priorCalls: [],
        lastEmailSent: null,

        // Task info
        priority: 'high',
        dueDate: ps.nextActionAt,
        status: 'to_do',
      })
    }

    return NextResponse.json({
      queue: queueItems,
      total: queueItems.length
    })
  } catch (error: any) {
    console.error("Error fetching dialer queue:", error)
    return NextResponse.json(
      { error: "Failed to fetch dialer queue" },
      { status: 500 }
    )
  }
})
