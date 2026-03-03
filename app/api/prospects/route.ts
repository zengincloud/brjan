import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { checkCredits, deductCredits } from "@/lib/credits"
import { findOrCreateAccount } from "@/lib/account-linking"
import { pushContact, pushCompany, associateContactToCompany } from "@/lib/hubspot/client"
import { getValidAccessToken } from "@/lib/hubspot/oauth"

export const dynamic = 'force-dynamic'

// Helper function to convert text to title case
function toTitleCase(str: string | null | undefined): string {
  if (!str) return ""
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Helper function to get buyer intent text
function getBuyerIntentText(intent: string): string {
  switch (intent) {
    case "high":
      return "high buyer intent signals"
    case "medium":
      return "moderate engagement signals"
    case "low":
      return "low buyer intent"
    default:
      return "unknown intent signals"
  }
}

// Generate POV data from prospect/Wiza data
function generatePOVData(data: {
  name: string
  title?: string | null
  company?: string | null
  industry?: string
  seniorityLevel?: string
  companySize?: string
  buyerIntent?: string
}): { opportunity: string; industryContext: string; howToHelp: string; angle: string } | null {
  // Need at least name and some context to generate meaningful POV
  if (!data.name) return null

  const name = toTitleCase(data.name)
  const title = toTitleCase(data.title)
  const company = toTitleCase(data.company)
  const industry = data.industry || "their industry"
  const seniorityLevel = data.seniorityLevel || "their level"
  const companySize = data.companySize || "mid-sized"
  const buyerIntent = data.buyerIntent || "medium"

  return {
    opportunity: `${name} is a ${title || "professional"} at ${company || "their company"}, a ${companySize} company in the ${industry} industry. Based on their seniority level (${seniorityLevel}), they likely have decision-making authority. ${title ? `As a ${title}, their job entails overseeing team performance, driving strategic initiatives, and managing key stakeholder relationships.` : ""} With ${getBuyerIntentText(buyerIntent)}, they may be actively evaluating solutions.`,

    industryContext: `In the ${industry} space, companies like ${company || "theirs"} are currently facing challenges around digital transformation and data security. With increasing regulatory compliance requirements and pressure to modernize legacy systems, this is something they're likely worried about. Market consolidation and the need for scalable, AI-driven solutions are hot topics right now.`,

    howToHelp: `Your platform can help ${name} address operational efficiency, team productivity, and scalable processes while delivering measurable ROI on new investments. Their background suggests they value data-driven solutions.`,

    angle: `Lead with ROI metrics and case studies from similar companies in the ${industry} space. Emphasize quick time-to-value and ease of implementation. Focus on how your solution addresses their key priorities: efficiency gains, cost reduction, and competitive advantage.`
  }
}

// GET /api/prospects - Get all prospects
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const sequence = searchParams.get("sequence")
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "50")

    const where: any = {
      userId, // Filter by current user
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
      ]
    }

    if (sequence) {
      where.sequence = sequence
    }

    if (status) {
      where.status = status
    }

    const [prospects, totalCount] = await Promise.all([
      prisma.prospect.findMany({
        where,
        orderBy: { lastActivity: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      prisma.prospect.count({ where }),
    ])

    return NextResponse.json({ prospects, totalCount, page, pageSize })
  } catch (error) {
    console.error("Error fetching prospects:", error)
    return NextResponse.json({ error: "Failed to fetch prospects" }, { status: 500 })
  }
})

// POST /api/prospects - Create a new prospect
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()

    const { name, email, title, company, phone, location, linkedin, status, sequence, sequenceStep, wizaData } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Check credits before creating
    const creditCheck = await checkCredits(userId)
    if (!creditCheck.allowed) {
      return NextResponse.json({ error: creditCheck.error }, { status: 403 })
    }

    // Generate POV data from available information
    const povData = generatePOVData({
      name,
      title,
      company,
      industry: wizaData?.industry,
      seniorityLevel: wizaData?.seniorityLevel,
      companySize: wizaData?.companySize,
      buyerIntent: wizaData?.buyerIntent,
    })

    // Auto-link or create account for company, with enrichment from Wiza data
    const accountId = company ? await findOrCreateAccount(userId, company, {
      industry: wizaData?.industry || wizaData?.companyIndustry || null,
      location: location || null,
      website: wizaData?.companyDomain ? `https://${wizaData.companyDomain}` : null,
      employees: wizaData?.companySize || null,
    }) : null

    const prospect = await prisma.prospect.create({
      data: {
        name,
        email,
        title,
        company,
        phone,
        location,
        linkedin,
        status,
        sequence,
        sequenceStep,
        wizaData,
        ...(povData && { povData }),
        ...(accountId && { accountId }),
        userId,
      },
    })

    // Deduct credit after successful creation
    await deductCredits(userId)

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
        const result = await pushContact(hsToken, { name, email, phone, title, company, linkedin })
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
    console.error("Error creating prospect:", error)

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A prospect with this email already exists" }, { status: 409 })
    }

    return NextResponse.json({ error: "Failed to create prospect" }, { status: 500 })
  }
})
