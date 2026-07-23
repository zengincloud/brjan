import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { advanceSequenceStep } from "@/lib/sequences"
import { pushContact, logCall as hubspotLogCall } from "@/lib/hubspot/client"
import { getValidAccessToken } from "@/lib/hubspot/oauth"
import { upsertContact, upsertAccount, logCallTask } from "@/lib/salesforce/client"
import { getValidAccessToken as getSfToken } from "@/lib/salesforce/oauth"
import twilio from "twilio"

export const dynamic = 'force-dynamic'

// Forcibly ends the prospect's PSTN leg (and the conference, as a fallback)
// via the Twilio REST API. The browser SDK's call.disconnect() only ends the
// rep's own leg — endConferenceOnExit is supposed to propagate that to the
// prospect's leg too, but that only works once the prospect's leg has actually
// joined the conference, so a rep hanging up early can leave the prospect's
// phone connected. This makes "hang up" actually hang up.
async function forceHangupProspectLeg(callId: string, metadata: unknown) {
  const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
  const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
  if (!ACCOUNT_SID || !AUTH_TOKEN) return

  const twilioClient = twilio(ACCOUNT_SID, AUTH_TOKEN)
  const prospectCallSid = metadata && typeof metadata === "object" ? (metadata as any).prospectCallSid : undefined

  if (prospectCallSid) {
    await twilioClient.calls(prospectCallSid).update({ status: "completed" }).catch((err: any) => {
      // 404 just means it already ended on its own — nothing to do
      if (err?.status !== 404) console.error("[hangup] failed to end prospect leg:", err)
    })
  }

  // Belt-and-suspenders: also end the conference directly in case some other
  // participant (e.g. a supervisor listening in) is still connected.
  await twilioClient.conferences
    .list({ friendlyName: `conf-${callId}`, status: "in-progress", limit: 1 })
    .then((conferences) => (conferences[0] ? twilioClient.conferences(conferences[0].sid).update({ status: "completed" }) : null))
    .catch((err: any) => console.error("[hangup] failed to end conference:", err))
}

// PATCH /api/calls/[id] - Update call outcome and notes
export const PATCH = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!;
  try {
    const body = await request.json()
    const { outcome, notes, duration, endedAt, twilioSid, status, startedAt, prospectId, hangup } = body

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

    if (hangup) {
      await forceHangupProspectLeg(call.id, call.metadata)
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
    if (prospectId) updateData.prospectId = prospectId

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
    const sequenceRemovalOutcomes = ["connected_not_interested", "connected_referral", "connected_intro_booked", "connected_info_gathered", "wrong_number"]
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
          status: outcome === "connected_not_interested" ? "unqualified"
            : outcome === "connected_intro_booked" ? "meeting_scheduled"
            : outcome === "wrong_number" ? "unqualified"
            : "contacted",
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

    // Sync to Salesforce in background (non-blocking)
    if (outcome && call.prospect) {
      getSfToken(userId).then((sfCreds) => {
        if (!sfCreds) {
          console.log("Salesforce: no valid token, skipping sync")
          return
        }
        console.log(`Salesforce: syncing call outcome "${outcome}" for prospect ${call.prospectId}`)
        ;(async () => {
          try {
            const existingSfLeadId = (call.prospect!.wizaData as any)?.salesforceContactId
            const sfData = existingSfLeadId
              ? { contactId: existingSfLeadId, created: false }
              : await upsertContact(sfCreds.token, sfCreds.instanceUrl, {
                  name: call.prospect!.name,
                  email: call.prospect!.email,
                  phone: call.prospect!.phone,
                  title: call.prospect!.title,
                  location: call.prospect!.location,
                })

            console.log(`Salesforce: lead ${sfData.contactId} (created=${sfData.created})`)

            if (sfData.created && call.prospectId) {
              await prisma.prospect.update({
                where: { id: call.prospectId },
                data: {
                  wizaData: {
                    ...(typeof call.prospect!.wizaData === "object" && call.prospect!.wizaData !== null ? call.prospect!.wizaData : {}),
                    salesforceContactId: sfData.contactId,
                  } as any,
                },
              })
            }

            // Upsert account if prospect is linked to one
            let sfAccountId: string | null = null
            if (call.prospect!.accountId) {
              const account = await prisma.account.findUnique({
                where: { id: call.prospect!.accountId },
                select: { id: true, name: true, industry: true, website: true, employees: true, location: true, insights: true },
              })
              if (account) {
                const existingSfAccountId = (account.insights as any)?.salesforceAccountId
                const sfAccount = existingSfAccountId
                  ? { accountId: existingSfAccountId, created: false }
                  : await upsertAccount(sfCreds.token, sfCreds.instanceUrl, {
                      name: account.name,
                      industry: account.industry,
                      website: account.website,
                      employees: account.employees,
                      location: account.location,
                    })
                sfAccountId = sfAccount.accountId
                if (sfAccount.created) {
                  await prisma.account.update({
                    where: { id: account.id },
                    data: {
                      insights: {
                        ...(typeof account.insights === "object" && account.insights !== null ? account.insights : {}),
                        salesforceAccountId: sfAccount.accountId,
                      } as any,
                    },
                  })
                }
              }
            }

            const taskResult = await logCallTask(sfCreds.token, sfCreds.instanceUrl, {
              contactId: sfData.contactId,
              accountId: sfAccountId,
              outcome,
              notes,
              duration: updatedCall.duration,
              startedAt: updatedCall.startedAt,
              transcription: updatedCall.transcription,
            })

            await prisma.call.update({
              where: { id: params.id },
              data: {
                metadata: {
                  ...(typeof updatedCall.metadata === "object" && updatedCall.metadata !== null ? updatedCall.metadata : {}),
                  salesforceTaskId: taskResult.taskId,
                } as any,
              },
            })

            console.log(`Salesforce: logged call task ${taskResult.taskId} for prospect ${call.prospectId}`)
          } catch (err: any) {
            console.error("Salesforce sync error (non-blocking):", err?.message || err)
          }
        })()
      })
    } else if (outcome) {
      console.log(`Salesforce: skipping sync - no prospect linked to call ${params.id}`)
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
