import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { pushContact, pushCompany } from "@/lib/hubspot/client"
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

    // Sync contacts
    const prospects = await prisma.prospect.findMany({
      where: syncAll ? { userId } : { id: { in: prospectIds }, userId },
    })

    // Process contacts SEQUENTIALLY to avoid race conditions creating duplicates
    let contactsSynced = 0
    let contactsFailed = 0

    for (const prospect of prospects) {
      try {
        // Skip if we already have a HubSpot ID stored
        const existingHsId = (prospect.wizaData as any)?.hubspotContactId
        if (existingHsId) {
          contactsSynced++
          continue
        }

        const result = await pushContact(accessToken, {
          name: prospect.name,
          email: prospect.email,
          phone: prospect.phone,
          title: prospect.title,
          company: prospect.company,
          linkedin: prospect.linkedin,
        })

        await prisma.prospect.update({
          where: { id: prospect.id },
          data: {
            wizaData: {
              ...(typeof prospect.wizaData === "object" && prospect.wizaData !== null ? prospect.wizaData : {}),
              hubspotContactId: result.hubspotContactId,
            } as any,
          },
        })

        contactsSynced++
      } catch (err: any) {
        console.error(`HubSpot: failed to sync contact "${prospect.name}":`, err?.message)
        contactsFailed++
      }
    }

    // Sync companies (only on syncAll)
    let companiesSynced = 0
    let companiesFailed = 0

    if (syncAll) {
      const accounts = await prisma.account.findMany({
        where: { userId },
      })

      // Process companies SEQUENTIALLY to avoid race conditions creating duplicates
      for (const account of accounts) {
        try {
          // Skip if we already have a HubSpot ID stored for this account
          const existingHsId = (account.insights as any)?.hubspotCompanyId
          if (existingHsId) {
            // Just update the existing record
            companiesSynced++
            continue
          }

          const result = await pushCompany(accessToken, {
            name: account.name,
            industry: account.industry,
            location: account.location,
            website: account.website,
            employees: account.employees,
            linkedin: account.linkedin,
          })

          // Store HubSpot company ID on the account so we don't create duplicates next time
          await prisma.account.update({
            where: { id: account.id },
            data: {
              insights: {
                ...(typeof account.insights === "object" && account.insights !== null ? account.insights : {}),
                hubspotCompanyId: result.hubspotCompanyId,
              } as any,
            },
          })

          companiesSynced++
        } catch (err: any) {
          console.error(`HubSpot: failed to sync company "${account.name}":`, err?.message)
          companiesFailed++
        }
      }
    }

    return NextResponse.json({
      contacts: { synced: contactsSynced, failed: contactsFailed, total: prospects.length },
      companies: { synced: companiesSynced, failed: companiesFailed },
    })
  } catch (error: any) {
    console.error("HubSpot sync error:", error)
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 })
  }
})
