import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// POST /api/search/companies - Search for companies using Wiza Prospect Search API
// Wiza doesn't have a dedicated company search, so we search for prospects
// with company filters and extract unique companies from the results
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  function toTitleCase(str: string | null | undefined): string {
    if (!str) return ""
    return str
      .toLowerCase()
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  try {
    const apiKey = process.env.WIZA_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "Wiza API key not configured" },
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
      technologies,
      jobOpportunities,
      recentActivities,
      limit = 10,
    } = body

    // Build Wiza filters — use company-level filters
    const filters: any = {}

    // Company name search via company summary or job_company
    if (query) {
      filters.job_company = [{ v: query.trim(), s: "i" }]
    }

    // Industry
    if (industry?.length) {
      filters.company_industry = industry.map((i: string) => ({ v: i.toLowerCase(), s: "i" }))
    }

    // Headcount
    if (headcountRange && headcountRange.length === 2) {
      const [min, max] = headcountRange
      const sizeRanges = [
        { range: "1-10", minVal: 1, maxVal: 10 },
        { range: "11-50", minVal: 11, maxVal: 50 },
        { range: "51-200", minVal: 51, maxVal: 200 },
        { range: "201-500", minVal: 201, maxVal: 500 },
        { range: "501-1000", minVal: 501, maxVal: 1000 },
        { range: "1001-5000", minVal: 1001, maxVal: 5000 },
        { range: "5001-10000", minVal: 5001, maxVal: 10000 },
        { range: "10001+", minVal: 10001, maxVal: Infinity },
      ]
      const matchingRanges = sizeRanges
        .filter(r => r.maxVal >= min && r.minVal <= max)
        .map(r => r.range)
      if (matchingRanges.length > 0) {
        filters.company_size = matchingRanges
      }
    }

    // Location
    if (location) {
      const regionMap: Record<string, { v: string; b: string; s: string }[]> = {
        'north-america': [
          { v: "United States", b: "country", s: "i" },
          { v: "Canada", b: "country", s: "i" },
        ],
        'europe': [
          { v: "United Kingdom", b: "country", s: "i" },
          { v: "Germany", b: "country", s: "i" },
          { v: "France", b: "country", s: "i" },
        ],
        'asia-pacific': [
          { v: "Australia", b: "country", s: "i" },
          { v: "Japan", b: "country", s: "i" },
          { v: "India", b: "country", s: "i" },
        ],
        'latin-america': [
          { v: "Brazil", b: "country", s: "i" },
          { v: "Mexico", b: "country", s: "i" },
        ],
        'middle-east': [
          { v: "United Arab Emirates", b: "country", s: "i" },
          { v: "Saudi Arabia", b: "country", s: "i" },
        ],
      }
      const locations = regionMap[location.toLowerCase()]
      if (locations) {
        filters.company_location = locations
      } else {
        filters.company_location = [{ v: location, b: "country", s: "i" }]
      }
    }

    if (city) {
      filters.company_location = [
        ...(filters.company_location || []),
        { v: city.trim(), b: "city", s: "i" },
      ]
    }

    // Funding signals
    if (recentActivities?.includes("funding")) {
      filters.funding_date = { t: "last", v: "1y" }
    }

    // Search for C-level to get company-level data
    filters.job_title_level = filters.job_title_level || ["CXO", "Owner", "VP"]

    console.log("Wiza company search filters:", JSON.stringify(filters, null, 2))

    const response = await fetch("https://wiza.co/api/prospects/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        filters,
        size: 30, // Get max to dedupe companies
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Wiza API error:", errorData)
      return NextResponse.json(
        { error: errorData.status?.message || "Failed to search companies" },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Extract unique companies from prospect results
    const seenCompanies = new Set<string>()
    const companies: any[] = []

    for (const person of (data.data?.profiles || [])) {
      const companyName = person.job_company_name?.toLowerCase()
      if (!companyName || seenCompanies.has(companyName)) continue
      seenCompanies.add(companyName)

      companies.push({
        id: person.job_company_website || companyName,
        name: toTitleCase(person.job_company_name),
        industry: person.industry || null,
        location: person.location_name || "",
        website: person.job_company_website || null,
        employees: null,
        size: null,
        revenue: null,
        verified: !!person.linkedin_url,
        linkedin: null,
        description: null,
        founded: null,
        technologies: [],
        buyingSignals: [],
      })
    }

    return NextResponse.json({
      results: companies.slice(0, limit),
      total: companies.length,
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
