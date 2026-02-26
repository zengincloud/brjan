import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { advanceSequenceStep } from "@/lib/sequences"
import { pushContact, logCall as hubspotLogCall } from "@/lib/hubspot/client"
import { getValidAccessToken } from "@/lib/hubspot/oauth"

export const dynamic = 'force-dynamic'

// PATCH /api/calls/[id] - Update call outcome and notes
export const PATCH = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!;
  try {
    const body = await request.json()
    const { outcome, notes, duration, endedAt, twilioSid, status, startedAt } = body

    const call = await prisma.call.findUnique({
      where: {
        id: params.id,
        userId,
      },
      include: {
        prospect: {
          include: {
            prospectSequences: {
              where: { status: 'active' },
              include: {
                sequence: {
                  include: {
                    steps: { orderBy: { order: 'asc' } }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (outcome) updateData.outcome = outcome
    if (notes !== undefined) updateData.notes = notes
    if (duration !== undefined) updateData.duration = duration
    if (endedAt) updateData.endedAt = new Date(endedAt)
    if (twilioSid) updateData.twilioSid = twilioSid
    if (status) updateData.status = status
    if (startedAt) updateData.startedAt = new Date(startedAt)

    // If we have an outcome, mark as completed
    if (outcome) {
      updateData.status = "completed"
    }

    // Update call with outcome, notes, duration, and completion status
    const updatedCall = await prisma.call.update({
      where: {
        id: params.id,
        userId,
      },
      data: updateData,
    })

    // If marked not interested or referral, remove from ALL active sequences
    const sequenceRemovalOutcomes = ["connected_not_interested", "connected_referral"]
    let sequenceAdvanced = null
    if (outcome && sequenceRemovalOutcomes.includes(outcome) && call.prospectId) {
      console.log(`Prospect ${call.prospectId} marked ${outcome} — removing from all sequences`)

      await prisma.prospectSequence.updateMany({
        where: {
          prospectId: call.prospectId,
          status: "active",
        },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      })

      await prisma.prospect.update({
        where: { id: call.prospectId },
        data: {
          status: outcome === "connected_not_interested" ? "unqualified" : "contacted",
          sequence: null,
          sequenceStep: null,
        },
      })
    }
    // Otherwise if call completed with an outcome and prospect is in a sequence, advance the sequence
    else if (outcome && call.prospectId && call.prospect?.prospectSequences?.length) {
      const activeSequence = call.prospect.prospectSequences[0]
      const currentStep = activeSequence.sequence.steps[activeSequence.currentStep]

      // Only advance if current step is a call step
      if (currentStep?.type === 'call') {
        console.log(`Call completed for prospect ${call.prospectId} in sequence ${activeSequence.sequence.name}, advancing...`)

        const advanceResult = await advanceSequenceStep(
          call.prospectId,
          activeSequence.sequenceId,
          userId
        )

        if (advanceResult.success) {
          sequenceAdvanced = {
            completed: advanceResult.completed,
            nextStep: advanceResult.nextStep,
          }
          console.log(`Sequence advanced:`, advanceResult)
        } else {
          console.error(`Failed to advance sequence:`, advanceResult.error)
        }
      }
    }

    // Push call to HubSpot in background (non-blocking)
    if (outcome && call.prospect) {
      getValidAccessToken(userId).then((hsToken) => {
        if (!hsToken) {
          console.log("HubSpot: no valid token, skipping sync")
          return
        }
        console.log(`HubSpot: syncing call outcome "${outcome}" for prospect ${call.prospectId}`)
        ;(async () => {
          try {
            // Ensure prospect exists as a HubSpot contact
            const existingHsId = (call.prospect!.wizaData as any)?.hubspotContactId
            const hubspotData = existingHsId
              ? { hubspotContactId: existingHsId, created: false }
              : await pushContact(hsToken, {
                  name: call.prospect!.name,
                  email: call.prospect!.email,
                  phone: call.prospect!.phone,
                  title: call.prospect!.title,
                  company: call.prospect!.company,
                  linkedin: call.prospect!.linkedin,
                })

            console.log(`HubSpot: contact ${hubspotData.hubspotContactId} (created=${hubspotData.created})`)

            // Store HubSpot ID if newly created
            if (hubspotData.created && call.prospectId) {
              await prisma.prospect.update({
                where: { id: call.prospectId },
                data: {
                  wizaData: {
                    ...(typeof call.prospect!.wizaData === "object" && call.prospect!.wizaData !== null ? call.prospect!.wizaData : {}),
                    hubspotContactId: hubspotData.hubspotContactId,
                  } as any,
                },
              })
            }

            // Look up the company's HubSpot ID if prospect is linked to an account
            let hsCompanyId: string | null = null
            if (call.prospect!.accountId) {
              const account = await prisma.account.findUnique({
                where: { id: call.prospect!.accountId },
                select: { insights: true },
              })
              hsCompanyId = (account?.insights as any)?.hubspotCompanyId || null
            }

            // Log the call activity
            const callResult = await hubspotLogCall(hsToken, {
              hubspotContactId: hubspotData.hubspotContactId,
              hubspotCompanyId: hsCompanyId,
              outcome,
              notes,
              durationMs: duration ? duration * 1000 : undefined,
              timestamp: updatedCall.startedAt?.toISOString(),
            })

            // Store engagement ID so bulk sync doesn't duplicate it
            await prisma.call.update({
              where: { id: params.id },
              data: {
                metadata: {
                  ...(typeof updatedCall.metadata === "object" && updatedCall.metadata !== null ? updatedCall.metadata : {}),
                  hubspotEngagementId: callResult.engagementId,
                } as any,
              },
            })

            console.log(`HubSpot: logged call for prospect ${call.prospectId}`)
          } catch (err: any) {
            console.error("HubSpot sync error (non-blocking):", err?.message || err)
          }
        })()
      })
    } else if (outcome) {
      console.log(`HubSpot: skipping sync - no prospect linked to call ${params.id}`)
    }

    return NextResponse.json({ call: updatedCall, sequenceAdvanced })
  } catch (error: any) {
    console.error("Error updating call:", error)
    return NextResponse.json(
      { error: "Failed to update call" },
      { status: 500 }
    )
  }
})

// GET /api/calls/[id] - Get call details
export const GET = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!;
  try {
    const call = await prisma.call.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    return NextResponse.json({ call })
  } catch (error: any) {
    console.error("Error fetching call:", error)
    return NextResponse.json(
      { error: "Failed to fetch call" },
      { status: 500 }
    )
  }
})
