import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// POST /api/search/people - Search for people using People Data Labs API
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

  // Helper to sort emails - company emails first, then personal emails
  function sortEmails(emails: any[], companyDomain: string | null): string[] {
    if (!emails || emails.length === 0) return []

    const emailAddresses = emails
      .map(e => e.address)
      .filter(Boolean)

    if (!companyDomain) return emailAddresses

    // Extract domain from company name (e.g., "Salesforce" -> "salesforce.com")
    const companyDomainLower = companyDomain.toLowerCase().replace(/\s+/g, '')

    // Sort: company emails first, then others
    return emailAddresses.sort((a, b) => {
      const aDomain = a.split('@')[1]?.toLowerCase() || ''
      const bDomain = b.split('@')[1]?.toLowerCase() || ''

      const aIsCompany = aDomain.includes(companyDomainLower) || aDomain.replace('.com', '').includes(companyDomainLower)
      const bIsCompany = bDomain.includes(companyDomainLower) || bDomain.replace('.com', '').includes(companyDomainLower)

      if (aIsCompany && !bIsCompany) return -1
      if (!aIsCompany && bIsCompany) return 1
      return 0
    })
  }

  // Helper to calculate buyer intent based on person data
  function calculateBuyerIntent(person: any): "high" | "medium" | "low" {
    let score = 0

    // Recent job change
    if (person.job_start_date) {
      const startDate = new Date(person.job_start_date)
      const monthsSinceStart = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      if (monthsSinceStart < 6) score += 2
    }

    // Senior level
    if (person.job_title_levels?.includes("VP") || person.job_title_levels?.includes("CXO")) {
      score += 2
    }

    // Decision maker title keywords
    const decisionKeywords = ["director", "vp", "head", "chief", "president"]
    if (person.job_title && decisionKeywords.some(keyword => person.job_title.toLowerCase().includes(keyword))) {
      score += 1
    }

    if (score >= 4) return "high"
    if (score >= 2) return "medium"
    return "low"
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
      nameFilter,
      jobTitle,
      jobFunction,
      seniorityLevel,
      currentCompany,
      companyHeadcount,
      geography,
      city,
      industry,
      limit = 5,
      offset = 0,
    } = body

    // Build SQL WHERE conditions
    const conditions: string[] = []

    // Name filter (dedicated name search)
    if (nameFilter) {
      conditions.push(`full_name LIKE '%${sanitizeSqlInput(nameFilter)}%'`)
    }

    // Free-text search
    if (query) {
      conditions.push(`(full_name LIKE '%${sanitizeSqlInput(query)}%' OR job_title LIKE '%${sanitizeSqlInput(query)}%')`)
    }

    // Job title - supports both string and array
    if (jobTitle) {
      const titles = Array.isArray(jobTitle) ? jobTitle : [jobTitle]
      if (titles.length > 0) {
        const titleConditions = titles
          .filter((t: string) => t && t.trim())
          .map((t: string) => `job_title LIKE '%${sanitizeSqlInput(t.trim())}%'`)
          .join(' OR ')
        if (titleConditions) {
          conditions.push(`(${titleConditions})`)
        }
      }
    }

    // Job function - search in job_title_role field
    if (jobFunction) {
      // Map UI values to PDL job_title_role values
      const functionMap: { [key: string]: string[] } = {
        'sales': ['sales'],
        'marketing': ['marketing'],
        'it': ['information technology', 'it'],
        'finance': ['finance', 'accounting'],
        'hr': ['human resources', 'hr'],
        'operations': ['operations'],
        'product': ['product'],
        'engineering': ['engineering']
      }

      const roles = functionMap[jobFunction.toLowerCase()] || [jobFunction]
      const roleConditions = roles.map(role => `job_title_role LIKE '%${role}%'`).join(' OR ')
      conditions.push(`(${roleConditions})`)
    }

    // Seniority level - map UI values to PDL values
    if (seniorityLevel && seniorityLevel.length > 0) {
      const levelMap: { [key: string]: string[] } = {
        'C-Suite': ['cxo', 'owner'],
        'VP': ['vp'],
        'Director': ['director'],
        'Manager': ['manager'],
        'Individual Contributor': ['senior', 'entry', 'training']
      }

      const pdlLevels: string[] = []
      seniorityLevel.forEach((level: string) => {
        const mapped = levelMap[level]
        if (mapped) {
          pdlLevels.push(...mapped)
        }
      })

      if (pdlLevels.length > 0) {
        const levelConditions = pdlLevels.map(level => `job_title_levels LIKE '%${level}%'`).join(' OR ')
        conditions.push(`(${levelConditions})`)
      }
    }

    // Current company
    if (currentCompany) {
      conditions.push(`job_company_name LIKE '%${sanitizeSqlInput(currentCompany)}%'`)
    }

    // Company headcount range
    if (companyHeadcount && companyHeadcount.length === 2) {
      const [min, max] = companyHeadcount
      conditions.push(`(job_company_size >= ${min} AND job_company_size <= ${max})`)
    }

    // Geography - map regions to countries
    if (geography) {
      const regionMap: { [key: string]: string[] } = {
        'north-america': ['united states', 'canada', 'mexico'],
        'europe': ['united kingdom', 'germany', 'france', 'spain', 'italy', 'netherlands', 'switzerland', 'sweden', 'norway', 'denmark', 'poland', 'belgium', 'austria', 'ireland', 'portugal'],
        'asia-pacific': ['china', 'japan', 'india', 'australia', 'singapore', 'south korea', 'indonesia', 'thailand', 'malaysia', 'philippines', 'vietnam', 'new zealand'],
        'latin-america': ['brazil', 'argentina', 'chile', 'colombia', 'peru', 'venezuela', 'uruguay'],
        'middle-east': ['united arab emirates', 'saudi arabia', 'israel', 'egypt', 'qatar', 'kuwait', 'south africa', 'nigeria', 'kenya']
      }

      const countries = regionMap[geography.toLowerCase()]
      if (countries) {
        const countryConditions = countries.map(country => `location_country LIKE '%${country}%'`).join(' OR ')
        conditions.push(`(${countryConditions})`)
      }
    }
    // City/Country - supports both string and array
    if (city) {
      const cityList = Array.isArray(city) ? city : [city]
      if (cityList.length > 0) {
        const cityConditions = cityList
          .filter((c: string) => c && c.trim())
          .map((c: string) => {
            const sanitizedCity = sanitizeSqlInput(c.trim())
            return `(location_locality LIKE '%${sanitizedCity}%' OR location_region LIKE '%${sanitizedCity}%' OR location_country LIKE '%${sanitizedCity}%')`
          })
          .join(' OR ')
        if (cityConditions) {
          conditions.push(`(${cityConditions})`)
        }
      }
    }

    // Industry - use LIKE for partial matches
    if (industry && industry.length > 0) {
      const industryConditions = industry.map((i: string) => `job_company_industry LIKE '%${i}%'`).join(' OR ')
      conditions.push(`(${industryConditions})`)
    }

    // Build SQL query
    const whereClause = conditions.length > 0 ? conditions.join(" AND ") : "1=1"
    const sqlQuery = `SELECT * FROM person WHERE ${whereClause}`

    const searchParams: any = {
      sql: sqlQuery,
      size: limit,
    }

    // Log the query for debugging
    console.log("PDL SQL Query:", sqlQuery)
    console.log("Search params:", JSON.stringify(searchParams, null, 2))

    // Call People Data Labs API
    const response = await fetch("https://api.peopledatalabs.com/v5/person/search", {
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
        { error: errorData.error?.message || "Failed to search people" },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log("PDL Response:", JSON.stringify(data, null, 2))

    // Transform PDL response to our format
    const transformedResults = data.data?.map((person: any) => {
      const sortedEmails = sortEmails(person.emails || [], person.job_company_name)
      // Ensure LinkedIn URL has https:// prefix
      let linkedinUrl = person.linkedin_url
      if (linkedinUrl && !linkedinUrl.startsWith('http')) {
        linkedinUrl = `https://${linkedinUrl}`
      }
      return {
        id: person.id,
        name: toTitleCase(person.full_name),
        title: person.job_title,
        company: toTitleCase(person.job_company_name),
        location: `${person.location_locality || ""}, ${person.location_region || ""} ${person.location_country || ""}`.trim(),
        email: sortedEmails[0] || null, // Primary email (company email if available)
        emails: sortedEmails, // All emails, company emails first
        phone: person.phone_numbers?.[0] || null,
        linkedin: linkedinUrl,
        seniorityLevel: person.job_title_levels?.[0],
        companySize: person.job_company_size,
        industry: person.job_company_industry,
        buyerIntent: calculateBuyerIntent(person),
      }
    }) || []

    return NextResponse.json({
      results: transformedResults,
      total: data.total || 0,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error("Error searching people:", error)
    return NextResponse.json(
      { error: error.message || "Failed to search people" },
      { status: 500 }
    )
  }
})
