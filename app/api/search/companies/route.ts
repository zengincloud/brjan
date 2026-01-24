import { NextRequest, NextResponse } from "next/server"

// POST /api/search/companies - Search for companies using People Data Labs API
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.PEOPLE_DATA_LABS_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "People Data Labs API key not configured" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      query,
      industry,
      headcountRange,
      location,
      city,
      departmentHeadcount,
      technologies,
      jobOpportunities,
      recentActivities,
      limit = 5,
      offset = 0,
    } = body

    // Build SQL WHERE conditions
    const conditions: string[] = []

    // Free-text search (case-insensitive)
    if (query) {
      const lowerQuery = query.toLowerCase()
      conditions.push(`(LOWER(name) LIKE '%${lowerQuery}%' OR LOWER(website) LIKE '%${lowerQuery}%')`)
    }

    // Industry
    if (industry && industry.length > 0) {
      const industries = industry.map((i: string) => `'${i}'`).join(", ")
      conditions.push(`industry IN (${industries})`)
    }

    // Note: PDL doesn't support revenue filtering in SQL queries
    // Revenue data is available in results but can't be used as a filter

    // Headcount range
    if (headcountRange && headcountRange.length === 2) {
      const [min, max] = headcountRange
      conditions.push(`(size >= ${min} AND size <= ${max})`)
    }

    // Location (PDL uses dot notation for nested fields)
    if (location) {
      conditions.push(`location.country = '${location}'`)
    }
    if (city) {
      conditions.push(`location.locality LIKE '%${city}%'`)
    }

    // Technologies
    if (technologies && technologies.length > 0) {
      const techs = technologies.map((t: string) => `'${t}'`).join(", ")
      conditions.push(`tags IN (${techs})`)
    }

    // Department headcount
    if (departmentHeadcount) {
      const { department, min, max } = departmentHeadcount
      if (department && (min || max)) {
        if (min && max) {
          conditions.push(`(${department.toLowerCase()}_size >= ${min} AND ${department.toLowerCase()}_size <= ${max})`)
        } else if (min) {
          conditions.push(`${department.toLowerCase()}_size >= ${min}`)
        } else if (max) {
          conditions.push(`${department.toLowerCase()}_size <= ${max}`)
        }
      }
    }

    // Job opportunities (hiring signals)
    if (jobOpportunities && jobOpportunities.length > 0) {
      // Note: This is a placeholder - PDL doesn't have a direct field for this
      conditions.push("size IS NOT NULL")
    }

    // Recent activities (funding, etc.)
    if (recentActivities && recentActivities.length > 0) {
      if (recentActivities.includes("funding")) {
        conditions.push("last_funding_date IS NOT NULL")
      }
    }

    // Build SQL query
    const whereClause = conditions.length > 0 ? conditions.join(" AND ") : "1=1"
    const sqlQuery = `SELECT * FROM company WHERE ${whereClause}`

    const searchParams: any = {
      sql: sqlQuery,
      size: limit,
    }

    // Log the query for debugging
    console.log("PDL SQL Query:", sqlQuery)
    console.log("Search params:", JSON.stringify(searchParams, null, 2))

    // Call People Data Labs API
    const response = await fetch("https://api.peopledatalabs.com/v5/company/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(searchParams),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("People Data Labs API error:", errorData)
      return NextResponse.json(
        { error: errorData.error?.message || "Failed to search companies" },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Transform PDL response to our format
    const transformedResults = data.data?.map((company: any) => ({
      id: company.id,
      name: toTitleCase(company.name),
      industry: company.industry,
      location: formatLocation(company),
      website: company.website,
      employees: company.size,
      size: getSizeRange(company.size),
      revenue: company.estimated_revenue || null,
      verified: !!company.linkedin_url,
      linkedin: company.linkedin_url,
      description: company.summary,
      founded: company.founded,
      technologies: company.tags || [],
      buyingSignals: calculateBuyingSignals(company),
    })) || []

    return NextResponse.json({
      results: transformedResults,
      total: data.total || 0,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error("Error searching companies:", error)
    return NextResponse.json(
      { error: error.message || "Failed to search companies" },
      { status: 500 }
    )
  }
}

// Helper to capitalize names properly (title case)
function toTitleCase(str: string | null | undefined): string {
  if (!str) return ""
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Helper to format location
function formatLocation(company: any): string {
  const parts = [
    company.location_locality,
    company.location_region,
    company.location_country,
  ].filter(Boolean)
  return parts.join(", ")
}

// Helper to get size range
function getSizeRange(size: number | null): string {
  if (!size) return "Unknown"
  if (size < 50) return "1-49"
  if (size < 200) return "50-199"
  if (size < 500) return "200-499"
  if (size < 1000) return "500-999"
  if (size < 5000) return "1000-4999"
  return "5000+"
}

// Helper to calculate buying signals
function calculateBuyingSignals(company: any): string[] {
  const signals: string[] = []

  // Recent funding
  if (company.last_funding_date) {
    const fundingDate = new Date(company.last_funding_date)
    const monthsSinceFunding = (Date.now() - fundingDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsSinceFunding < 12) {
      signals.push("Recent Funding")
    }
  }

  // Growth indicators
  if (company.employee_count_by_month) {
    // Check for growth
    signals.push("Growth Indicator")
  }

  // Technology adoption
  if (company.tags && company.tags.length > 5) {
    signals.push("Tech Adoption")
  }

  // Website presence
  if (company.website) {
    signals.push("Active Website")
  }

  return signals
}
