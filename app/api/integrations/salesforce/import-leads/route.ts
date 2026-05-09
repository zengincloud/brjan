import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { getValidAccessToken } from "@/lib/salesforce/oauth"
import { getSfUserId, fetchOwnedLeads } from "@/lib/salesforce/client"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// POST /api/integrations/salesforce/import-leads
// Imports Salesforce Leads owned by the connected user into Prospects
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const sfCreds = await getValidAccessToken(userId)
    if (!sfCreds) {
      return NextResponse.json({ error: "Salesforce not connected" }, { status: 400 })
    }

    const sfUserId = await getSfUserId(sfCreds.token, sfCreds.instanceUrl)
    const leads = await fetchOwnedLeads(sfCreds.token, sfCreds.instanceUrl, sfUserId)

    let imported = 0
    let skipped = 0

    for (const lead of leads) {
      const name = [lead.FirstName, lead.LastName].filter(Boolean).join(" ")
      const email = lead.Email || null
      const phone = lead.Phone || lead.MobilePhone || null
      const location =
        [lead.City, lead.State].filter(Boolean).join(", ") || null

      try {
        // Check for existing prospect by SF lead ID or email
        const existingByLeadId = email
          ? await prisma.prospect.findFirst({
              where: {
                userId,
                wizaData: { path: ["salesforceLeadId"], equals: lead.Id },
              },
            })
          : null

        const existingByEmail = !existingByLeadId && email
          ? await prisma.prospect.findUnique({ where: { userId_email: { userId, email } } })
          : null

        if (existingByLeadId) {
          // Already imported — update with latest SF data
          await prisma.prospect.update({
            where: { id: existingByLeadId.id },
            data: {
              name: name || existingByLeadId.name,
              title: lead.Title || existingByLeadId.title,
              company: lead.Company || existingByLeadId.company,
              phone: phone || existingByLeadId.phone,
              location: location || existingByLeadId.location,
              updatedAt: new Date(),
            },
          })
          skipped++
        } else if (existingByEmail) {
          // Same email exists — store SF lead ID and update
          await prisma.prospect.update({
            where: { id: existingByEmail.id },
            data: {
              wizaData: {
                ...(typeof existingByEmail.wizaData === "object" && existingByEmail.wizaData !== null
                  ? existingByEmail.wizaData
                  : {}),
                salesforceLeadId: lead.Id,
              } as any,
              title: existingByEmail.title || lead.Title || null,
              company: existingByEmail.company || lead.Company || null,
              phone: existingByEmail.phone || phone,
              location: existingByEmail.location || location,
            },
          })
          skipped++
        } else {
          // New prospect
          await prisma.prospect.create({
            data: {
              userId,
              name: name || "Unknown",
              email,
              phone,
              title: lead.Title || null,
              company: lead.Company || null,
              location,
              status: "new_lead",
              wizaData: { salesforceLeadId: lead.Id } as any,
            },
          })
          imported++
        }
      } catch (err: any) {
        // Skip individual failures (e.g., unique constraint on email)
        console.warn(`Salesforce import: skipped lead ${lead.Id} — ${err?.message}`)
        skipped++
      }
    }

    return NextResponse.json({ imported, skipped, total: leads.length })
  } catch (error: any) {
    console.error("Salesforce import-leads error:", error)
    return NextResponse.json(
      { error: "Failed to import Salesforce leads" },
      { status: 500 }
    )
  }
})
