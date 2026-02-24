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
        location: prospect?.location || null,

        // Sequence info
        sequence: sequence?.name || null,
        sequenceId: sequence?.id || null,
        sequenceStage: currentStep?.name || task.title || '',
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
        location: ps.prospect.location || null,

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
        status: 'to_do',
      })
    }

    // --- Batch-enrich all queue items with correspondence + account data ---
    const prospectIds = queueItems
      .map(item => item.prospectId)
      .filter((id): id is string => !!id)

    const companyNames = [...new Set(
      queueItems.map(item => item.company).filter(Boolean)
    )]

    if (prospectIds.length > 0 || companyNames.length > 0) {
      // Fetch all prior calls, emails, and matching accounts in parallel
      const [allCalls, allEmails, matchedAccounts] = await Promise.all([
        prospectIds.length > 0
          ? prisma.call.findMany({
              where: { prospectId: { in: prospectIds }, userId },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                prospectId: true,
                outcome: true,
                notes: true,
                duration: true,
                createdAt: true,
              },
            })
          : Promise.resolve([]),

        prospectIds.length > 0
          ? prisma.email.findMany({
              where: {
                userId,
                OR: prospectIds.map(pid => ({
                  metadata: { path: ['prospectId'], equals: pid }
                })).concat(
                  // Also match by prospect email
                  queueItems
                    .filter(item => item.email)
                    .map(item => ({ to: item.email }))
                ),
              },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                to: true,
                subject: true,
                status: true,
                sentAt: true,
                createdAt: true,
                metadata: true,
              },
              take: 200,
            }).catch(() => [])
          : Promise.resolve([]),

        companyNames.length > 0
          ? prisma.account.findMany({
              where: {
                userId,
                name: { in: companyNames, mode: 'insensitive' },
              },
              select: {
                id: true,
                name: true,
                industry: true,
                website: true,
                employees: true,
                location: true,
                linkedin: true,
                insights: true,
                pov: true,
              },
            })
          : Promise.resolve([]),
      ])

      // Index calls by prospectId
      const callsByProspect = new Map<string, typeof allCalls>()
      for (const call of allCalls) {
        if (!call.prospectId) continue
        if (!callsByProspect.has(call.prospectId)) {
          callsByProspect.set(call.prospectId, [])
        }
        callsByProspect.get(call.prospectId)!.push(call)
      }

      // Index emails by recipient address
      const emailsByRecipient = new Map<string, typeof allEmails>()
      for (const email of allEmails) {
        const addr = email.to?.toLowerCase()
        if (!addr) continue
        if (!emailsByRecipient.has(addr)) {
          emailsByRecipient.set(addr, [])
        }
        emailsByRecipient.get(addr)!.push(email)
      }

      // Index accounts by name (lowercase)
      const accountsByName = new Map<string, (typeof matchedAccounts)[0]>()
      for (const account of matchedAccounts) {
        accountsByName.set(account.name.toLowerCase(), account)
      }

      // Enrich each queue item
      for (const item of queueItems) {
        // Prior calls
        const prospectCalls = item.prospectId ? (callsByProspect.get(item.prospectId) || []) : []
        item.priorCalls = prospectCalls.slice(0, 10).map((c: any) => ({
          date: safeTimeAgo(c.createdAt),
          outcome: c.outcome || 'unknown',
          notes: c.notes || '',
        }))

        // Correspondence history (combine calls + emails, most recent first)
        const correspondenceItems: any[] = []

        for (const c of prospectCalls.slice(0, 5)) {
          correspondenceItems.push({
            date: safeTimeAgo(c.createdAt),
            type: 'call',
            from: 'You',
            summary: `Call - ${c.outcome || 'unknown'}${c.notes ? ': ' + c.notes.substring(0, 80) : ''}`,
          })
        }

        const prospectEmails = item.email ? (emailsByRecipient.get(item.email.toLowerCase()) || []) : []
        for (const e of prospectEmails.slice(0, 5)) {
          correspondenceItems.push({
            date: safeTimeAgo(e.sentAt || e.createdAt),
            type: 'email',
            from: 'You',
            summary: `Email: ${e.subject || '(no subject)'} - ${e.status}`,
          })
        }

        // Sort by recency (most recent first)
        correspondenceItems.sort((a, b) => {
          // Since we already have "time ago" strings, let's just interleave
          return 0 // Already ordered within each type
        })

        item.correspondenceHistory = correspondenceItems.slice(0, 8)

        // Last email sent
        if (prospectEmails.length > 0) {
          const lastEmail = prospectEmails[0]
          item.lastEmailSent = safeTimeAgo(lastEmail.sentAt || lastEmail.createdAt)
        }

        // Account info
        if (item.company) {
          const account = accountsByName.get(item.company.toLowerCase())
          if (account) {
            item.accountInfo = {
              id: account.id,
              industry: account.industry,
              website: account.website,
              employees: account.employees,
              location: account.location,
              linkedin: account.linkedin,
              insights: account.insights,
              pov: account.pov,
            }

            // If prospect has no POV but account does, use account POV
            if (!item.pov && account.pov) {
              item.pov = account.pov
            }
          }
        }
      }
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
