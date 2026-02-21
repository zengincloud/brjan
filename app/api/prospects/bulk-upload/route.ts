import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import { checkCredits, deductCredits } from "@/lib/credits"
import { findOrCreateAccount } from "@/lib/account-linking"
import Papa from "papaparse"

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

// Generate POV data from prospect data
function generatePOVData(data: {
  name: string
  title?: string | null
  company?: string | null
}): { opportunity: string; industryContext: string; howToHelp: string; angle: string } | null {
  if (!data.name) return null

  const name = toTitleCase(data.name)
  const title = toTitleCase(data.title)
  const company = toTitleCase(data.company)

  return {
    opportunity: `${name} is a ${title || "professional"} at ${company || "their company"}. ${title ? `As a ${title}, their job entails overseeing team performance, driving strategic initiatives, and managing key stakeholder relationships.` : ""} They may be actively evaluating solutions.`,

    industryContext: `Companies like ${company || "theirs"} are currently facing challenges around digital transformation and operational efficiency. With increasing pressure to modernize systems and do more with less, this is something they're likely worried about.`,

    howToHelp: `Your platform can help ${name} address operational efficiency, team productivity, and scalable processes while delivering measurable ROI on new investments.`,

    angle: `Lead with ROI metrics and case studies from similar companies. Emphasize quick time-to-value and ease of implementation. Focus on how your solution addresses their key priorities: efficiency gains, cost reduction, and competitive advantage.`
  }
}

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()

    const results = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    })

    if (results.errors.length > 0) {
      return NextResponse.json(
        { error: "Failed to parse CSV", details: results.errors },
        { status: 400 }
      )
    }

    const prospects = []
    const errors: string[] = []

    for (const [index, row] of (results.data as any[]).entries()) {
      const name = row.name || row.Name || row.NAME || row["Full Name"] || row["full name"] || null
      const email = row.email || row.Email || row.EMAIL || row["Email Address"] || row["email address"] || null
      const title = row.title || row.Title || row.TITLE || row["Job Title"] || row["job title"] || null
      const company = row.company || row.Company || row.COMPANY || row["Company Name"] || row["company name"] || row.organization || row.Organization || null
      const phone = row.phone || row.Phone || row.PHONE || row["Phone Number"] || row["phone number"] || row.mobile || row.Mobile || null
      const location = row.location || row.Location || row.LOCATION || row.city || row.City || row["Company HQ"] || row["company hq"] || row.headquarters || row.Headquarters || null
      const linkedin = row.linkedin || row.LinkedIn || row.LINKEDIN || row["LinkedIn URL"] || row["linkedin url"] || row["LinkedIn Profile"] || null
      const industry = row.industry || row.Industry || row.INDUSTRY || null

      if (!name || !email) {
        errors.push(`Row ${index + 1}: Missing required fields (name, email)`)
        continue
      }

      // Generate POV data for this prospect
      const povData = generatePOVData({ name, title, company })

      // Store extra data in wizaData if available
      const wizaData: any = {}
      if (industry) wizaData.companyIndustry = industry
      // Check for employee count in CSV
      const employeesRaw = row.employees || row.Employees || row.EMPLOYEES || row["Employee Count"] || row["employee count"] || null
      if (employeesRaw) wizaData.companySize = employeesRaw
      // Check for company phone
      const companyPhone = row["Company Phone"] || row["company phone"] || row["Company Number"] || null
      if (companyPhone) wizaData.companyPhone = companyPhone
      // Check for company website
      const website = row.website || row.Website || row.WEBSITE || row["Company Website"] || null
      if (website) wizaData.companyWebsite = website

      const hasWizaData = Object.keys(wizaData).length > 0

      prospects.push({
        name,
        email,
        title,
        company,
        phone,
        location,
        linkedin,
        ...(povData && { povData }),
        ...(hasWizaData && { wizaData }),
        userId,
      })
    }

    if (prospects.length === 0) {
      return NextResponse.json(
        { error: "No valid prospects found in CSV", details: errors },
        { status: 400 }
      )
    }

    // Check initial credits
    const creditCheck = await checkCredits(userId)
    if (!creditCheck.allowed) {
      return NextResponse.json({ error: creditCheck.error }, { status: 403 })
    }

    // Build a cache of company -> accountId to avoid repeated lookups
    const accountCache = new Map<string, string | null>()

    // Insert prospects in batch, checking credits before each
    let created = 0
    const duplicates: string[] = []
    let creditsExhausted = false

    for (const prospect of prospects) {
      // Check if user still has credits
      const check = await checkCredits(userId)
      if (!check.allowed) {
        creditsExhausted = true
        break
      }

      // Auto-link or create account for company
      let accountId: string | null = null
      if (prospect.company) {
        const cacheKey = prospect.company.toLowerCase()
        if (accountCache.has(cacheKey)) {
          accountId = accountCache.get(cacheKey)!
        } else {
          accountId = await findOrCreateAccount(userId, prospect.company)
          accountCache.set(cacheKey, accountId)
        }
      }

      try {
        await prisma.prospect.create({
          data: {
            ...prospect,
            ...(accountId && { accountId }),
          },
        })
        await deductCredits(userId)
        created++
      } catch (error: any) {
        if (error.code === "P2002") {
          duplicates.push(prospect.email)
        } else {
          console.error("Error creating prospect:", error)
        }
      }
    }

    return NextResponse.json({
      count: created,
      total: prospects.length,
      duplicates: duplicates.length,
      errors: errors.length,
      creditsExhausted,
      message: creditsExhausted
        ? `Created ${created} of ${prospects.length} prospects before running out of credits. Upgrade your plan for more.`
        : `Successfully created ${created} prospects. ${duplicates.length} duplicates skipped. ${errors.length} rows had errors.`,
    })
  } catch (error) {
    console.error("Error processing bulk upload:", error)
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 })
  }
})
