import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withExtensionAuth } from "@/lib/auth/extension-middleware"
import { checkCredits, deductCredits } from "@/lib/credits"
import { findOrCreateAccount } from "@/lib/account-linking"

export const dynamic = 'force-dynamic'

function toTitleCase(str: string | null | undefined): string {
  if (!str) return ""
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
    const { name, email, title, company, phone, location, linkedin, wizaData } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Check credits
    const creditCheck = await checkCredits(userId)
    if (!creditCheck.allowed) {
      return NextResponse.json({ error: creditCheck.error }, { status: 403 })
    }

    // Auto-link or create account for company
    const accountId = company ? await findOrCreateAccount(userId, company) : null

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

    const prospect = await prisma.prospect.create({
      data: {
        name,
        email,
        title,
        company: resolvedCompany,
        phone,
        location,
        linkedin,
        status: "new_lead",
        wizaData,
        ...(povData && { povData }),
        ...(accountId && { accountId }),
        userId,
      },
    })

    await deductCredits(userId)

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
