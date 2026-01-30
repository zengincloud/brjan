import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// POST /api/search/companies - Search for companies using People Data Labs API
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  // Helper to sanitize SQL input by escaping single quotes
  function sanitizeSqlInput(str: string): string {
    return str.replace(/'/g, "''")
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

    // Free-text search with prioritized matching
    // PDL uses Elasticsearch SQL where text fields are case-insensitive by default
    if (query) {
      const sanitizedQuery = sanitizeSqlInput(query)
      // Prioritize exact matches, then prefix matches, then contains matches
      // Use OR to match any of: exact name, starts with, contains, or domain match
      conditions.push(`(
        name = '${sanitizedQuery}' OR
        name LIKE '${sanitizedQuery}%' OR
        name LIKE '%${sanitizedQuery}%' OR
        website LIKE '%${sanitizedQuery.toLowerCase().replace(/\s+/g, '')}%'
      )`)
    }

    // Industry - use LIKE for partial matches
    if (industry && industry.length > 0) {
      const industryConditions = industry.map((i: string) => `industry LIKE '%${sanitizeSqlInput(i)}%'`).join(' OR ')
      conditions.push(`(${industryConditions})`)
    }

    // Note: PDL doesn't support revenue filtering in SQL queries
    // Revenue data is available in results but can't be used as a filter

    // Headcount range
    if (headcountRange && headcountRange.length === 2) {
      const [min, max] = headcountRange
      conditions.push(`(size >= ${min} AND size <= ${max})`)
    }

    // Location - map regions to countries
    if (location) {
      const regionMap: { [key: string]: string[] } = {
        'north-america': ['united states', 'canada', 'mexico'],
        'europe': ['united kingdom', 'germany', 'france', 'spain', 'italy', 'netherlands', 'switzerland', 'sweden', 'norway', 'denmark', 'poland', 'belgium', 'austria', 'ireland', 'portugal'],
        'asia-pacific': ['china', 'japan', 'india', 'australia', 'singapore', 'south korea', 'indonesia', 'thailand', 'malaysia', 'philippines', 'vietnam', 'new zealand'],
        'latin-america': ['brazil', 'argentina', 'chile', 'colombia', 'peru', 'venezuela', 'uruguay'],
        'middle-east': ['united arab emirates', 'saudi arabia', 'israel', 'egypt', 'qatar', 'kuwait', 'south africa', 'nigeria', 'kenya']
      }

      const countries = regionMap[location.toLowerCase()]
      if (countries) {
        const countryConditions = countries.map(country => `location_country LIKE '%${country}%'`).join(' OR ')
        conditions.push(`(${countryConditions})`)
      } else {
        // If it's not a region, treat it as a specific location
        const sanitizedLocation = sanitizeSqlInput(location)
        conditions.push(`(location_country LIKE '%${sanitizedLocation}%' OR location_region LIKE '%${sanitizedLocation}%')`)
      }
    }
    if (city) {
      const sanitizedCity = sanitizeSqlInput(city)
      conditions.push(`(location_locality LIKE '%${sanitizedCity}%' OR location_region LIKE '%${sanitizedCity}%')`)
    }

    // Technologies - PDL supports querying array fields directly
    if (technologies && technologies.length > 0) {
      // Use IN operator for array field matching
      const sanitizedTechs = technologies.map((t: string) => `'${sanitizeSqlInput(t.toLowerCase())}'`).join(', ')
      conditions.push(`tags IN (${sanitizedTechs})`)
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
      _originalName: company.name, // Keep for sorting
    })) || []

    // Sort results by relevance if there's a query
    if (query) {
      const lowerQuery = query.toLowerCase()
      transformedResults.sort((a: any, b: any) => {
        const aName = a._originalName.toLowerCase()
        const bName = b._originalName.toLowerCase()

        // Exact match comes first
        if (aName === lowerQuery && bName !== lowerQuery) return -1
        if (bName === lowerQuery && aName !== lowerQuery) return 1

        // Then prefix match
        const aStartsWith = aName.startsWith(lowerQuery)
        const bStartsWith = bName.startsWith(lowerQuery)
        if (aStartsWith && !bStartsWith) return -1
        if (bStartsWith && !aStartsWith) return 1

        // Then by size (larger companies first for ambiguous matches)
        return (b.employees || 0) - (a.employees || 0)
      })

      // Remove the temporary sorting field
      transformedResults.forEach((result: any) => delete result._originalName)
    }

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
})
