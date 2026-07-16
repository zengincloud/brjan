import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// POST /api/search/people - Search for people using PDL Person Search API (no credits consumed for browsing)
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  function toTitleCase(str: string | null | undefined): string {
    if (typeof str !== "string" || !str) return ""
    return str.toLowerCase().split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
  }

  function calculateBuyerIntent(person: any): "high" | "medium" | "low" {
    let score = 0
    const title = (person.job_title || "").toLowerCase()
    const seniorTitles = ["ceo", "cto", "cfo", "coo", "cmo", "vp", "vice president", "president", "founder", "owner", "partner"]
    if (seniorTitles.some(t => title.includes(t))) score += 2
    const decisionKeywords = ["director", "head", "chief", "managing"]
    if (decisionKeywords.some(k => title.includes(k))) score += 1
    if (title.includes("manager") || title.includes("lead")) score += 1
    if (score >= 3) return "high"
    if (score >= 1) return "medium"
    return "low"
  }

  try {
    const apiKey = process.env.PDL_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "PDL API key not configured" }, { status: 500 })
    }

    const body = await request.json()
    const {
      query,
      nameFilter,
      jobTitle,
      jobFunction,
      seniorityLevel,
      currentCompany,
      companyDomain,
      companyHeadcount,
      geography,
      city,
      industry,
      excludedNames,
      excludedCompanies,
      excludedTitles,
      excludedIndustries,
      limit = 30,
      scrollToken,
    } = body

    const mustClauses: any[] = []
    const mustNotClauses: any[] = []
    let isNameSearch = false

    // Name filter
    if (nameFilter) {
      const parts = nameFilter.trim().split(/\s+/)
      if (parts.length >= 2) {
        mustClauses.push({ term: { first_name: parts[0].toLowerCase() } })
        mustClauses.push({ term: { last_name: parts.slice(1).join(" ").toLowerCase() } })
      } else {
        mustClauses.push({ term: { first_name: parts[0].toLowerCase() } })
      }
    }

    // Free-text query — detect person name vs job title
    if (query && !jobTitle?.length) {
      const trimmedQuery = query.trim()
      const queryParts = trimmedQuery.split(/\s+/)
      const titleKeywords = [
        "ceo","cto","cfo","coo","cmo","vp","vice","president","director","manager",
        "head","chief","lead","senior","junior","engineer","developer","analyst",
        "consultant","specialist","coordinator","associate","intern","sales",
        "marketing","product","design","software","data","account","executive",
        "officer","founder","partner","architect",
      ]
      const looksLikeName = queryParts.length >= 2 && queryParts.length <= 3 &&
        !titleKeywords.some(kw => trimmedQuery.toLowerCase().includes(kw))

      if (looksLikeName) {
        mustClauses.push({ term: { first_name: queryParts[0].toLowerCase() } })
        mustClauses.push({ term: { last_name: queryParts.slice(1).join(" ").toLowerCase() } })
        isNameSearch = true
      } else {
        mustClauses.push({ match: { job_title: trimmedQuery } })
      }
    }

    // Job titles
    if (jobTitle) {
      const titles = (Array.isArray(jobTitle) ? jobTitle : [jobTitle]).filter((t: string) => t?.trim())
      if (titles.length === 1) {
        mustClauses.push({ match: { job_title: titles[0].trim() } })
      } else if (titles.length > 1) {
        mustClauses.push({
          bool: {
            should: titles.map((t: string) => ({ match: { job_title: t.trim() } })),
          },
        })
      }
    }

    // Excluded titles
    if (excludedTitles?.length) {
      excludedTitles.filter((t: string) => t?.trim()).forEach((t: string) => {
        mustNotClauses.push({ match: { job_title: t.trim() } })
      })
    }

    // Job function → PDL job_title_role
    if (jobFunction) {
      const roleMap: Record<string, string> = {
        sales: "sales", marketing: "marketing", it: "engineering",
        finance: "finance", hr: "human_resources", operations: "operations",
        product: "product", engineering: "engineering", design: "design",
        legal: "legal", education: "education", health: "health",
        customer_service: "customer_service", public_relations: "public_relations",
        media: "media", real_estate: "real_estate", trades: "trades",
      }
      const role = roleMap[jobFunction.toLowerCase()] || jobFunction.toLowerCase()
      mustClauses.push({ term: { job_title_role: role } })
    }

    // Seniority → PDL job_title_levels
    if (seniorityLevel?.length) {
      const levelMap: Record<string, string[]> = {
        "C-Suite": ["cxo", "owner"],
        "VP": ["vp"],
        "Director": ["director"],
        "Manager": ["manager"],
        "Individual Contributor": ["senior", "entry", "training"],
      }
      const pdlLevels: string[] = []
      seniorityLevel.forEach((level: string) => {
        const mapped = levelMap[level]
        if (mapped) pdlLevels.push(...mapped)
      })
      if (pdlLevels.length > 0) mustClauses.push({ terms: { job_title_levels: pdlLevels } })
    }

    // Company — prefer domain when available, fall back to name
    if (companyDomain) {
      mustClauses.push({ term: { job_company_website: companyDomain.trim().toLowerCase() } })
    } else if (currentCompany) {
      mustClauses.push({ match: { job_company_name: currentCompany.trim() } })
    }

    // Excluded companies
    if (excludedCompanies?.length) {
      excludedCompanies.filter((c: string) => c?.trim()).forEach((c: string) => {
        mustNotClauses.push({ match: { job_company_name: c.trim() } })
      })
    }

    // Headcount range
    if (companyHeadcount?.length === 2) {
      const [min, max] = companyHeadcount
      const rangeFilter: any = {}
      if (min > 1) rangeFilter.gte = min
      if (max < 10000) rangeFilter.lte = max
      if (Object.keys(rangeFilter).length > 0) {
        mustClauses.push({ range: { job_company_employee_count: rangeFilter } })
      }
    }

    // Geography (region selector) → filter by country
    if (geography) {
      const regionCountries: Record<string, string[]> = {
        "north-america": ["united states", "canada"],
        "europe": ["united kingdom", "germany", "france", "spain", "italy", "netherlands", "sweden", "switzerland"],
        "asia-pacific": ["australia", "japan", "india", "singapore", "china", "south korea"],
        "latin-america": ["brazil", "mexico", "argentina", "colombia", "chile"],
        "middle-east": ["united arab emirates", "saudi arabia", "israel", "qatar"],
      }
      const countries = regionCountries[geography.toLowerCase()]
      if (countries) mustClauses.push({ bool: { should: countries.map((c: string) => ({ match: { location_country: c } })) } })
    }

    // City/country text tags — match against locality, country, and region
    // Uses should so "Vancouver" hits location_locality OR location_country OR location_region
    if (city) {
      const cityList = (Array.isArray(city) ? city : [city]).filter((c: string) => c?.trim())
      if (cityList.length > 0) {
        const locationShould = cityList.flatMap((c: string) => {
          const v = c.trim()
          return [
            { match: { location_locality: v } },
            { match: { location_country: v } },
            { match: { location_region: v } },
          ]
        })
        mustClauses.push({ bool: { should: locationShould } })
      }
    }

    // Industry
    if (industry?.length) {
      const industryMap: Record<string, string[]> = {
        "technology": ["information technology and services", "computer software", "internet"],
        "software & saas": ["computer software", "internet", "information technology and services"],
        "financial services": ["financial services", "investment management", "capital markets"],
        "banking": ["banking", "financial services"],
        "healthcare": ["hospital & health care", "health wellness and fitness", "medical devices"],
        "pharmaceuticals": ["pharmaceuticals", "biotechnology"],
        "manufacturing": ["mechanical or industrial engineering", "industrial automation", "machinery"],
        "retail & e-commerce": ["retail", "consumer goods", "apparel & fashion"],
        "real estate": ["real estate", "commercial real estate"],
        "education": ["higher education", "e-learning", "primary/secondary education"],
        "media & entertainment": ["media production", "broadcast media", "entertainment"],
        "telecommunications": ["telecommunications", "wireless"],
        "transportation & logistics": ["transportation/trucking/railroad", "logistics and supply chain", "airlines/aviation"],
        "energy & utilities": ["utilities", "oil & energy", "renewables & environment"],
        "government": ["government administration", "government relations"],
        "non-profit": ["non-profit organization management", "civic & social organization"],
        "legal services": ["law practice", "legal services"],
        "consulting": ["management consulting", "business supplies and equipment"],
        "marketing & advertising": ["marketing and advertising", "public relations and communications"],
      }
      const pdlIndustries: string[] = []
      industry.forEach((i: string) => {
        const mapped = industryMap[i.toLowerCase()]
        if (mapped?.length) pdlIndustries.push(...mapped)
        else pdlIndustries.push(i.toLowerCase())
      })
      if (pdlIndustries.length > 0) mustClauses.push({ terms: { job_company_industry: pdlIndustries } })
    }

    // Excluded industries
    if (excludedIndustries?.length) {
      const vals = excludedIndustries.filter((i: string) => i?.trim()).map((i: string) => i.trim().toLowerCase())
      if (vals.length > 0) mustNotClauses.push({ terms: { job_company_industry: vals } })
    }

    const esQuery: any = { bool: {} }
    if (mustClauses.length > 0) esQuery.bool.must = mustClauses
    if (mustNotClauses.length > 0) esQuery.bool.must_not = mustNotClauses

    console.log("PDL person search query:", JSON.stringify(esQuery, null, 2))

    const doSearch = async (q: any, token?: string) => {
      const payload: any = { query: q, size: Math.min(limit, 30) }
      if (token) payload.scroll_token = token
      const response = await fetch("https://api.peopledatalabs.com/v5/person/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-api-key": apiKey,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("PDL person search error:", errorData)
        return { ok: false, errorData, status: response.status }
      }

      const data = await response.json()
      console.log("PDL person search total:", data.total)

      const profiles = (data.data || []).map((person: any) => {
        let linkedinUrl = person.linkedin_url
        if (linkedinUrl && !linkedinUrl.startsWith("http")) linkedinUrl = `https://${linkedinUrl}`
        return {
          id: person.linkedin_url || person.id || `${person.full_name}-${person.job_company_name}`,
          name: toTitleCase(person.full_name),
          title: person.job_title || "",
          company: toTitleCase(person.job_company_name),
          location: person.location_name || "",
          email: null,
          emails: [],
          phone: null,
          linkedin: linkedinUrl || null,
          seniorityLevel: person.job_title_role || null,
          companySize: person.job_company_employee_count || null,
          industry: person.job_company_industry || null,
          companyWebsite: person.job_company_website || null,
          buyerIntent: calculateBuyerIntent(person),
        }
      })

      return { ok: true, profiles, total: data.total || 0, scrollToken: data.scroll_token || null }
    }

    let result = await doSearch(esQuery, scrollToken)

    if (!result.ok) {
      return NextResponse.json(
        { error: (result as any).errorData?.error?.message || "Failed to search people" },
        { status: (result as any).status }
      )
    }

    let transformedResults = result.profiles
    const totalCount = result.total

    // Fallback: domain search got 0 → retry with company name only
    if (transformedResults.length === 0 && companyDomain && currentCompany) {
      console.log("Domain search returned 0, retrying with company name only...")
      const withoutDomain = {
        bool: {
          must: [
            ...mustClauses.filter((c: any) => !c.term?.job_company_website),
            { match: { job_company_name: currentCompany.trim() } },
          ],
          ...(mustNotClauses.length > 0 ? { must_not: mustNotClauses } : {}),
        },
      }
      const fallback = await doSearch(withoutDomain)
      if (fallback.ok && fallback.profiles.length > 0) transformedResults = fallback.profiles
    }

    // Fallback: any search + company got 0 → retry without company constraint
    // (PDL may store the company name differently than what the user typed)
    if (transformedResults.length === 0 && currentCompany && (query || isNameSearch || nameFilter || jobTitle?.length)) {
      console.log("Name + company returned 0, retrying without company filter...")
      const withoutCompany = {
        bool: {
          must: mustClauses.filter((c: any) => !c.match?.job_company_name && !c.term?.job_company_website),
          ...(mustNotClauses.length > 0 ? { must_not: mustNotClauses } : {}),
        },
      }
      const fallback = await doSearch(withoutCompany)
      if (fallback.ok && fallback.profiles.length > 0) transformedResults = fallback.profiles
    }

    // Client-side: filter excluded names
    if (excludedNames?.length) {
      const excludeLower = excludedNames.map((n: string) => n.toLowerCase())
      transformedResults = transformedResults.filter((r: any) =>
        !excludeLower.some((name: string) => r.name.toLowerCase().includes(name))
      )
    }

    return NextResponse.json({ results: transformedResults, total: totalCount || transformedResults.length, limit, scrollToken: result.scrollToken })
  } catch (error: any) {
    console.error("Error searching people:", error)
    return NextResponse.json({ error: error.message || "Failed to search people" }, { status: 500 })
  }
})
