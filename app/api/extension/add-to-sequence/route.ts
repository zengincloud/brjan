import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withExtensionAuth } from "@/lib/auth/extension-middleware"

export const dynamic = 'force-dynamic'

// POST /api/extension/add-to-sequence
// Adds a prospect to a sequence. Accepts prospectId and sequenceId.
export const POST = withExtensionAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { prospectId, sequenceId } = body

    if (!prospectId || !sequenceId) {
      return NextResponse.json(
        { error: "prospectId and sequenceId are required" },
        { status: 400 }
      )
    }

    // Verify sequence belongs to user and has steps
    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId, userId },
      include: {
        steps: { orderBy: { order: "asc" } },
      },
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    if (sequence.steps.length === 0) {
      return NextResponse.json(
        { error: "Cannot add prospect to an empty sequence" },
        { status: 400 }
      )
    }

    // Verify prospect belongs to user
    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId, userId },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    // Calculate next action time based on first step delay
    const firstStep = sequence.steps[0]
    const hasNoDelay = firstStep.delayDays === 0 && firstStep.delayHours === 0

    const nextActionAt = new Date()
    nextActionAt.setDate(nextActionAt.getDate() + firstStep.delayDays)
    nextActionAt.setHours(nextActionAt.getHours() + firstStep.delayHours)

    // For call steps, override to now so they appear in dialer immediately
    const effectiveNextActionAt = firstStep.type === 'call' ? new Date() : nextActionAt

    // Upsert into ProspectSequence
    const prospectSequence = await prisma.prospectSequence.upsert({
      where: {
        prospectId_sequenceId: { prospectId, sequenceId },
      },
      update: {
        status: "active",
        currentStep: 0,
        nextActionAt: effectiveNextActionAt,
        pausedAt: null,
      },
      create: {
        prospectId,
        sequenceId,
        currentStep: 0,
        status: "active",
        nextActionAt: effectiveNextActionAt,
      },
    })

    // Update prospect status
    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        status: "in_sequence",
        sequence: sequence.name,
        sequenceStep: firstStep.name,
      },
    })

    // Create tasks immediately for non-wait steps with no delay, or for call steps (always)
    let taskCreated = false
    const shouldCreateImmediately = firstStep.type !== 'wait' && (hasNoDelay || firstStep.type === 'call')
    if (shouldCreateImmediately) {
      try {
        const now = new Date()
        switch (firstStep.type) {
          case 'email':
            await prisma.email.create({
              data: {
                to: prospect.email,
                from: userId,
                subject: firstStep.emailSubject || `Follow up with ${prospect.name}`,
                bodyText: firstStep.emailBody || '',
                bodyHtml: firstStep.emailBody || '',
                prospectId: prospect.id,
                emailType: 'sequence',
                status: 'draft',
                userId,
                metadata: {
                  sequenceId: sequence.id,
                  sequenceName: sequence.name,
                  stepId: firstStep.id,
                  stepName: firstStep.name,
                }
              }
            })
            taskCreated = true
            break

          case 'call':
            await prisma.task.create({
              data: {
                title: `Call: ${prospect.name}`,
                description: firstStep.callScript || `Call ${prospect.name} from sequence "${sequence.name}"`,
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
                  sequenceId: sequence.id,
                  sequenceName: sequence.name,
                  stepId: firstStep.id,
                  stepName: firstStep.name,
                  stepType: firstStep.type,
                },
              }
            })
            taskCreated = true
            break

          case 'linkedin':
            await prisma.task.create({
              data: {
                title: `LinkedIn: ${prospect.name}`,
                description: firstStep.taskNotes || `Reach out to ${prospect.name} on LinkedIn from sequence "${sequence.name}"`,
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
                  sequenceId: sequence.id,
                  sequenceName: sequence.name,
                  stepId: firstStep.id,
                  stepName: firstStep.name,
                  stepType: firstStep.type,
                },
              }
            })
            taskCreated = true
            break

          case 'task':
            await prisma.task.create({
              data: {
                title: firstStep.name || `Task for ${prospect.name}`,
                description: firstStep.taskNotes || `Complete task for ${prospect.name} from sequence "${sequence.name}"`,
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
                  sequenceId: sequence.id,
                  sequenceName: sequence.name,
                  stepId: firstStep.id,
                  stepName: firstStep.name,
                  stepType: firstStep.type,
                },
              }
            })
            taskCreated = true
            break
        }
      } catch (error) {
        console.error(`Extension: error creating immediate task for prospect ${prospect.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      prospectSequence,
      sequenceName: sequence.name,
      taskCreated,
    })
  } catch (error: any) {
    console.error("Extension add-to-sequence error:", error)
    return NextResponse.json(
      { error: "Failed to add prospect to sequence" },
      { status: 500 }
    )
  }
})
