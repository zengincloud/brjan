import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

/**
 * POST /api/sequences/process
 *
 * Process active sequences and generate actions (calls, emails, tasks)
 * for prospects who are ready for their next step.
 *
 * This endpoint should be called periodically (e.g., every hour via cron)
 * or manually to queue up actions from sequences.
 */
export const POST = withAuth(async (
  request: NextRequest,
  userId: string
) => {
  try {
    const now = new Date()

    // Find all prospect sequences that are:
    // 1. Active
    // 2. Due for next action (nextActionAt <= now)
    const dueProspectSequences = await prisma.prospectSequence.findMany({
      where: {
        status: 'active',
        nextActionAt: {
          lte: now,
        },
        sequence: {
          userId,
          status: 'active',
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

    let callsCreated = 0
    let emailsCreated = 0
    let tasksCreated = 0
    let completed = 0

    for (const ps of dueProspectSequences) {
      const sequence = ps.sequence
      const prospect = ps.prospect
      const currentStep = sequence.steps[ps.currentStep]

      if (!currentStep) {
        // No more steps, mark as completed
        await prisma.prospectSequence.update({
          where: { id: ps.id },
          data: {
            status: 'completed',
            completedAt: now,
            nextActionAt: null,
          }
        })

        await prisma.prospect.update({
          where: { id: prospect.id },
          data: {
            status: 'contacted',
            sequence: null,
            sequenceStep: null,
          }
        })

        completed++
        continue
      }

      // Process the current step based on type
      try {
        switch (currentStep.type) {
          case 'email':
            // Create draft email in emailer
            await prisma.email.create({
              data: {
                to: prospect.email,
                from: userId, // This should be the user's email address
                subject: currentStep.emailSubject || `Follow up with ${prospect.name}`,
                bodyText: currentStep.emailBody || '',
                bodyHtml: currentStep.emailBody || '',
                prospectId: prospect.id,
                emailType: 'sequence',
                status: 'draft',
                userId,
                metadata: {
                  sequenceId: sequence.id,
                  sequenceName: sequence.name,
                  stepId: currentStep.id,
                  stepName: currentStep.name,
                  prospectSequenceId: ps.id,
                }
              }
            })
            emailsCreated++
            break

          case 'call':
            // Create task in task board for call
            // We create a task instead of auto-calling
            await prisma.task.create({
              data: {
                title: `Call: ${prospect.name}`,
                description: currentStep.callScript || `Call ${prospect.name} from sequence "${sequence.name}"`,
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
                events: {
                  create: {
                    type: 'call_started',
                    meta: {
                      sequenceId: sequence.id,
                      sequenceName: sequence.name,
                      stepId: currentStep.id,
                      stepName: currentStep.name,
                      prospectSequenceId: ps.id,
                    }
                  }
                }
              }
            })
            callsCreated++
            break

          case 'linkedin':
          case 'task':
            // Create task for LinkedIn outreach
            await prisma.task.create({
              data: {
                title: `LinkedIn: ${prospect.name}`,
                description: currentStep.taskNotes || `Reach out to ${prospect.name} on LinkedIn`,
                type: 'follow_up',
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
            tasksCreated++
            break

          case 'wait':
            // Wait steps don't create actions, just advance to next step
            break
        }

        // Move to next step
        const nextStepIndex = ps.currentStep + 1
        const nextStep = sequence.steps[nextStepIndex]

        if (nextStep) {
          // Calculate next action time based on next step's delay
          const nextActionAt = new Date(now)
          nextActionAt.setDate(nextActionAt.getDate() + nextStep.delayDays)
          nextActionAt.setHours(nextActionAt.getHours() + nextStep.delayHours)

          await prisma.prospectSequence.update({
            where: { id: ps.id },
            data: {
              currentStep: nextStepIndex,
              nextActionAt,
            }
          })

          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              sequenceStep: nextStep.name,
            }
          })
        } else {
          // Sequence complete
          await prisma.prospectSequence.update({
            where: { id: ps.id },
            data: {
              status: 'completed',
              completedAt: now,
              nextActionAt: null,
            }
          })

          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              status: 'contacted',
              sequence: null,
              sequenceStep: null,
            }
          })

          completed++
        }
      } catch (error) {
        console.error(`Error processing step for prospect ${prospect.id}:`, error)

        // Mark as failed
        await prisma.prospectSequence.update({
          where: { id: ps.id },
          data: {
            status: 'failed',
            failedAt: now,
          }
        })
      }
    }

    return NextResponse.json({
      processed: dueProspectSequences.length,
      callsCreated,
      emailsCreated,
      tasksCreated,
      completed,
    })
  } catch (error: any) {
    console.error("Error processing sequences:", error)
    return NextResponse.json(
      { error: "Failed to process sequences" },
      { status: 500 }
    )
  }
})
