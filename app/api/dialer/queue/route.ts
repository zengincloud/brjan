import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { formatDistanceToNow } from "date-fns"

export const dynamic = 'force-dynamic'

/**
 * GET /api/dialer/queue
 *
 * Fetches prospects that need to be called from:
 * 1. Tasks with type 'follow_up' that have a prospectId in contact
 * 2. Tasks with descriptions that indicate a call
 * 3. Active prospects in sequences with call steps due
 *
 * Also enriches each prospect with:
 * - Prior call history
 * - Correspondence history (emails + calls)
 * - Matched Account data (insights, POV, industry)
 * - Prospect POV data
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

    // Transform tasks into dialer queue items (basic info first)
    const queueItems: any[] = []
    const seenProspectIds = new Set<string>()

    // Collect all prospect IDs from tasks, then batch-fetch them in one query
    const taskProspectIds: string[] = []
    for (const task of tasks) {
      const contact = task.contact as any
      if (contact?.prospectId) taskProspectIds.push(contact.prospectId)
    }

    const prospectMap = new Map<string, any>()
    if (taskProspectIds.length > 0) {
      const prospects = await prisma.prospect.findMany({
        where: { id: { in: taskProspectIds } },
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
      for (const p of prospects) {
        prospectMap.set(p.id, p)
      }
    }

    for (const task of tasks) {
      const contact = task.contact as any
      if (!contact?.phone && !contact?.prospectId) continue

      // Skip duplicate prospects (multiple tasks for same person)
      if (contact?.prospectId && seenProspectIds.has(contact.prospectId)) continue
      if (contact?.prospectId) seenProspectIds.add(contact.prospectId)

      const prospect = contact?.prospectId ? prospectMap.get(contact.prospectId) || null : null

      // Filter by sequence if specified
      if (sequenceId && sequenceId !== 'all') {
        const hasSequence = prospect?.prospectSequences?.some(
          (ps: any) => ps.sequenceId === sequenceId
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
        location: prospect?.location || null,
        timezone: prospect?.timezone || null,
        companyDescription: (prospect?.wizaData as any)?.companyDescription || null,
        prospectNotes: prospect?.notes || null,

        // Sequence info
        sequence: sequence?.name || null,
        sequenceId: sequence?.id || null,
        sequenceStage: currentStep?.name || '',
        callScript: currentStep?.callScript || task.description || '',

        // POV from prospect
        pov: prospect?.povData || null,

        // Placeholders — will be enriched below
        priorCalls: [],
        lastEmailSent: null,
        correspondenceHistory: [],
        accountInfo: null,

        // Task info
        priority: task.priority,
        dueDate: task.dueDate,
        addedAt: task.createdAt,
        status: task.status,
      })
    }

    // Also get prospects with active call steps in sequences
    // Don't filter by nextActionAt — if the current step is a call, it should be in the dialer
    const prospectsWithCallSteps = await prisma.prospectSequence.findMany({
      where: {
        status: 'active',
        sequence: {
          userId,
          status: 'active',
          ...(sequenceId && sequenceId !== 'all' ? { id: sequenceId } : {}),
        },
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

    // Build a set of prospect IDs already in the queue for fast dedup
    const queuedProspectIds = new Set(
      queueItems.map(item => item.prospectId).filter(Boolean)
    )

    // Add prospects whose current step is a call
    for (const ps of prospectsWithCallSteps) {
      const currentStep = ps.sequence.steps[ps.currentStep]
      if (currentStep?.type !== 'call') continue

      // Check if already in queue (has a task)
      if (queuedProspectIds.has(ps.prospectId)) continue

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
        location: ps.prospect.location || null,
        timezone: ps.prospect.timezone || null,
        companyDescription: (ps.prospect.wizaData as any)?.companyDescription || null,
        prospectNotes: ps.prospect.notes || null,

        // Sequence info
        sequence: ps.sequence.name,
        sequenceId: ps.sequenceId,
        sequenceStage: currentStep.name,
        callScript: currentStep.callScript || '',

        // POV from prospect
        pov: ps.prospect.povData || null,

        // Placeholders
        priorCalls: [],
        lastEmailSent: null,
        correspondenceHistory: [],
        accountInfo: null,

        // Task info
        priority: 'high',
        dueDate: ps.nextActionAt,
        addedAt: ps.startedAt || ps.createdAt,
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

function safeTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return 'Unknown'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return 'Unknown'
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}
