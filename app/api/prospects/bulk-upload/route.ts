import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
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
      const name = row.name || row.Name
      const email = row.email || row.Email
      const title = row.title || row.Title || null
      const company = row.company || row.Company || null
      const phone = row.phone || row.Phone || null

      if (!name || !email) {
        errors.push(`Row ${index + 1}: Missing required fields (name, email)`)
        continue
      }

      // Generate POV data for this prospect
      const povData = generatePOVData({ name, title, company })

      prospects.push({
        name,
        email,
        title,
        company,
        phone,
        povData,
        userId,
      })
    }

    if (prospects.length === 0) {
      return NextResponse.json(
        { error: "No valid prospects found in CSV", details: errors },
        { status: 400 }
      )
    }

    // Insert prospects in batch
    let created = 0
    const duplicates: string[] = []

    for (const prospect of prospects) {
      try {
        await prisma.prospect.create({
          data: prospect,
        })
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
      message: `Successfully created ${created} prospects. ${duplicates.length} duplicates skipped. ${errors.length} rows had errors.`,
    })
  } catch (error) {
    console.error("Error processing bulk upload:", error)
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 })
  }
})
