import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { pushContact, pushCompany, logCall, associateContactToCompany } from "@/lib/hubspot/client"
import { getValidAccessToken } from "@/lib/hubspot/oauth"

export const dynamic = "force-dynamic"

// POST /api/integrations/hubspot/sync - Push contacts and/or companies to HubSpot
// Pass { syncAll: true } to sync everything, or { prospectIds: [...] } for specific contacts
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const accessToken = await getValidAccessToken(userId)
    if (!accessToken) {
      return NextResponse.json({ error: "HubSpot not connected" }, { status: 400 })
    }

    const { prospectIds, syncAll } = await request.json()

    if (!syncAll && (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0)) {
      return NextResponse.json({ error: "prospectIds or syncAll required" }, { status: 400 })
    }

    // ========================================
    // STEP 1: Sync companies FIRST (so we have HubSpot company IDs for associations)
    // ========================================
    let companiesSynced = 0
    let companiesFailed = 0
    // accountId -> hubspotCompanyId mapping for linking contacts later
    const accountHsMap = new Map<string, string>()

    if (syncAll) {
      const accounts = await prisma.account.findMany({
        where: { userId },
      })

      for (const account of accounts) {
        try {
          const result = await pushCompany(accessToken, {
            name: account.name,
            industry: account.industry,
            location: account.location,
            website: account.website,
            employees: account.employees,
            linkedin: account.linkedin,
          })

          accountHsMap.set(account.id, result.hubspotCompanyId)

          // Store HubSpot company ID on the account
          const existingInsights = typeof account.insights === "object" && account.insights !== null ? account.insights : {}
          if (!(existingInsights as any).hubspotCompanyId || (existingInsights as any).hubspotCompanyId !== result.hubspotCompanyId) {
            await prisma.account.update({
              where: { id: account.id },
              data: {
                insights: {
                  ...existingInsights,
                  hubspotCompanyId: result.hubspotCompanyId,
                } as any,
              },
            })
          }

          companiesSynced++
        } catch (err: any) {
          console.error(`HubSpot: failed to sync company "${account.name}":`, err?.message)
          companiesFailed++
        }
      }
    }

    // ========================================
    // STEP 2: Sync contacts AND associate them with their company
    // ========================================
    const prospects = await prisma.prospect.findMany({
      where: syncAll ? { userId } : { id: { in: prospectIds }, userId },
    })

    let contactsSynced = 0
    let contactsFailed = 0
    let associationsMade = 0

    for (const prospect of prospects) {
      try {
        let hsContactId = (prospect.wizaData as any)?.hubspotContactId

        if (!hsContactId) {
          const result = await pushContact(accessToken, {
            name: prospect.name,
            email: prospect.email,
            phone: prospect.phone,
            title: prospect.title,
            company: prospect.company,
            linkedin: prospect.linkedin,
          })

          hsContactId = result.hubspotContactId

          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              wizaData: {
                ...(typeof prospect.wizaData === "object" && prospect.wizaData !== null ? prospect.wizaData : {}),
                hubspotContactId: hsContactId,
              } as any,
            },
          })
        }

        // Associate contact with their company in HubSpot
        if (hsContactId && prospect.accountId) {
          const hsCompanyId = accountHsMap.get(prospect.accountId)
          if (hsCompanyId) {
            await associateContactToCompany(accessToken, hsContactId, hsCompanyId)
            associationsMade++
          }
        }

        contactsSynced++
      } catch (err: any) {
        console.error(`HubSpot: failed to sync contact "${prospect.name}":`, err?.message)
        contactsFailed++
      }
    }

    // ========================================
    // STEP 3: Sync calls (associated with both contact AND company)
    // ========================================
    let callsSynced = 0
    let callsFailed = 0

    if (syncAll) {
      // Build prospect -> hubspot contact ID map
      const allProspects = await prisma.prospect.findMany({
        where: { userId },
        select: { id: true, wizaData: true, accountId: true },
      })
      const prospectHsMap = new Map<string, { contactId: string; companyId: string | null }>()
      for (const p of allProspects) {
        const hsId = (p.wizaData as any)?.hubspotContactId
        if (hsId) {
          const hsCompanyId = p.accountId ? accountHsMap.get(p.accountId) || null : null
          prospectHsMap.set(p.id, { contactId: hsId, companyId: hsCompanyId })
        }
      }

      const calls = await prisma.call.findMany({
        where: {
          userId,
          outcome: { not: null },
          prospectId: { not: null },
        },
        orderBy: { createdAt: "asc" },
      })

      for (const call of calls) {
        try {
          if ((call.metadata as any)?.hubspotEngagementId) {
            callsSynced++
            continue
          }

          const hsIds = call.prospectId ? prospectHsMap.get(call.prospectId) : null
          if (!hsIds || !call.outcome) continue

          const result = await logCall(accessToken, {
            hubspotContactId: hsIds.contactId,
            hubspotCompanyId: hsIds.companyId,
            outcome: call.outcome,
            notes: call.notes,
            durationMs: call.duration ? call.duration * 1000 : undefined,
            timestamp: call.startedAt?.toISOString() || call.createdAt.toISOString(),
          })

          await prisma.call.update({
            where: { id: call.id },
            data: {
              metadata: {
                ...(typeof call.metadata === "object" && call.metadata !== null ? call.metadata : {}),
                hubspotEngagementId: result.engagementId,
              } as any,
            },
          })

          callsSynced++
        } catch (err: any) {
          console.error(`HubSpot: failed to sync call ${call.id}:`, err?.message)
          callsFailed++
        }
      }
    }

    return NextResponse.json({
      companies: { synced: companiesSynced, failed: companiesFailed },
      contacts: { synced: contactsSynced, failed: contactsFailed, associations: associationsMade },
      calls: { synced: callsSynced, failed: callsFailed },
    })
  } catch (error: any) {
    console.error("HubSpot sync error:", error)
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 })
  }
})
