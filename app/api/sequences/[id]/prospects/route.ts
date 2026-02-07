import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// Helper function to create task for a step
async function createTaskForStep(
  step: { id: string; name: string; type: string; taskNotes?: string | null; callScript?: string | null; emailSubject?: string | null; emailBody?: string | null },
  prospect: { id: string; name: string; email: string; phone?: string | null; linkedin?: string | null; company?: string | null; title?: string | null },
  sequence: { id: string; name: string },
  userId: string
) {
  const now = new Date()

  switch (step.type) {
    case 'email':
      await prisma.email.create({
        data: {
          to: prospect.email,
          from: userId,
          subject: step.emailSubject || `Follow up with ${prospect.name}`,
          bodyText: step.emailBody || '',
          bodyHtml: step.emailBody || '',
          prospectId: prospect.id,
          emailType: 'sequence',
          status: 'draft',
          userId,
          metadata: {
            sequenceId: sequence.id,
            sequenceName: sequence.name,
            stepId: step.id,
            stepName: step.name,
          }
        }
      })
      return 'email'

    case 'call':
      await prisma.task.create({
        data: {
          title: `Call: ${prospect.name}`,
          description: step.callScript || `Call ${prospect.name} from sequence "${sequence.name}"`,
          type: 'follow_up',
          status: 'to_do',
          priority: 'high',
          dueDate: now,
          userId,
          contact: {
            prospectId: prospect.id,
            name: prospect.name,
            email: prospect.email,
            phone: prospect.phone,
            company: prospect.company,
            title: prospect.title,
          },
        }
      })
      return 'call'

    case 'linkedin':
      await prisma.task.create({
        data: {
          title: `LinkedIn: ${prospect.name}`,
          description: step.taskNotes || `Reach out to ${prospect.name} on LinkedIn`,
          type: 'linkedin',
          status: 'to_do',
          priority: 'medium',
          dueDate: now,
          userId,
          contact: {
            prospectId: prospect.id,
            name: prospect.name,
            email: prospect.email,
            linkedin: prospect.linkedin,
            company: prospect.company,
            title: prospect.title,
          },
        }
      })
      return 'linkedin'

    case 'task':
      await prisma.task.create({
        data: {
          title: step.name || `Task for ${prospect.name}`,
          description: step.taskNotes || `Complete task for ${prospect.name}`,
          type: 'follow_up',
          status: 'to_do',
          priority: 'medium',
          dueDate: now,
          userId,
          contact: {
            prospectId: prospect.id,
            name: prospect.name,
            email: prospect.email,
            company: prospect.company,
            title: prospect.title,
          },
        }
      })
      return 'task'

    default:
      return null
  }
}

// POST /api/sequences/[id]/prospects - Add prospects to a sequence
export const POST = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    const body = await request.json()
    const { prospectIds } = body // Array of prospect IDs

    if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json({ error: "Prospect IDs are required" }, { status: 400 })
    }

    // Verify sequence belongs to user
    const sequence = await prisma.sequence.findUnique({
      where: {
        id: params.id,
        userId,
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    if (sequence.steps.length === 0) {
      return NextResponse.json({ error: "Cannot add prospects to an empty sequence" }, { status: 400 })
    }

    // Verify all prospects belong to user
    const prospects = await prisma.prospect.findMany({
      where: {
        id: { in: prospectIds },
        userId,
      },
    })

    if (prospects.length !== prospectIds.length) {
      return NextResponse.json({ error: "Some prospects not found" }, { status: 404 })
    }

    // Calculate next action time based on first step delay
    const firstStep = sequence.steps[0]
    const hasNoDelay = firstStep.delayDays === 0 && firstStep.delayHours === 0

    const nextActionAt = new Date()
    nextActionAt.setDate(nextActionAt.getDate() + firstStep.delayDays)
    nextActionAt.setHours(nextActionAt.getHours() + firstStep.delayHours)

    // Add prospects to sequence (skip if already in sequence)
    const prospectSequences = await prisma.$transaction(
      prospectIds.map((prospectId: string) =>
        prisma.prospectSequence.upsert({
          where: {
            prospectId_sequenceId: {
              prospectId,
              sequenceId: params.id,
            }
          },
          update: {
            status: 'active',
            currentStep: 0,
            nextActionAt,
            pausedAt: null,
          },
          create: {
            prospectId,
            sequenceId: params.id,
            currentStep: 0,
            status: 'active',
            nextActionAt,
          },
        })
      )
    )

    // Update prospect status to in_sequence
    await prisma.prospect.updateMany({
      where: {
        id: { in: prospectIds },
      },
      data: {
        status: 'in_sequence',
        sequence: sequence.name,
        sequenceStep: firstStep.name,
      },
    })

    // If first step has no delay, immediately create tasks for it
    let tasksCreated = 0
    if (hasNoDelay && firstStep.type !== 'wait') {
      for (const prospect of prospects) {
        try {
          await createTaskForStep(firstStep, prospect, sequence, userId)
          tasksCreated++
        } catch (error) {
          console.error(`Error creating immediate task for prospect ${prospect.id}:`, error)
        }
      }
    }

    return NextResponse.json({
      added: prospectSequences.length,
      prospectSequences,
      tasksCreated,
    })
  } catch (error: any) {
    console.error("Error adding prospects to sequence:", error)
    return NextResponse.json(
      { error: "Failed to add prospects to sequence" },
      { status: 500 }
    )
  }
})

// GET /api/sequences/[id]/prospects - Get prospects in a sequence
export const GET = withAuth<{ params: { id: string } }>(async (
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

    const prospectSequences = await prisma.prospectSequence.findMany({
      where: {
        sequenceId: params.id,
      },
      include: {
        prospect: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ prospects: prospectSequences })
  } catch (error: any) {
    console.error("Error fetching prospects in sequence:", error)
    return NextResponse.json(
      { error: "Failed to fetch prospects" },
      { status: 500 }
    )
  }
})
