import { prisma } from "@/lib/prisma"
import { replaceEmailVariables } from "@/lib/template-variables"

/**
 * Advance a prospect to the next step in their sequence
 * Creates the appropriate task/email for the next step
 */
export async function advanceSequenceStep(
  prospectId: string,
  sequenceId: string,
  userId: string
): Promise<{
  success: boolean
  nextStep?: { name: string; type: string } | null
  completed?: boolean
  error?: string
}> {
  try {
    // Get the prospect sequence record
    const prospectSequence = await prisma.prospectSequence.findUnique({
      where: {
        prospectId_sequenceId: {
          prospectId,
          sequenceId,
        },
      },
      include: {
        prospect: true,
        sequence: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })

    if (!prospectSequence) {
      return { success: false, error: "Prospect not in sequence" }
    }

    const { sequence, prospect, currentStep } = prospectSequence
    const steps = sequence.steps

    // Check if there's a next step
    const nextStepIndex = currentStep + 1
    const nextStep = steps[nextStepIndex]

    if (!nextStep) {
      // Sequence completed - update status
      await prisma.prospectSequence.update({
        where: {
          prospectId_sequenceId: {
            prospectId,
            sequenceId,
          },
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
          currentStep: nextStepIndex,
        },
      })

      // Update prospect status
      await prisma.prospect.update({
        where: { id: prospectId },
        data: {
          status: 'contacted',
          sequence: null,
          sequenceStep: null,
        },
      })

      return { success: true, completed: true }
    }

    // Calculate next action time
    const nextActionAt = new Date()
    nextActionAt.setDate(nextActionAt.getDate() + nextStep.delayDays)
    nextActionAt.setHours(nextActionAt.getHours() + nextStep.delayHours)

    // If next step has no delay, create the task/email before advancing state,
    // so a failure here (e.g. prospect has no email) doesn't leave the
    // sequence pointing at a step that never actually produced anything.
    const hasNoDelay = nextStep.delayDays === 0 && nextStep.delayHours === 0
    if (hasNoDelay && nextStep.type !== 'wait') {
      await createTaskForStep(nextStep, prospect, sequence, userId)
    }

    // Update the prospect sequence to the next step
    await prisma.prospectSequence.update({
      where: {
        prospectId_sequenceId: {
          prospectId,
          sequenceId,
        },
      },
      data: {
        currentStep: nextStepIndex,
        nextActionAt,
        updatedAt: new Date(),
      },
    })

    // Update prospect's sequence step display
    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        sequenceStep: nextStep.name,
        lastActivity: new Date(),
      },
    })

    return {
      success: true,
      nextStep: { name: nextStep.name, type: nextStep.type },
    }
  } catch (error) {
    console.error("Error advancing sequence:", error)
    return { success: false, error: "Failed to advance sequence" }
  }
}

/**
 * Create task/email for a sequence step
 */
export async function createTaskForStep(
  step: {
    id: string
    name: string
    type: string
    taskNotes?: string | null
    callScript?: string | null
    emailSubject?: string | null
    emailBody?: string | null
    priority?: string | null
  },
  prospect: {
    id: string
    name: string
    email: string | null
    phone?: string | null
    linkedin?: string | null
    company?: string | null
    title?: string | null
  },
  sequence: { id: string; name: string },
  userId: string
): Promise<string | null> {
  const now = new Date()

  switch (step.type) {
    case 'email': {
      if (!prospect.email) {
        throw new Error(`Cannot send email step "${step.name}": prospect ${prospect.id} has no email address`)
      }
      const emailSubject = replaceEmailVariables(step.emailSubject || `Follow up with ${prospect.name}`, prospect)
      const emailBody = replaceEmailVariables(step.emailBody || '', prospect)
      await prisma.email.create({
        data: {
          to: prospect.email,
          from: userId,
          subject: emailSubject,
          bodyText: emailBody,
          bodyHtml: emailBody,
          prospectId: prospect.id,
          emailType: 'sequence',
          status: 'draft',
          userId,
          metadata: {
            sequenceId: sequence.id,
            sequenceName: sequence.name,
            stepId: step.id,
            stepName: step.name,
          },
        },
      })
      return 'email'
    }

    case 'call':
      await prisma.task.create({
        data: {
          title: `Call: ${prospect.name}`,
          description:
            step.callScript ||
            `Call ${prospect.name} from sequence "${sequence.name}"`,
          type: 'follow_up',
          status: 'to_do',
          priority: (step.priority as any) || 'medium',
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
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
          },
        },
      })
      return 'call'

    case 'linkedin':
      await prisma.task.create({
        data: {
          title: `LinkedIn: ${prospect.name}`,
          description:
            step.taskNotes ||
            `Reach out to ${prospect.name} on LinkedIn from sequence "${sequence.name}"`,
          type: 'linkedin',
          status: 'to_do',
          priority: (step.priority as any) || 'medium',
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
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
          },
        },
      })
      return 'linkedin'

    case 'task':
      await prisma.task.create({
        data: {
          title: step.name || `Task for ${prospect.name}`,
          description:
            step.taskNotes ||
            `Complete task for ${prospect.name} from sequence "${sequence.name}"`,
          type: 'follow_up',
          status: 'to_do',
          priority: (step.priority as any) || 'medium',
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
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
          },
        },
      })
      return 'task'

    default:
      return null
  }
}
