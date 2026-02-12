import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// POST /api/search/people - Search for people using Wiza Prospect Search API
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  // Helper to capitalize names properly (title case)
  function toTitleCase(str: string | null | undefined): string {
    if (!str) return ""
    return str
      .toLowerCase()
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  // Helper to calculate buyer intent based on person data
  function calculateBuyerIntent(person: any): "high" | "medium" | "low" {
    let score = 0

    // Senior level
    const title = (person.job_title || "").toLowerCase()
    const seniorTitles = ["ceo", "cto", "cfo", "coo", "cmo", "vp", "vice president", "president", "founder", "owner", "partner"]
    if (seniorTitles.some(t => title.includes(t))) score += 2

    // Decision maker title keywords
    const decisionKeywords = ["director", "head", "chief", "managing"]
    if (decisionKeywords.some(keyword => title.includes(keyword))) score += 1

    // Manager level
    if (title.includes("manager") || title.includes("lead")) score += 1

    if (score >= 3) return "high"
    if (score >= 1) return "medium"
    return "low"
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
      nameFilter,
      jobTitle,
      jobFunction,
      seniorityLevel,
      currentCompany,
      companyHeadcount,
      geography,
      city,
      industry,
      // Exclusions
      excludedNames,
      excludedCompanies,
      excludedTitles,
      excludedIndustries,
      limit = 10,
    } = body

    // Build Wiza filters object
    const filters: any = {}

    // Name filter
    if (nameFilter) {
      const parts = nameFilter.trim().split(/\s+/)
      if (parts.length >= 2) {
        filters.first_name = [parts[0]]
        filters.last_name = [parts.slice(1).join(" ")]
      } else {
        filters.first_name = [parts[0]]
      }
    }

    // Free-text query - detect if it looks like a person name (two words, no common title keywords)
    let isNameSearch = false
    if (query && !jobTitle?.length) {
      const trimmedQuery = query.trim()
      const queryParts = trimmedQuery.split(/\s+/)
      const titleKeywords = [
        "ceo", "cto", "cfo", "coo", "cmo", "vp", "vice", "president", "director",
        "manager", "head", "chief", "lead", "senior", "junior", "engineer", "developer",
        "analyst", "consultant", "specialist", "coordinator", "associate", "intern",
        "sales", "marketing", "product", "design", "software", "data", "account",
        "executive", "officer", "founder", "partner", "architect",
      ]
      const looksLikeName = queryParts.length >= 2 &&
        queryParts.length <= 3 &&
        !titleKeywords.some(kw => trimmedQuery.toLowerCase().includes(kw))

      if (looksLikeName) {
        // Treat as person name: first word = first name, rest = last name
        filters.first_name = [queryParts[0]]
        filters.last_name = [queryParts.slice(1).join(" ")]
        isNameSearch = true
      } else {
        filters.job_title = [{ v: trimmedQuery, s: "i" }]
      }
    }

    // Job titles - supports both string and array
    if (jobTitle) {
      const titles = Array.isArray(jobTitle) ? jobTitle : [jobTitle]
      const titleFilters = titles
        .filter((t: string) => t && t.trim())
        .map((t: string) => ({ v: t.trim(), s: "i" }))
      if (titleFilters.length > 0) {
        filters.job_title = [...(filters.job_title || []), ...titleFilters]
      }
    }

    // Excluded titles
    if (excludedTitles?.length) {
      const excludeFilters = excludedTitles
        .filter((t: string) => t && t.trim())
        .map((t: string) => ({ v: t.trim(), s: "e" }))
      filters.job_title = [...(filters.job_title || []), ...excludeFilters]
    }

    // Job function → Wiza job_role
    if (jobFunction) {
      const roleMap: Record<string, string> = {
        'sales': 'sales',
        'marketing': 'marketing',
        'it': 'engineering',
        'finance': 'finance',
        'hr': 'human_resources',
        'operations': 'operations',
        'product': 'engineering',
        'engineering': 'engineering',
        'design': 'design',
        'legal': 'legal',
        'education': 'education',
        'health': 'health',
        'customer_service': 'customer_service',
        'public_relations': 'public_relations',
        'media': 'media',
        'real_estate': 'real_estate',
        'trades': 'trades',
      }
      const role = roleMap[jobFunction.toLowerCase()] || jobFunction.toLowerCase()
      filters.job_role = [role]
    }

    // Seniority level → Wiza job_title_level
    if (seniorityLevel?.length) {
      const levelMap: Record<string, string[]> = {
        'C-Suite': ['CXO', 'Owner'],
        'VP': ['VP'],
        'Director': ['Director'],
        'Manager': ['Manager'],
        'Individual Contributor': ['Senior', 'Entry'],
      }
      const wizaLevels: string[] = []
      seniorityLevel.forEach((level: string) => {
        const mapped = levelMap[level]
        if (mapped) wizaLevels.push(...mapped)
      })
      if (wizaLevels.length > 0) {
        filters.job_title_level = wizaLevels
      }
    }

    // Current company
    if (currentCompany) {
      filters.job_company = [{ v: currentCompany.trim(), s: "i" }]
    }

    // Excluded companies
    if (excludedCompanies?.length) {
      const excludeCompanyFilters = excludedCompanies
        .filter((c: string) => c && c.trim())
        .map((c: string) => ({ v: c.trim(), s: "e" }))
      filters.job_company = [...(filters.job_company || []), ...excludeCompanyFilters]
    }

    // Company headcount range → Wiza company_size
    if (companyHeadcount && companyHeadcount.length === 2) {
      const [min, max] = companyHeadcount
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

    // Geography → Wiza location
    if (geography) {
      const regionMap: Record<string, { v: string; b: string; s: string }[]> = {
        'north-america': [
          { v: "United States", b: "country", s: "i" },
          { v: "Canada", b: "country", s: "i" },
        ],
        'europe': [
          { v: "United Kingdom", b: "country", s: "i" },
          { v: "Germany", b: "country", s: "i" },
          { v: "France", b: "country", s: "i" },
          { v: "Spain", b: "country", s: "i" },
          { v: "Italy", b: "country", s: "i" },
          { v: "Netherlands", b: "country", s: "i" },
        ],
        'asia-pacific': [
          { v: "Australia", b: "country", s: "i" },
          { v: "Japan", b: "country", s: "i" },
          { v: "India", b: "country", s: "i" },
          { v: "Singapore", b: "country", s: "i" },
        ],
        'latin-america': [
          { v: "Brazil", b: "country", s: "i" },
          { v: "Mexico", b: "country", s: "i" },
          { v: "Argentina", b: "country", s: "i" },
        ],
        'middle-east': [
          { v: "United Arab Emirates", b: "country", s: "i" },
          { v: "Saudi Arabia", b: "country", s: "i" },
          { v: "Israel", b: "country", s: "i" },
        ],
      }
      const locations = regionMap[geography.toLowerCase()]
      if (locations) {
        filters.location = locations
      }
    }

    // City filter → Wiza location with city type
    if (city) {
      const cityList = Array.isArray(city) ? city : [city]
      const cityLocations = cityList
        .filter((c: string) => c && c.trim())
        .map((c: string) => ({ v: c.trim(), b: "city", s: "i" }))
      if (cityLocations.length > 0) {
        filters.location = [...(filters.location || []), ...cityLocations]
      }
    }

    // Industry → Wiza company_industry
    if (industry?.length) {
      const industryFilters = industry.map((i: string) => ({ v: i.toLowerCase(), s: "i" }))
      filters.company_industry = industryFilters
    }

    // Excluded industries
    if (excludedIndustries?.length) {
      const excludeIndustryFilters = excludedIndustries
        .filter((i: string) => i && i.trim())
        .map((i: string) => ({ v: i.trim().toLowerCase(), s: "e" }))
      filters.company_industry = [...(filters.company_industry || []), ...excludeIndustryFilters]
    }

    console.log("Wiza search filters:", JSON.stringify(filters, null, 2))

    // Helper to call Wiza and transform results
    const doSearch = async (searchFilters: any) => {
      const response = await fetch("https://wiza.co/api/prospects/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          filters: searchFilters,
          size: Math.min(limit, 30), // Wiza max is 30
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Wiza API error:", errorData)
        return { ok: false, errorData, status: response.status }
      }

      const data = await response.json()
      console.log("Wiza Response:", JSON.stringify(data, null, 2))

      const profiles = (data.data?.profiles || []).map((person: any) => {
        let linkedinUrl = person.linkedin_url
        if (linkedinUrl && !linkedinUrl.startsWith('http')) {
          linkedinUrl = `https://${linkedinUrl}`
        }

        return {
          id: person.linkedin_url || `${person.full_name}-${person.job_company_name}`,
          name: toTitleCase(person.full_name),
          title: person.job_title,
          company: toTitleCase(person.job_company_name),
          location: person.location_name || "",
          email: null,
          emails: [],
          phone: null,
          linkedin: linkedinUrl,
          seniorityLevel: person.job_title_role || null,
          companySize: null,
          industry: person.industry || null,
          companyWebsite: person.job_company_website || null,
          buyerIntent: calculateBuyerIntent(person),
        }
      })

      return { ok: true, profiles, total: data.data?.total || 0 }
    }

    // Primary search with all filters
    const result = await doSearch(filters)

    if (!result.ok) {
      return NextResponse.json(
        { error: (result as any).errorData?.status?.message || "Failed to search people" },
        { status: (result as any).status }
      )
    }

    let transformedResults = result.profiles

    // Fallback: if name + company returned 0 results, retry without company filter
    // (Wiza's company matching can be too strict for exact name + company AND)
    if (transformedResults.length === 0 && isNameSearch && currentCompany) {
      console.log("Name + company search returned 0 results, retrying without company filter...")
      const { job_company, ...filtersWithoutCompany } = filters
      const fallbackResult = await doSearch(filtersWithoutCompany)

      if (fallbackResult.ok && fallbackResult.profiles.length > 0) {
        transformedResults = fallbackResult.profiles
      }
    }

    // Client-side filtering
    let filteredResults = transformedResults

    // Filter out excluded names client-side (Wiza doesn't have a name exclusion filter)
    if (excludedNames?.length) {
      const excludeLower = excludedNames.map((n: string) => n.toLowerCase())
      filteredResults = filteredResults.filter((r: any) =>
        !excludeLower.some((name: string) => r.name.toLowerCase().includes(name))
      )
    }

    return NextResponse.json({
      results: filteredResults,
      total: result.total || filteredResults.length,
      limit,
      offset: 0,
    })
  } catch (error: any) {
    console.error("Error searching people:", error)
    return NextResponse.json(
      { error: error.message || "Failed to search people" },
      { status: 500 }
    )
  }
})
