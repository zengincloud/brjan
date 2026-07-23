import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withExtensionAuth } from "@/lib/auth/extension-middleware"
import { checkCredits, deductCredits } from "@/lib/credits"
import { findOrCreateAccount } from "@/lib/account-linking"
import { pushContact, pushCompany, associateContactToCompany } from "@/lib/hubspot/client"
import { getValidAccessToken } from "@/lib/hubspot/oauth"
import { getTimezoneFromLocation } from "@/lib/timezone"

export const dynamic = 'force-dynamic'

function toTitleCase(str: string | null | undefined): string {
  if (typeof str !== "string" || !str) return ""
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// POST /api/extension/save-prospect
// Creates a Prospect record from extension-revealed data.
// Sets company field to match the Account name (case-insensitive) so it auto-links.
export const POST = withExtensionAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()

    // Request bodies originate from Wiza-sourced data (reveal, extension
    // scrape), whose fields aren't guaranteed to be strings, so coerce
    // every string-typed field once here rather than trusting body.* below.
    const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null)
    const name = str(body.name)
    const email = str(body.email)
    const title = str(body.title)
    const company = str(body.company)
    const phone = str(body.phone)
    const location = str(body.location)
    const linkedin = str(body.linkedin)
    const notes = str(body.notes)
    const wizaData = body.wizaData

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Check credits
    const creditCheck = await checkCredits(userId, "prospect_created")
    if (!creditCheck.allowed) {
      return NextResponse.json({ error: creditCheck.error }, { status: 403 })
    }

    // Auto-link or create account for company, with enrichment from Wiza data
    const accountId = company ? await findOrCreateAccount(userId, company, {
      industry: wizaData?.companyIndustry || null,
      location: wizaData?.location || location || null,
      website: wizaData?.companyDomain ? `https://${wizaData.companyDomain}` : null,
      employees: wizaData?.companySize || null,
      linkedin: wizaData?.companyLinkedinUrl || null,
    }) : null

    // If linked to an existing account, use its exact name
    let resolvedCompany = company
    if (accountId) {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: { name: true },
      })
      if (account) resolvedCompany = account.name
    }

    // Generate POV data
    const industry = wizaData?.companyIndustry || null
    const povData = name ? {
      opportunity: `${toTitleCase(name)} is a ${toTitleCase(title) || "professional"} at ${toTitleCase(resolvedCompany) || "their company"}${industry ? ` in the ${industry} space` : ""}. ${title ? `As a ${toTitleCase(title)}, their job entails overseeing team performance, driving strategic initiatives, and managing key stakeholder relationships.` : ""} They may be actively evaluating solutions.`,
      industryContext: industry
        ? `In the ${industry} space, companies like ${toTitleCase(resolvedCompany) || "theirs"} are currently facing challenges around digital transformation and operational efficiency. With increasing pressure to modernize systems and do more with less, this is something they're likely worried about.`
        : `Companies like ${toTitleCase(resolvedCompany) || "theirs"} are currently facing challenges around digital transformation and operational efficiency. With increasing pressure to modernize systems and do more with less, this is something they're likely worried about.`,
      howToHelp: `Your platform can help ${toTitleCase(name)} address operational efficiency, team productivity, and scalable processes while delivering measurable ROI on new investments.`,
      angle: `Lead with ROI metrics and case studies from similar ${industry ? `companies in the ${industry} space` : "companies"}. Emphasize quick time-to-value and ease of implementation. Focus on how your solution addresses their key priorities: efficiency gains, cost reduction, and competitive advantage.`,
    } : null

    const timezone = getTimezoneFromLocation(location) || null

    const prospect = await prisma.prospect.create({
      data: {
        name,
        email,
        title,
        company: resolvedCompany,
        phone,
        location,
        timezone,
        linkedin,
        ...(notes && { notes }),
        status: "new_lead",
        wizaData,
        ...(povData && { povData }),
        ...(accountId && { accountId }),
        userId,
      },
    })

    await deductCredits(userId, "prospect_created")

    // Push to HubSpot in background (non-blocking)
    getValidAccessToken(userId).then(async (hsToken) => {
      if (!hsToken) return
      try {
        // Push company first if we have an account without a HubSpot ID
        let hsCompanyId: string | null = null
        if (accountId) {
          const account = await prisma.account.findUnique({
            where: { id: accountId },
            select: { name: true, industry: true, location: true, website: true, employees: true, linkedin: true, insights: true },
          })
          if (account) {
            hsCompanyId = (account.insights as any)?.hubspotCompanyId || null
            if (!hsCompanyId) {
              const companyResult = await pushCompany(hsToken, {
                name: account.name,
                industry: account.industry,
                location: account.location,
                website: account.website,
                employees: account.employees,
                linkedin: account.linkedin,
              })
              hsCompanyId = companyResult.hubspotCompanyId
              await prisma.account.update({
                where: { id: accountId },
                data: {
                  insights: {
                    ...(typeof account.insights === "object" && account.insights !== null ? account.insights : {}),
                    hubspotCompanyId: hsCompanyId,
                  } as any,
                },
              })
            }
          }
        }

        // Push contact
        const result = await pushContact(hsToken, { name, email, phone, title, company: resolvedCompany, linkedin })
        await prisma.prospect.update({
          where: { id: prospect.id },
          data: {
            wizaData: {
              ...(typeof prospect.wizaData === "object" && prospect.wizaData !== null ? prospect.wizaData : {}),
              hubspotContactId: result.hubspotContactId,
            } as any,
          },
        })
        // Associate contact with company
        if (hsCompanyId) {
          await associateContactToCompany(hsToken, result.hubspotContactId, hsCompanyId)
        }
        console.log(`HubSpot: synced new prospect ${prospect.id} → contact ${result.hubspotContactId}`)
      } catch (err) {
        console.error("HubSpot sync error (non-blocking):", err)
      }
    })

    return NextResponse.json({ prospect }, { status: 201 })
  } catch (error: any) {
    console.error("Extension save-prospect error:", error)

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A prospect with this email already exists" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to save prospect" },
      { status: 500 }
    )
  }
})
