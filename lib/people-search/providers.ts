// Moltsets and Wiza people-search providers, used by /api/search/people.
// Cascade order is Moltsets > Wiza > PDL. PDL stays inline in the route.

export interface PersonResult {
  id: string
  name: string
  title: string
  company: string
  location: string
  email: string | null
  emails: string[]
  phone: string | null
  linkedin: string | null
  seniorityLevel: string | null
  companySize: number | string | null
  industry: string | null
  companyWebsite: string | null
  buyerIntent: "high" | "medium" | "low"
  source: "moltsets" | "wiza" | "pdl"
}

export interface SearchCriteria {
  query?: string // free-text name/phrase
  queryIsName?: boolean // query is a person name (vs. a title phrase)
  titles: string[]
  excludedTitles: string[]
  company?: string
  companyDomain?: string
  excludedCompanies: string[]
  jobFunction?: string // lowercase UI key: sales, it, hr...
  seniority: string[] // UI labels: C-Suite, VP, Director, Manager, Individual Contributor
  headcount?: [number, number]
  countries: string[] // title-cased country names
  cities: string[] // city/region text tags
  industries: string[] // UI labels (lowercase)
  excludedIndustries: string[] // lowercase
}

export function toTitleCase(str: string | null | undefined): string {
  if (typeof str !== "string" || !str) return ""
  return str.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

export function calculateBuyerIntent(title: string | null | undefined): "high" | "medium" | "low" {
  let score = 0
  const t = (title || "").toLowerCase()
  const senior = ["ceo", "cto", "cfo", "coo", "cmo", "vp", "vice president", "president", "founder", "owner", "partner"]
  if (senior.some(k => t.includes(k))) score += 2
  if (["director", "head", "chief", "managing"].some(k => t.includes(k))) score += 1
  if (t.includes("manager") || t.includes("lead")) score += 1
  if (score >= 3) return "high"
  if (score >= 1) return "medium"
  return "low"
}

export function normalizeLinkedin(url: string | null | undefined): string | null {
  if (!url) return null
  return url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "") || null
}

export function dedupeKey(p: PersonResult): string {
  return normalizeLinkedin(p.linkedin) || `${p.name.toLowerCase()}|${p.company.toLowerCase()}`
}

const KNOWN_COUNTRIES = new Set([
  "united states", "canada", "united kingdom", "germany", "france", "spain", "italy", "netherlands",
  "sweden", "switzerland", "australia", "japan", "india", "singapore", "china", "south korea",
  "brazil", "mexico", "argentina", "colombia", "chile", "united arab emirates", "saudi arabia",
  "israel", "qatar", "ireland", "new zealand", "poland", "portugal", "belgium", "denmark",
  "norway", "finland", "austria", "south africa", "hong kong",
])

export function splitLocationTags(tags: string[]): { countries: string[]; cities: string[] } {
  const countries: string[] = []
  const cities: string[] = []
  for (const raw of tags) {
    const v = raw.trim()
    if (!v) continue
    if (KNOWN_COUNTRIES.has(v.toLowerCase())) countries.push(toTitleCase(v))
    else cities.push(v)
  }
  return { countries, cities }
}

// Buckets overlapping [min, max]. max >= 10000 means "no upper bound".
function overlappingBuckets(buckets: [string, number, number][], min: number, max: number): string[] {
  const hi = max >= 10000 ? Infinity : max
  return buckets.filter(([, lo, up]) => up >= min && lo <= hi).map(([label]) => label)
}

const MOLTSETS_EMPLOYEE: [string, number, number][] = [
  ["1-10", 1, 10], ["11-20", 11, 20], ["21-50", 21, 50], ["51-200", 51, 200],
  ["201-500", 201, 500], ["501-1000", 501, 1000], ["1001-5000", 1001, 5000], ["5001+", 5001, Infinity],
]
const WIZA_SIZE: [string, number, number][] = [
  ["1-10", 1, 10], ["11-50", 11, 50], ["51-200", 51, 200], ["201-500", 201, 500],
  ["501-1000", 501, 1000], ["1001-5000", 1001, 5000], ["5001-10000", 5001, 10000], ["10001+", 10001, Infinity],
]

function headcountActive(h?: [number, number]): h is [number, number] {
  return !!h && (h[0] > 1 || h[1] < 10000)
}

// ---------------------------------------------------------------- Moltsets

const MOLTSETS_SENIORITY: Record<string, string[]> = {
  "C-Suite": ["C Suite", "Owner"],
  "VP": ["VP"],
  "Director": ["Director", "Head"],
  "Manager": ["Manager"],
  "Individual Contributor": ["Senior", "Entry"],
}
const MOLTSETS_DEPARTMENT: Record<string, string> = {
  sales: "Sales", marketing: "Marketing", it: "Information Technology", finance: "Finance",
  hr: "Human Resources", operations: "Operations", engineering: "Engineering", design: "Design",
  legal: "Legal", education: "Education", health: "Medical & Health",
}
const MOLTSETS_INDUSTRY: Record<string, string[]> = {
  "technology": ["Information Technology"],
  "software & saas": ["Information Technology"],
  "financial services": ["Finance and Banking"],
  "banking": ["Finance and Banking"],
  "healthcare": ["Health and Pharmaceuticals"],
  "pharmaceuticals": ["Health and Pharmaceuticals"],
  "manufacturing": ["Manufacturing"],
  "retail & e-commerce": ["Retail"],
  "real estate": ["Real Estate"],
  "education": ["Education"],
  "media & entertainment": ["Media and Publishing", "Creative Arts and Entertainment"],
  "telecommunications": ["Telecommunications"],
  "transportation & logistics": ["Transportation and Logistics"],
  "energy & utilities": ["Energy", "Utilities"],
  "government": ["Government and Public Administration"],
  "non-profit": ["Non-Profit and Social Services"],
  "legal services": ["Professional and Business Services"],
  "consulting": ["Professional and Business Services"],
  "marketing & advertising": ["Marketing & Advertising"],
}

export function hasPositiveCriteria(c: SearchCriteria): boolean {
  return !!(
    c.query || c.titles.length || c.company || c.companyDomain || c.jobFunction ||
    c.seniority.length || headcountActive(c.headcount) || c.countries.length || c.cities.length ||
    c.industries.length
  )
}

export interface ProviderResult {
  profiles: PersonResult[]
  total: number
}

export async function searchMoltsets(
  c: SearchCriteria,
  limit: number,
  offset: number,
): Promise<ProviderResult | null> {
  const apiKey = process.env.MOLTSETS_API_KEY
  if (!apiKey || !hasPositiveCriteria(c)) return null

  const body: Record<string, any> = { limit: Math.min(Math.max(limit, 1), 25), offset }
  if (c.query) body.query = c.query
  if (c.titles.length) body.title = c.titles
  if (c.company && !c.companyDomain) body.company = c.company
  if (c.companyDomain) body.company_domain = c.companyDomain
  if (c.jobFunction && MOLTSETS_DEPARTMENT[c.jobFunction]) body.department = MOLTSETS_DEPARTMENT[c.jobFunction]
  const seniority = c.seniority.flatMap(s => MOLTSETS_SENIORITY[s] || [])
  if (seniority.length) body.seniority = seniority
  if (headcountActive(c.headcount)) {
    const b = overlappingBuckets(MOLTSETS_EMPLOYEE, c.headcount[0], c.headcount[1])
    if (b.length) body.employee_range = b
  }
  if (c.countries.length) body.country = c.countries
  if (c.cities.length) body.city = c.cities
  const industries = [...new Set(c.industries.flatMap(i => MOLTSETS_INDUSTRY[i] || []))]
  if (industries.length) body.industry = industries
  const exIndustries = [...new Set(c.excludedIndustries.flatMap(i => MOLTSETS_INDUSTRY[i] || []))]
  if (exIndustries.length) body.exclude_industry = exIndustries

  const res = await fetch("https://api.moltsets.com/api/v1/tools/search_people", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "User-Agent": "boilerroom-app/1.0",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error("Moltsets search error:", res.status, err?.error?.code, err?.error?.message)
    return null
  }
  const data = await res.json()
  if (data.status !== "ok") return { profiles: [], total: 0 }
  const rows: any[] = data.results?.results || []
  const profiles: PersonResult[] = rows.map(p => {
    const emails = [p.business_email, ...(p.personal_emails || []), p.personal_email]
      .filter((e): e is string => typeof e === "string" && !!e)
    const uniqueEmails = [...new Set(emails)]
    const linkedin = p.linkedin_url ? (p.linkedin_url.startsWith("http") ? p.linkedin_url : `https://${p.linkedin_url}`) : null
    const website = p.company?.website_url || (p.company?.domain ? `https://${p.company.domain}` : null)
    return {
      id: linkedin || p._id || `${p.full_name}-${p.company?.name}`,
      name: toTitleCase(p.full_name),
      title: p.title || "",
      company: toTitleCase(p.company?.name),
      location: [p.city, p.state, p.country].filter(Boolean).join(", "),
      email: uniqueEmails[0] || null,
      emails: uniqueEmails,
      phone: null,
      linkedin,
      seniorityLevel: p.functional_area?.[0] || p.seniority || null,
      companySize: p.company?.size || null,
      industry: p.company?.industry || p.current_industry || null,
      companyWebsite: website,
      buyerIntent: calculateBuyerIntent(p.title),
      source: "moltsets",
    }
  })
  return { profiles, total: data.results?.total || profiles.length }
}

// -------------------------------------------------------------------- Wiza

const WIZA_LEVEL: Record<string, string[]> = {
  "C-Suite": ["CXO", "Owner"],
  "VP": ["VP"],
  "Director": ["Director"],
  "Manager": ["Manager"],
  "Individual Contributor": ["Senior", "Entry", "Training"],
}
const WIZA_ROLE: Record<string, string> = {
  sales: "sales", marketing: "marketing", it: "engineering", finance: "finance", hr: "human_resources",
  operations: "operations", engineering: "engineering", design: "design", legal: "legal",
  education: "education", health: "health", customer_service: "customer_service",
  public_relations: "public_relations", media: "media", real_estate: "real_estate", trades: "trades",
}
const WIZA_INDUSTRY: Record<string, string[]> = {
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

// Wiza returns at most 30 profiles per search and has no documented paging.
export async function searchWiza(c: SearchCriteria, size: number): Promise<ProviderResult | null> {
  const apiKey = process.env.WIZA_API_KEY
  if (!apiKey || !hasPositiveCriteria(c) || size <= 0) return null

  const filters: Record<string, any> = {}
  const nameParts = c.query ? c.query.trim().split(/\s+/) : []
  if (c.queryIsName && nameParts.length >= 2) {
    filters.first_name = [nameParts[0]]
    filters.last_name = [nameParts.slice(1).join(" ")]
  } else if (c.queryIsName && nameParts.length === 1) {
    filters.first_name = [nameParts[0]]
  } else if (c.query) {
    filters.job_title = [{ v: c.query, s: "i" }]
  }
  if (c.titles.length) filters.job_title = [...(filters.job_title || []), ...c.titles.map(v => ({ v, s: "i" }))]
  if (c.excludedTitles.length) {
    filters.job_title = [...(filters.job_title || []), ...c.excludedTitles.map(v => ({ v, s: "e" }))]
  }
  const jobCompany = [
    ...(c.company ? [{ v: c.company, s: "i" }] : []),
    ...c.excludedCompanies.map(v => ({ v, s: "e" })),
  ]
  if (jobCompany.length) filters.job_company = jobCompany
  if (c.jobFunction && WIZA_ROLE[c.jobFunction]) filters.job_role = [WIZA_ROLE[c.jobFunction]]
  const levels = c.seniority.flatMap(s => WIZA_LEVEL[s] || [])
  if (levels.length) filters.job_title_level = levels
  if (headcountActive(c.headcount)) {
    const b = overlappingBuckets(WIZA_SIZE, c.headcount[0], c.headcount[1])
    if (b.length) filters.company_size = b
  }
  const location = [
    ...c.countries.map(v => ({ v, b: "country", s: "i" })),
    ...c.cities.map(v => ({ v, b: "city", s: "i" })),
  ]
  if (location.length) filters.location = location
  const industries = [
    ...c.industries.flatMap(i => (WIZA_INDUSTRY[i] || [i]).map(v => ({ v, s: "i" }))),
    ...c.excludedIndustries.flatMap(i => (WIZA_INDUSTRY[i] || [i]).map(v => ({ v, s: "e" }))),
  ]
  if (industries.length) filters.company_industry = industries

  // Wiza has no domain filter; the company name (when present) already narrows it.
  if (Object.keys(filters).length === 0) return null

  const res = await fetch("https://wiza.co/api/prospects/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ filters, size: Math.min(size, 30) }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error("Wiza search error:", res.status, err?.status?.message)
    return null
  }
  const data = await res.json()
  const rows: any[] = data.data?.profiles || []
  const profiles: PersonResult[] = rows.map(p => {
    const linkedin = p.linkedin_url ? (p.linkedin_url.startsWith("http") ? p.linkedin_url : `https://${p.linkedin_url}`) : null
    const site = p.job_company_website
    return {
      id: linkedin || `${p.full_name}-${p.job_company_name}`,
      name: toTitleCase(p.full_name),
      title: p.job_title || "",
      company: toTitleCase(p.job_company_name),
      location: p.location_name || "",
      email: null,
      emails: [],
      phone: null,
      linkedin,
      seniorityLevel: p.job_title_role || null,
      companySize: null,
      industry: p.industry || null,
      companyWebsite: site ? (site.startsWith("http") ? site : `https://${site}`) : null,
      buyerIntent: calculateBuyerIntent(p.job_title),
      source: "wiza",
    }
  })
  return { profiles, total: data.data?.total || profiles.length }
}
