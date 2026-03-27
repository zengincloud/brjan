"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Search,
  ChevronDown,
  Building2,
  User,
  Globe,
  Briefcase,
  Loader2,
  Check,
  Phone,
  Mail,
  ExternalLink,
  Linkedin,
  UserPlus,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

type SearchResult = {
  provider_id: string
  name: string
  first_name?: string
  last_name?: string
  headline?: string
  company?: string
  location?: string
  linkedin_url?: string
  profile_picture?: string
}

type RevealedData = {
  email?: string | null
  phone?: string | null
  emails?: { email: string; type?: string }[]
  phones?: { number: string; type?: string }[]
}

const NETWORK_OPTIONS = [
  { value: "F", label: "1st" },
  { value: "S", label: "2nd" },
  { value: "O", label: "3rd+" },
]

const SENIORITY_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "partner", label: "Partner" },
  { value: "cxo", label: "CXO" },
  { value: "vp", label: "VP" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "senior", label: "Senior" },
  { value: "entry", label: "Entry" },
  { value: "training", label: "Training" },
  { value: "unpaid", label: "Unpaid" },
]

const COMPANY_SIZE_OPTIONS = [
  { value: "A", label: "Self-employed" },
  { value: "B", label: "1-10" },
  { value: "C", label: "11-50" },
  { value: "D", label: "51-200" },
  { value: "E", label: "201-500" },
  { value: "F", label: "501-1000" },
  { value: "G", label: "1001-5000" },
  { value: "H", label: "5001-10000" },
  { value: "I", label: "10001+" },
]

const COMPANY_TYPE_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "nonprofit", label: "Non-profit" },
  { value: "government", label: "Government" },
  { value: "self_employed", label: "Self-employed" },
]

const GEOGRAPHY_OPTIONS = [
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Australia", label: "Australia" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "India", label: "India" },
  { value: "Singapore", label: "Singapore" },
  { value: "United Arab Emirates", label: "UAE" },
  { value: "Israel", label: "Israel" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Ireland", label: "Ireland" },
  { value: "Sweden", label: "Sweden" },
  { value: "Switzerland", label: "Switzerland" },
  { value: "New York", label: "New York" },
  { value: "San Francisco Bay Area", label: "SF Bay Area" },
  { value: "Los Angeles", label: "Los Angeles" },
  { value: "Chicago", label: "Chicago" },
  { value: "Boston", label: "Boston" },
  { value: "Austin", label: "Austin" },
  { value: "Seattle", label: "Seattle" },
  { value: "Miami", label: "Miami" },
  { value: "Dallas", label: "Dallas" },
  { value: "Denver", label: "Denver" },
  { value: "Atlanta", label: "Atlanta" },
  { value: "Toronto", label: "Toronto" },
  { value: "Vancouver", label: "Vancouver" },
  { value: "London", label: "London" },
]

const YEARS_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "10", label: "10" },
]

export default function LinkedInSearchPage() {
  const { toast } = useToast()

  // Company filters
  const [currentCompany, setCurrentCompany] = useState("")
  const [companyHeadcount, setCompanyHeadcount] = useState<string[]>([])
  const [pastCompany, setPastCompany] = useState("")
  const [companyType, setCompanyType] = useState("any")
  const [companyHqLocation, setCompanyHqLocation] = useState("")

  // Role filters
  const [functionFilter, setFunctionFilter] = useState("")
  const [currentJobTitle, setCurrentJobTitle] = useState("")
  const [seniorityLevel, setSeniorityLevel] = useState<string[]>([])
  const [pastJobTitle, setPastJobTitle] = useState("")
  const [yearsInCompanyMin, setYearsInCompanyMin] = useState("")
  const [yearsInCompanyMax, setYearsInCompanyMax] = useState("")
  const [yearsInPositionMin, setYearsInPositionMin] = useState("")
  const [yearsInPositionMax, setYearsInPositionMax] = useState("")

  // Personal filters
  const [geography, setGeography] = useState<string[]>([])
  const [geographySearch, setGeographySearch] = useState("")
  const [industry, setIndustry] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [profileLanguage, setProfileLanguage] = useState("")
  const [yearsOfExperienceMin, setYearsOfExperienceMin] = useState("")
  const [yearsOfExperienceMax, setYearsOfExperienceMax] = useState("")
  const [school, setSchool] = useState("")

  // Best path in
  const [networkDegree, setNetworkDegree] = useState<string[]>([])

  // Recent updates
  const [changedJobs, setChangedJobs] = useState(false)
  const [postedOnLinkedin, setPostedOnLinkedin] = useState(false)

  // Keywords
  const [keywords, setKeywords] = useState("")

  // Results state
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [page, setPage] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const [totalResults, setTotalResults] = useState(0)

  // Reveal state
  const [revealedData, setRevealedData] = useState<Map<string, RevealedData>>(new Map())
  const [revealingIds, setRevealingIds] = useState<Set<string>>(new Set())
  const [importingSelected, setImportingSelected] = useState(false)

  // Section collapse state
  const [companyOpen, setCompanyOpen] = useState(true)
  const [roleOpen, setRoleOpen] = useState(true)
  const [personalOpen, setPersonalOpen] = useState(true)
  const [pathOpen, setPathOpen] = useState(false)
  const [updatesOpen, setUpdatesOpen] = useState(false)

  // Auto-search: debounce filter changes and re-search automatically
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isFirstRender = useRef(true)

  const triggerAutoSearch = useCallback(() => {
    // Skip the initial mount render
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      handleSearchRef.current(0)
    }, 800)
  }, [])

  // Watch all filter values for changes
  useEffect(() => {
    triggerAutoSearch()
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [keywords, currentCompany, companyHeadcount, pastCompany, companyType, companyHqLocation, functionFilter, currentJobTitle, seniorityLevel, pastJobTitle, yearsInCompanyMin, yearsInCompanyMax, yearsInPositionMin, yearsInPositionMax, geography, industry, firstName, lastName, profileLanguage, yearsOfExperienceMin, yearsOfExperienceMax, school, networkDegree, changedJobs, postedOnLinkedin, triggerAutoSearch])

  const buildFilters = useCallback(() => {
    const filters: any = {}
    if (keywords) filters.keyword = keywords
    if (currentCompany) filters.company = currentCompany
    if (companyHeadcount.length) filters.companySize = companyHeadcount
    if (pastCompany) filters.pastCompany = pastCompany
    if (companyType && companyType !== "any") filters.companyType = companyType
    if (companyHqLocation) filters.companyHeadquarters = companyHqLocation
    if (functionFilter) filters.function = functionFilter
    if (currentJobTitle) filters.title = currentJobTitle
    if (seniorityLevel.length) filters.seniorityLevel = seniorityLevel
    if (pastJobTitle) filters.pastTitle = pastJobTitle
    const ycMin = yearsInCompanyMin && yearsInCompanyMin !== "any" ? yearsInCompanyMin : ""
    const ycMax = yearsInCompanyMax && yearsInCompanyMax !== "any" ? yearsInCompanyMax : ""
    if (ycMin || ycMax) {
      filters.yearsInCurrentCompany = {
        ...(ycMin && { min: parseInt(ycMin) }),
        ...(ycMax && { max: parseInt(ycMax) }),
      }
    }
    const ypMin = yearsInPositionMin && yearsInPositionMin !== "any" ? yearsInPositionMin : ""
    const ypMax = yearsInPositionMax && yearsInPositionMax !== "any" ? yearsInPositionMax : ""
    if (ypMin || ypMax) {
      filters.yearsInCurrentPosition = {
        ...(ypMin && { min: parseInt(ypMin) }),
        ...(ypMax && { max: parseInt(ypMax) }),
      }
    }
    if (geography.length) filters.location = geography.join(", ")
    if (industry) filters.industry = industry
    if (firstName) filters.firstName = firstName
    if (lastName) filters.lastName = lastName
    if (profileLanguage) filters.profileLanguage = profileLanguage
    const yeMin = yearsOfExperienceMin && yearsOfExperienceMin !== "any" ? yearsOfExperienceMin : ""
    const yeMax = yearsOfExperienceMax && yearsOfExperienceMax !== "any" ? yearsOfExperienceMax : ""
    if (yeMin || yeMax) {
      filters.yearsOfExperience = {
        ...(yeMin && { min: parseInt(yeMin) }),
        ...(yeMax && { max: parseInt(yeMax) }),
      }
    }
    if (school) filters.school = school
    if (networkDegree.length) filters.networkDegree = networkDegree
    if (changedJobs) filters.changedJobs = true
    if (postedOnLinkedin) filters.postedOnLinkedin = true
    return filters
  }, [keywords, currentCompany, companyHeadcount, pastCompany, companyType, companyHqLocation, functionFilter, currentJobTitle, seniorityLevel, pastJobTitle, yearsInCompanyMin, yearsInCompanyMax, yearsInPositionMin, yearsInPositionMax, geography, industry, firstName, lastName, profileLanguage, yearsOfExperienceMin, yearsOfExperienceMax, school, networkDegree, changedJobs, postedOnLinkedin])

  const handleSearch = useCallback(async (searchPage = 0) => {
    setSearching(true)
    setResults([]) // Clear stale results immediately
    const filters = buildFilters()
    console.log("[LinkedIn Search] filters:", filters, "page:", searchPage)
    try {
      const res = await fetch("/api/linkedin/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters, page: searchPage }),
      })
      const data = await res.json()
      console.log("[LinkedIn Search] response:", res.status, JSON.stringify(data, null, 2))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      const items = data.results?.items || []
      setResults(items)
      setTotalResults(data.results?.total || items.length)
      setPage(searchPage)
      setHasSearched(true)
      if (searchPage === 0) setSelectedIds(new Set())
      if (items.length === 0) {
        toast({ title: "No results", description: "Try broadening your filters." })
      }
    } catch (err: any) {
      console.error("[LinkedIn Search] error:", err)
      toast({ title: "Search failed", description: err.message, variant: "destructive" })
    } finally {
      setSearching(false)
    }
  }, [buildFilters, toast])

  // Keep a ref so the auto-search timeout always calls the latest version
  const handleSearchRef = useRef(handleSearch)
  handleSearchRef.current = handleSearch

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(results.map(r => r.provider_id)))
    }
  }

  const revealContact = async (result: SearchResult) => {
    if (revealedData.has(result.provider_id)) return
    setRevealingIds(prev => new Set(prev).add(result.provider_id))
    try {
      const res = await fetch("/api/search/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedinUrl: result.linkedin_url,
          fullName: result.name,
          company: result.company,
        }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setRevealedData(prev => new Map(prev).set(result.provider_id, data.data))
      } else {
        toast({ title: "No contact data found", variant: "destructive" })
      }
    } catch {
      toast({ title: "Reveal failed", variant: "destructive" })
    } finally {
      setRevealingIds(prev => {
        const next = new Set(prev)
        next.delete(result.provider_id)
        return next
      })
    }
  }

  const revealSelected = async () => {
    const toReveal = results.filter(r => selectedIds.has(r.provider_id) && !revealedData.has(r.provider_id))
    if (toReveal.length === 0) {
      toast({ title: "All selected contacts already revealed" })
      return
    }
    setImportingSelected(true)
    let revealed = 0
    for (const result of toReveal) {
      await revealContact(result)
      revealed++
    }
    toast({ title: `Revealed ${revealed} contacts` })
    setImportingSelected(false)
  }

  const importToProspects = async () => {
    const toImport = results.filter(r => selectedIds.has(r.provider_id))
    if (toImport.length === 0) return
    setImportingSelected(true)
    let imported = 0
    for (const result of toImport) {
      const revealed = revealedData.get(result.provider_id)
      try {
        const res = await fetch("/api/prospects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: result.name,
            email: revealed?.email || revealed?.emails?.[0]?.email || null,
            phone: revealed?.phone || revealed?.phones?.[0]?.number || null,
            title: result.headline || null,
            company: result.company || null,
            linkedin: result.linkedin_url || null,
            location: result.location || null,
            source: "linkedin_search",
          }),
        })
        if (res.ok) imported++
      } catch {}
    }
    toast({ title: `Imported ${imported} prospects` })
    setImportingSelected(false)
  }

  const clearFilters = () => {
    setKeywords(""); setCurrentCompany(""); setCompanyHeadcount([]); setPastCompany("")
    setCompanyType("any"); setCompanyHqLocation(""); setFunctionFilter(""); setCurrentJobTitle("")
    setSeniorityLevel([]); setPastJobTitle(""); setYearsInCompanyMin(""); setYearsInCompanyMax("")
    setYearsInPositionMin(""); setYearsInPositionMax(""); setGeography([]); setGeographySearch(""); setIndustry("")
    setFirstName(""); setLastName(""); setProfileLanguage(""); setYearsOfExperienceMin("")
    setYearsOfExperienceMax(""); setSchool(""); setNetworkDegree([]); setChangedJobs(false)
    setPostedOnLinkedin(false)
  }

  const activeFilterCount = [
    keywords, currentCompany, companyHeadcount.length, pastCompany, companyType !== "any" && companyType, companyHqLocation,
    functionFilter, currentJobTitle, seniorityLevel.length, pastJobTitle,
    yearsInCompanyMin, yearsInCompanyMax, yearsInPositionMin, yearsInPositionMax,
    geography.length, industry, firstName, lastName, profileLanguage,
    yearsOfExperienceMin, yearsOfExperienceMax, school, networkDegree.length,
    changedJobs, postedOnLinkedin,
  ].filter(Boolean).length

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-0">
      {/* Filter Sidebar */}
      <div className="w-80 shrink-0 border-r overflow-y-auto p-4 space-y-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            Lead Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs h-5">{activeFilterCount}</Badge>
            )}
          </h2>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={clearFilters}>
              Clear all
            </Button>
          )}
        </div>

        {/* Keywords */}
        <div className="pb-3">
          <Label className="text-xs text-muted-foreground">Keywords</Label>
          <Input
            placeholder="Search keywords..."
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            className="h-8 text-sm mt-1"
          />
        </div>

        <Separator />

        {/* Company Section */}
        <Collapsible open={companyOpen} onOpenChange={setCompanyOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
            Company
            <ChevronDown className={`h-3 w-3 transition-transform ${companyOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pb-3">
            <div>
              <Label className="text-xs">Current company</Label>
              <Input placeholder="e.g. Salesforce" value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Company headcount <span className="text-muted-foreground font-normal">(Sales Nav)</span></Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {COMPANY_SIZE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setCompanyHeadcount(prev => prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value])}
                    className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                      companyHeadcount.includes(opt.value) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Past company</Label>
              <Input placeholder="e.g. Google" value={pastCompany} onChange={e => setPastCompany(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Company type</Label>
              <Select value={companyType} onValueChange={setCompanyType}>
                <SelectTrigger className="h-8 text-sm mt-1">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {COMPANY_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Company HQ location</Label>
              <Input placeholder="e.g. New York" value={companyHqLocation} onChange={e => setCompanyHqLocation(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Role Section */}
        <Collapsible open={roleOpen} onOpenChange={setRoleOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
            Role
            <ChevronDown className={`h-3 w-3 transition-transform ${roleOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pb-3">
            <div>
              <Label className="text-xs">Function</Label>
              <Input placeholder="e.g. Sales, Engineering" value={functionFilter} onChange={e => setFunctionFilter(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Current job title</Label>
              <Input placeholder="e.g. VP of Sales" value={currentJobTitle} onChange={e => setCurrentJobTitle(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Seniority level</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {SENIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSeniorityLevel(prev => prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value])}
                    className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                      seniorityLevel.includes(opt.value) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Past job title</Label>
              <Input placeholder="e.g. Account Executive" value={pastJobTitle} onChange={e => setPastJobTitle(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Years in current company</Label>
              <div className="flex items-center gap-2 mt-1">
                <Select value={yearsInCompanyMin} onValueChange={setYearsInCompanyMin}>
                  <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Min" /></SelectTrigger>
                  <SelectContent>
                    {YEARS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">to</span>
                <Select value={yearsInCompanyMax} onValueChange={setYearsInCompanyMax}>
                  <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Max" /></SelectTrigger>
                  <SelectContent>
                    {YEARS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Years in current position</Label>
              <div className="flex items-center gap-2 mt-1">
                <Select value={yearsInPositionMin} onValueChange={setYearsInPositionMin}>
                  <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Min" /></SelectTrigger>
                  <SelectContent>
                    {YEARS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">to</span>
                <Select value={yearsInPositionMax} onValueChange={setYearsInPositionMax}>
                  <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Max" /></SelectTrigger>
                  <SelectContent>
                    {YEARS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Personal Section */}
        <Collapsible open={personalOpen} onOpenChange={setPersonalOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
            Personal
            <ChevronDown className={`h-3 w-3 transition-transform ${personalOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pb-3">
            <div>
              <Label className="text-xs">Geography</Label>
              {geography.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 mb-1.5">
                  {geography.map(g => (
                    <Badge key={g} variant="secondary" className="text-xs h-5 gap-1 pr-1">
                      {GEOGRAPHY_OPTIONS.find(o => o.value === g)?.label || g}
                      <button onClick={() => setGeography(prev => prev.filter(v => v !== g))} className="hover:text-destructive">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                placeholder="Search countries & cities..."
                value={geographySearch}
                onChange={e => setGeographySearch(e.target.value)}
                className="h-8 text-sm mt-1"
              />
              {geographySearch && (
                <div className="border rounded mt-1 max-h-32 overflow-y-auto bg-background shadow-sm">
                  {GEOGRAPHY_OPTIONS
                    .filter(opt => !geography.includes(opt.value) && (opt.label.toLowerCase().includes(geographySearch.toLowerCase()) || opt.value.toLowerCase().includes(geographySearch.toLowerCase())))
                    .map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setGeography(prev => [...prev, opt.value]); setGeographySearch("") }}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">Industry</Label>
              <Input placeholder="e.g. Software, Healthcare" value={industry} onChange={e => setIndustry(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">First name</Label>
                <Input placeholder="e.g. John" value={firstName} onChange={e => setFirstName(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Last name</Label>
                <Input placeholder="e.g. Smith" value={lastName} onChange={e => setLastName(e.target.value)} className="h-8 text-sm mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Profile language</Label>
              <Input placeholder="e.g. en, fr" value={profileLanguage} onChange={e => setProfileLanguage(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Years of experience</Label>
              <div className="flex items-center gap-2 mt-1">
                <Select value={yearsOfExperienceMin} onValueChange={setYearsOfExperienceMin}>
                  <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Min" /></SelectTrigger>
                  <SelectContent>
                    {YEARS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">to</span>
                <Select value={yearsOfExperienceMax} onValueChange={setYearsOfExperienceMax}>
                  <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Max" /></SelectTrigger>
                  <SelectContent>
                    {YEARS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">School</Label>
              <Input placeholder="e.g. University of Toronto" value={school} onChange={e => setSchool(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Best Path In */}
        <Collapsible open={pathOpen} onOpenChange={setPathOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
            Best Path In
            <ChevronDown className={`h-3 w-3 transition-transform ${pathOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pb-3">
            <div>
              <Label className="text-xs">Connection</Label>
              <div className="flex gap-1.5 mt-1">
                {NETWORK_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setNetworkDegree(prev => prev.includes(opt.value) ? prev.filter(v => v !== opt.value) : [...prev, opt.value])}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      networkDegree.includes(opt.value) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Recent Updates */}
        <Collapsible open={updatesOpen} onOpenChange={setUpdatesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
            Recent Updates
            <ChevronDown className={`h-3 w-3 transition-transform ${updatesOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pb-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Changed jobs</Label>
              <Switch checked={changedJobs} onCheckedChange={setChangedJobs} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Posted on LinkedIn</Label>
              <Switch checked={postedOnLinkedin} onCheckedChange={setPostedOnLinkedin} />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Search Button */}
        <div className="pt-3 sticky bottom-0 bg-background pb-4">
          <Button
            onClick={() => handleSearch(0)}
            disabled={searching}
            className="w-full"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            {searching ? "Searching..." : "Search"}
          </Button>
        </div>
      </div>

      {/* Results Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Results Header */}
        <div className="border-b px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">LinkedIn Search</h1>
            {hasSearched && (
              <span className="text-sm text-muted-foreground">
                {totalResults} results
              </span>
            )}
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
              <Button
                size="sm"
                variant="outline"
                onClick={revealSelected}
                disabled={importingSelected}
              >
                {importingSelected ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Phone className="h-3.5 w-3.5 mr-1.5" />}
                Reveal Contacts
              </Button>
              <Button
                size="sm"
                onClick={importToProspects}
                disabled={importingSelected}
              >
                {importingSelected ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1.5" />}
                Import to Prospects
              </Button>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto">
          {!hasSearched ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Search className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">Set your filters and hit Search</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">No results found. Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              {/* Select all row */}
              <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-3">
                <button
                  onClick={selectAll}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    selectedIds.size === results.length ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary"
                  }`}
                >
                  {selectedIds.size === results.length && <Check className="h-3 w-3" />}
                </button>
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size === results.length ? "Deselect all" : "Select all"}
                </span>
              </div>

              {results.map(result => {
                const selected = selectedIds.has(result.provider_id)
                const revealed = revealedData.get(result.provider_id)
                const revealing = revealingIds.has(result.provider_id)

                return (
                  <div
                    key={result.provider_id}
                    className={`px-4 py-3 border-b flex items-start gap-3 transition-colors ${
                      selected ? "bg-primary/5" : "hover:bg-muted/30"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(result.provider_id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                        selected ? "bg-primary border-primary text-primary-foreground" : "border-border hover:border-primary"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{result.name}</span>
                        {result.linkedin_url && (
                          <a href={result.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#0A66C2] hover:opacity-80">
                            <Linkedin className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      {result.headline && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{result.headline}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {result.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {result.company}
                          </span>
                        )}
                        {result.location && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {result.location}
                          </span>
                        )}
                      </div>

                      {/* Revealed contact data */}
                      {revealed && (
                        <div className="flex items-center gap-3 mt-1.5">
                          {(revealed.email || revealed.emails?.[0]) && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <Mail className="h-3 w-3" />
                              {revealed.email || revealed.emails?.[0]?.email}
                            </span>
                          )}
                          {(revealed.phone || revealed.phones?.[0]) && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <Phone className="h-3 w-3" />
                              {revealed.phone || revealed.phones?.[0]?.number}
                            </span>
                          )}
                          {!revealed.email && !revealed.emails?.length && !revealed.phone && !revealed.phones?.length && (
                            <span className="text-xs text-muted-foreground">No contact data found</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Reveal button */}
                    {!revealed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-7 text-xs"
                        onClick={() => revealContact(result)}
                        disabled={revealing}
                      >
                        {revealing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Phone className="h-3 w-3 mr-1" />
                            Reveal
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )
              })}

              {/* Pagination */}
              <div className="px-4 py-3 border-t flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0 || searching}
                  onClick={() => handleSearch(page - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">Page {page + 1}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={results.length === 0 || searching}
                  onClick={() => handleSearch(page + 1)}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
