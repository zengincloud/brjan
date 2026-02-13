import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// POST /api/search/companies - Search for companies using PDL Company Search API
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const apiKey = process.env.PDL_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "PDL API key not configured. Add PDL_API_KEY to your .env file." },
        { status: 500 }
      )
    }

    const body = await request.json()
    const {
      query,
      industry,
      revenueRange,
      headcountRange,
      location,
      city,
      technologies,
      jobOpportunities,
      recentActivities,
      limit = 10,
    } = body

    // Build Elasticsearch DSL query for PDL
    const mustClauses: any[] = []

    // Company name or domain search
    if (query) {
      const trimmed = query.trim()
      // Check if it looks like a domain (e.g. salesforce.com)
      if (trimmed.match(/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/)) {
        mustClauses.push({ term: { website: trimmed.toLowerCase() } })
      } else {
        // Use match for fuzzy company name search
        mustClauses.push({ match: { name: trimmed.toLowerCase() } })
      }
    }

    // Industry filter
    if (industry?.length) {
      mustClauses.push({
        terms: { industry: industry.map((i: string) => i.toLowerCase()) }
      })
    }

    // Headcount / Employee count range
    if (headcountRange && headcountRange.length === 2) {
      const [min, max] = headcountRange
      const rangeFilter: any = {}
      if (min > 10) rangeFilter.gte = min
      if (max < 50000) rangeFilter.lte = max
      if (Object.keys(rangeFilter).length > 0) {
        mustClauses.push({ range: { employee_count: rangeFilter } })
      }
    }

    // Revenue range - map slider $M values to PDL inferred_revenue enum values
    if (revenueRange && revenueRange.length === 2) {
      const [minRev, maxRev] = revenueRange // in millions
      const revenueEnums = [
        { label: "$1M-$10M", min: 1, max: 10 },
        { label: "$10M-$50M", min: 10, max: 50 },
        { label: "$50M-$100M", min: 50, max: 100 },
        { label: "$100M-$500M", min: 100, max: 500 },
        { label: "$500M-$1B", min: 500, max: 1000 },
        { label: "$1B-$10B", min: 1000, max: 10000 },
        { label: "$10B+", min: 10000, max: Infinity },
      ]
      const matchingRevenues = revenueEnums
        .filter(r => r.max >= minRev && r.min <= maxRev)
        .map(r => r.label)
      // Only apply filter if it's not selecting all ranges (i.e. user actually narrowed it)
      if (matchingRevenues.length > 0 && matchingRevenues.length < revenueEnums.length) {
        mustClauses.push({ terms: { inferred_revenue: matchingRevenues } })
      }
    }

    // Location - region mapping
    if (location) {
      const regionCountries: Record<string, string[]> = {
        'north-america': ['united states', 'canada'],
        'europe': ['united kingdom', 'germany', 'france', 'spain', 'italy', 'netherlands', 'sweden', 'switzerland'],
        'asia-pacific': ['australia', 'japan', 'india', 'singapore', 'china', 'south korea'],
        'latin-america': ['brazil', 'mexico', 'argentina', 'colombia', 'chile'],
        'middle-east': ['united arab emirates', 'saudi arabia', 'israel', 'qatar'],
      }
      const countries = regionCountries[location.toLowerCase()]
      if (countries) {
        mustClauses.push({ terms: { "location.country": countries } })
      }
    }

    // City filter
    if (city) {
      mustClauses.push({ term: { "location.locality": city.trim().toLowerCase() } })
    }

    // Technologies (PDL "tags" field)
    if (technologies?.length) {
      for (const tech of technologies) {
        mustClauses.push({ term: { tags: tech.toLowerCase() } })
      }
    }

    // Recent activities / buying signals
    if (recentActivities?.length) {
      if (recentActivities.includes("Funding Rounds")) {
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        mustClauses.push({
          range: { last_funding_date: { gte: oneYearAgo.toISOString().split('T')[0] } }
        })
      }
      if (recentActivities.includes("Leadership Changes")) {
        mustClauses.push({ exists: { field: "recent_exec_hires" } })
      }
    }

    // Job opportunities - hiring signals
    if (jobOpportunities?.length) {
      if (jobOpportunities.includes("Hiring Leadership")) {
        mustClauses.push({ exists: { field: "recent_exec_hires" } })
      }
      if (jobOpportunities.includes("Hiring Sales Roles") || jobOpportunities.includes("Hiring Marketing Roles")) {
        mustClauses.push({
          range: { "employee_growth_rate.12_month": { gt: 0.05 } }
        })
      }
    }

    // Build final query
    const esQuery = mustClauses.length > 0
      ? { bool: { must: mustClauses } }
      : { match_all: {} }

    console.log("PDL company search query:", JSON.stringify(esQuery, null, 2))

    const response = await fetch("https://api.peopledatalabs.com/v5/company/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        query: esQuery,
        size: Math.min(limit, 100),
        titlecase: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("PDL API error:", response.status, errorData)
      return NextResponse.json(
        { error: errorData.error?.message || errorData.error?.type || "Failed to search companies" },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log("PDL response total:", data.total, "returned:", data.data?.length)

    // Transform PDL results to our CompanyResult format
    const companies = (data.data || []).map((company: any) => {
      // Build buying signals from available data
      const buyingSignals: string[] = []
      if (company.last_funding_date) {
        const fundingMonthsAgo = Math.round(
          (Date.now() - new Date(company.last_funding_date).getTime()) / (1000 * 60 * 60 * 24 * 30)
        )
        if (fundingMonthsAgo < 12) {
          const stage = company.latest_funding_stage ? `${company.latest_funding_stage}` : "Funding"
          const raised = company.total_funding_raised
            ? ` ($${(company.total_funding_raised / 1_000_000).toFixed(0)}M raised)`
            : ""
          buyingSignals.push(`${stage}${raised} - ${fundingMonthsAgo}mo ago`)
        }
      }
      if (company.recent_exec_hires?.length) {
        buyingSignals.push(`${company.recent_exec_hires.length} recent exec hire(s)`)
      }
      if (company.employee_growth_rate?.["12_month"] > 0.1) {
        buyingSignals.push(`${Math.round(company.employee_growth_rate["12_month"] * 100)}% headcount growth (12mo)`)
      }

      let website = company.website || null
      if (website && !website.startsWith('http')) {
        website = `https://${website}`
      }

      let linkedinUrl = company.linkedin_url || null
      if (linkedinUrl && !linkedinUrl.startsWith('http')) {
        linkedinUrl = `https://${linkedinUrl}`
      }

      return {
        id: company.id || company.website || company.name,
        name: company.display_name || company.name || "",
        industry: company.industry || null,
        location: company.location?.name || "",
        website,
        employees: company.employee_count || null,
        size: company.size || null,
        revenue: company.inferred_revenue || null,
        verified: !!company.linkedin_url,
        linkedin: linkedinUrl,
        description: company.summary || company.headline || null,
        founded: company.founded || null,
        technologies: company.tags || [],
        buyingSignals,
      }
    })

    return NextResponse.json({
      results: companies,
      total: data.total || companies.length,
      limit,
      offset: 0,
    })
  } catch (error: any) {
    console.error("Error searching companies:", error)
    return NextResponse.json(
      { error: error.message || "Failed to search companies" },
      { status: 500 }
    )
  }
})
