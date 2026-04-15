"use client"

import { useState, useEffect, Fragment, ElementType } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, ChevronDown, ChevronUp, Building2, Briefcase, Zap, Newspaper, Loader2, Globe, Users, Linkedin as LinkedinIcon, Target, MessageSquare, Lightbulb, TrendingUp, DollarSign, Plus, X, Settings2, RotateCcw, SlidersHorizontal, MapPin, Clock, EyeOff } from "lucide-react"
import { Collapsible } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface CompanyResult {
  id: string
  name: string
  industry: string
  location: string
  website: string
  employees: number
  size: string
  revenue: number | null
  verified: boolean
  linkedin: string
  description: string
  founded: number
  technologies: string[]
  buyingSignals: string[]
}

// ── Filter section row ─────────────────────────────────────────────────────────

function FilterSectionRow({ icon: Icon, label, isOpen, onToggle, hasValue, onClear, children }: {
  icon: ElementType
  label: string
  isOpen: boolean
  onToggle: () => void
  hasValue: boolean
  onClear: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left",
          hasValue ? "bg-accent/10 hover:bg-accent/15" : "hover:bg-muted/50"
        )}
      >
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-[13px] flex-1">{label}</span>
        {hasValue ? (
          <button onClick={(e) => { e.stopPropagation(); onClear() }} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="ml-6 mr-2 mt-1 mb-2 space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Column definitions ──────────────────────────────────────────────────────────

type ColDef = { key: string; label: string }

const ACCT_RESULT_COLS: ColDef[] = [
  { key: 'industry',     label: 'Industry' },
  { key: 'location',     label: 'Location' },
  { key: 'employees',    label: 'Employees' },
  { key: 'buyingSignals',label: 'Buying Signals' },
  { key: 'revenue',      label: 'Revenue' },
  { key: 'founded',      label: 'Year Founded' },
  { key: 'technologies', label: 'Technologies' },
]
const DEFAULT_ACCT_RESULT_COLS = new Set(['industry', 'location', 'employees', 'buyingSignals'])

// ── Column settings dialog ──────────────────────────────────────────────────────

function AccountResultColSettings({ open, onOpenChange, visibleCols, onSave }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  visibleCols: Set<string>
  onSave: (cols: Set<string>) => void
}) {
  const [draft, setDraft] = useState<Set<string>>(new Set(visibleCols))
  useEffect(() => { if (open) setDraft(new Set(visibleCols)) }, [open, visibleCols])
  const toggle = (key: string) =>
    setDraft((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })
  const ordered = ACCT_RESULT_COLS.filter((c) => draft.has(c.key))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <DialogTitle>Company Column Settings</DialogTitle>
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">Select the columns you want to see.</p>
        </DialogHeader>
        <div className="flex gap-8 pt-2">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Columns</p>
            <div className="space-y-2.5">
              {ACCT_RESULT_COLS.map((col) => (
                <label key={col.key} className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox checked={draft.has(col.key)} onCheckedChange={() => toggle(col.key)} />
                  <span className="text-[13px]">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Column Order</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
                <span className="text-[12px] text-muted-foreground w-4 shrink-0">1</span>
                <span className="text-[13px] text-muted-foreground flex-1">Company</span>
              </div>
              {ordered.map((col, i) => (
                <div key={col.key} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border">
                  <span className="text-[12px] text-muted-foreground w-4 shrink-0">{i + 2}</span>
                  <span className="text-[13px] flex-1">{col.label}</span>
                  <button onClick={() => toggle(col.key)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" size="sm" onClick={() => setDraft(new Set(DEFAULT_ACCT_RESULT_COLS))} className="mr-auto gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={() => { onSave(draft); onOpenChange(false) }}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper function to convert text to title case
function toTitleCase(str: string | null | undefined): string {
  if (!str) return ""
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function AccountsProspecting() {
  const { toast } = useToast()
  const [isCompanyAttributesOpen, setIsCompanyAttributesOpen] = useState(true)
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(true)
  const [revenueRange, setRevenueRange] = useState([1, 1000])
  const [headcountRange, setHeadcountRange] = useState([10, 10000])

  // Search filters
  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("")
  const [city, setCity] = useState("")
  const [industries, setIndustries] = useState<string[]>([])
  const [technologies, setTechnologies] = useState<string[]>([])
  const [jobOpportunities, setJobOpportunities] = useState<string[]>([])
  const [recentActivities, setRecentActivities] = useState<string[]>([])

  // Search results
  const [searchResults, setSearchResults] = useState<CompanyResult[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // Filter panel + column settings
  const [showFilters, setShowFilters] = useState(true)
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const [visibleResultCols, setVisibleResultCols] = useState<Set<string>>(new Set(DEFAULT_ACCT_RESULT_COLS))

  // Load saved search state on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('accountsProspectingState')
    if (savedState) {
      try {
        const state = JSON.parse(savedState)
        setQuery(state.query || "")
        setLocation(state.location || "")
        setCity(state.city || "")
        setIndustries(state.industries || [])
        setTechnologies(state.technologies || [])
        setJobOpportunities(state.jobOpportunities || [])
        setRecentActivities(state.recentActivities || [])
        setRevenueRange(state.revenueRange || [1, 1000])
        setHeadcountRange(state.headcountRange || [10, 10000])
        setSearchResults(state.searchResults || [])
        setTotalResults(state.totalResults || 0)
      } catch (e) {
        console.error('Error loading saved state:', e)
      }
    }
  }, [])

  const handleSearch = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const trimmedQuery = query.trim()

      // Detect LinkedIn company page URL (linkedin.com/company/company-name)
      const companyLinkedInMatch = trimmedQuery.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/company\/([a-zA-Z0-9_-]+)/i)
      let searchQuery = trimmedQuery
      if (companyLinkedInMatch) {
        // Extract company name from the URL slug
        searchQuery = companyLinkedInMatch[1].replace(/-/g, " ")
        toast({ title: "Company LinkedIn detected", description: `Searching for "${toTitleCase(searchQuery)}"...` })
      } else {
        // Detect website domain (e.g. salesforce.com, www.stripe.com, https://google.com)
        const domainMatch = trimmedQuery.match(/^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+)\.[a-zA-Z]{2,}(?:\/.*)?$/i)
        if (domainMatch && !trimmedQuery.includes(' ')) {
          // Send the full domain so PDL can match on the website field
          searchQuery = trimmedQuery.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')
          toast({ title: "Domain detected", description: `Searching for "${searchQuery}"...` })
        }
      }

      const response = await fetch("/api/search/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          industry: industries,
          revenueRange,
          headcountRange,
          location,
          city,
          technologies,
          jobOpportunities,
          recentActivities,
          limit: 5,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to search companies")
      }

      const data = await response.json()
      setSearchResults(data.results)
      setTotalResults(data.total)

      // Save search state to sessionStorage
      const stateToSave = {
        query,
        location,
        city,
        industries,
        technologies,
        jobOpportunities,
        recentActivities,
        revenueRange,
        headcountRange,
        searchResults: data.results,
        totalResults: data.total,
      }
      sessionStorage.setItem('accountsProspectingState', JSON.stringify(stateToSave))
    } catch (err: any) {
      setError(err.message)
      console.error("Search error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setQuery("")
    setLocation("")
    setCity("")
    setIndustries([])
    setTechnologies([])
    setJobOpportunities([])
    setRecentActivities([])
    setRevenueRange([1, 1000])
    setHeadcountRange([10, 10000])
    setSearchResults([])
    setTotalResults(0)
    setError(null)

    // Clear saved state
    sessionStorage.removeItem('accountsProspectingState')
  }

  const toggleExpanded = (companyId: string) => {
    const newExpandedCards = new Set(expandedCards)
    if (newExpandedCards.has(companyId)) {
      newExpandedCards.delete(companyId)
    } else {
      newExpandedCards.add(companyId)
    }
    setExpandedCards(newExpandedCards)
  }

  const handleAddToAccounts = async (company: CompanyResult) => {
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: company.name,
          industry: company.industry,
          location: company.location,
          website: company.website,
          linkedin: company.linkedin,
          employees: company.employees,
          status: "new_lead",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 409) {
          toast({
            title: "Already Added",
            description: `${company.name} is already in your accounts list!`,
          })
          return
        }
        toast({
          title: "Error",
          description: errorData.error || "Failed to add account",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Added 1 account!",
        description: `${company.name} has been added to your accounts.`,
      })
    } catch (err: any) {
      console.error("Error adding account:", err)
      toast({
        title: "Error",
        description: "Failed to add account. Please try again.",
        variant: "destructive",
      })
    }
  }

  const toggleIndustry = (industry: string) => {
    setIndustries(prev =>
      prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]
    )
  }

  const toggleTechnology = (tech: string) => {
    setTechnologies(prev =>
      prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
    )
  }

  const toggleJobOpportunity = (job: string) => {
    setJobOpportunities(prev =>
      prev.includes(job) ? prev.filter(j => j !== job) : [...prev, job]
    )
  }

  const toggleRecentActivity = (activity: string) => {
    setRecentActivities(prev =>
      prev.includes(activity) ? prev.filter(a => a !== activity) : [...prev, activity]
    )
  }

  const activeFilterCount = (
    (query ? 1 : 0) +
    (location || city ? 1 : 0) +
    industries.length +
    technologies.length +
    jobOpportunities.length +
    recentActivities.length +
    (revenueRange[0] !== 1 || revenueRange[1] !== 1000 ? 1 : 0) +
    (headcountRange[0] !== 10 || headcountRange[1] < 10000 ? 1 : 0)
  )

  return (
    <div className="space-y-6">
      {/* Search and Keywords */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company name, domain, or paste a LinkedIn company URL..."
            className="pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button
          variant={showFilters ? "secondary" : "outline"}
          onClick={() => setShowFilters((v) => !v)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
          {!showFilters && activeFilterCount > 0 && (
            <span className="bg-accent text-white rounded-full text-[10px] px-1.5 py-0 leading-5 font-medium">{activeFilterCount}</span>
          )}
        </Button>
        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>

      {/* Filters + Results Section */}
      <div className={cn("grid gap-6", showFilters ? "md:grid-cols-[280px_1fr]" : "grid-cols-1")}>
        {/* Left Sidebar - Filters */}
        {showFilters && (
          <div className="border border-border rounded-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
              <span className="text-[12px] text-muted-foreground">{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied.</span>
            </div>

            <div className="px-3 py-2.5 border-b border-border">
              <Button variant="outline" size="sm" className="w-full h-8 text-[12px] gap-1.5 justify-start">
                <Clock className="h-3.5 w-3.5" /> Search History
              </Button>
            </div>

            {/* COMPANY FILTERS */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-2 px-1">Company Filters</p>
              <div className="space-y-0.5">

                <FilterSectionRow icon={Building2} label="Business Name"
                  isOpen={openFilter === 'query'} onToggle={() => setOpenFilter(openFilter === 'query' ? null : 'query')}
                  hasValue={!!query} onClear={() => setQuery('')}>
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Company name or domain..." className="h-8 text-[12px]" />
                </FilterSectionRow>

                <FilterSectionRow icon={MapPin} label="HQ Location"
                  isOpen={openFilter === 'location'} onToggle={() => setOpenFilter(openFilter === 'location' ? null : 'location')}
                  hasValue={!!(location || city)} onClear={() => { setLocation(''); setCity('') }}>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select region" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="north-america">North America</SelectItem>
                      <SelectItem value="europe">Europe</SelectItem>
                      <SelectItem value="asia-pacific">Asia Pacific</SelectItem>
                      <SelectItem value="latin-america">Latin America</SelectItem>
                      <SelectItem value="middle-east">Middle East & Africa</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="City or Country" value={city} onChange={(e) => setCity(e.target.value)} className="h-8 text-[12px]" />
                </FilterSectionRow>

                <FilterSectionRow icon={Briefcase} label="Industry"
                  isOpen={openFilter === 'industry'} onToggle={() => setOpenFilter(openFilter === 'industry' ? null : 'industry')}
                  hasValue={industries.length > 0} onClear={() => setIndustries([])}>
                  <div className="space-y-1.5">
                    {["Technology", "Financial Services", "Healthcare", "Manufacturing", "Retail"].map((ind) => (
                      <div key={ind} className="flex items-center gap-2">
                        <Checkbox id={`ind-${ind}`} checked={industries.includes(ind)} onCheckedChange={() => toggleIndustry(ind)} />
                        <Label htmlFor={`ind-${ind}`} className="text-[12px] font-normal">{ind}</Label>
                      </div>
                    ))}
                  </div>
                </FilterSectionRow>

                <FilterSectionRow icon={Users} label="Headcount"
                  isOpen={openFilter === 'headcount'} onToggle={() => setOpenFilter(openFilter === 'headcount' ? null : 'headcount')}
                  hasValue={headcountRange[0] !== 10 || headcountRange[1] < 10000} onClear={() => setHeadcountRange([10, 10000])}>
                  <div className="pt-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>{headcountRange[0] === 10 ? 'Any' : headcountRange[0].toLocaleString()}</span>
                      <span>{headcountRange[1] >= 10000 ? '10,000+' : headcountRange[1].toLocaleString()}</span>
                    </div>
                    <Slider value={headcountRange.map(v => v >= 10000 ? 1000 : Math.round(v / 10))} min={1} max={1000} step={1}
                      onValueChange={(vals) => setHeadcountRange(vals.map(v => v >= 1000 ? 10000 : v * 10))} className="my-3" />
                  </div>
                </FilterSectionRow>

                <FilterSectionRow icon={DollarSign} label="Revenue"
                  isOpen={openFilter === 'revenue'} onToggle={() => setOpenFilter(openFilter === 'revenue' ? null : 'revenue')}
                  hasValue={revenueRange[0] !== 1 || revenueRange[1] !== 1000} onClear={() => setRevenueRange([1, 1000])}>
                  <div className="pt-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>{revenueRange[0] === 1 ? 'Any' : `$${revenueRange[0]}M`}</span>
                      <span>{revenueRange[1] === 1000 ? 'Any' : `$${revenueRange[1]}M`}</span>
                    </div>
                    <Slider value={revenueRange} min={1} max={1000} step={10} onValueChange={setRevenueRange} className="my-3" />
                  </div>
                </FilterSectionRow>

                <FilterSectionRow icon={Briefcase} label="Job Opportunities"
                  isOpen={openFilter === 'jobs'} onToggle={() => setOpenFilter(openFilter === 'jobs' ? null : 'jobs')}
                  hasValue={jobOpportunities.length > 0} onClear={() => setJobOpportunities([])}>
                  <div className="space-y-1.5">
                    {["Hiring Sales Roles", "Hiring Marketing Roles", "Hiring Leadership"].map((job) => (
                      <div key={job} className="flex items-center gap-2">
                        <Checkbox id={`job-${job}`} checked={jobOpportunities.includes(job)} onCheckedChange={() => toggleJobOpportunity(job)} />
                        <Label htmlFor={`job-${job}`} className="text-[12px] font-normal">{job}</Label>
                      </div>
                    ))}
                  </div>
                </FilterSectionRow>

                <FilterSectionRow icon={Newspaper} label="Recent Activities"
                  isOpen={openFilter === 'activities'} onToggle={() => setOpenFilter(openFilter === 'activities' ? null : 'activities')}
                  hasValue={recentActivities.length > 0} onClear={() => setRecentActivities([])}>
                  <div className="space-y-1.5">
                    {["Funding Rounds", "Leadership Changes", "Product Launches", "Expansion News"].map((act) => (
                      <div key={act} className="flex items-center gap-2">
                        <Checkbox id={`act-${act}`} checked={recentActivities.includes(act)} onCheckedChange={() => toggleRecentActivity(act)} />
                        <Label htmlFor={`act-${act}`} className="text-[12px] font-normal">{act}</Label>
                      </div>
                    ))}
                  </div>
                </FilterSectionRow>

              </div>
            </div>

            {/* Bottom actions */}
            <div className="px-3 py-3 border-t border-border space-y-2 shrink-0">
              <Button className="w-full h-8 text-[12px]" onClick={handleSearch} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Apply Filters
              </Button>
              <Button variant="outline" className="w-full h-8 text-[12px]" onClick={handleReset}>Reset</Button>
            </div>
          </div>
        )}

        {/* Right Side - Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[13px] font-semibold">Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{totalResults}</span> companies found matching your criteria
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]" onClick={() => setColumnSettingsOpen(true)}>
                  <Settings2 className="h-3.5 w-3.5" /> Columns
                </Button>
                <Select defaultValue="relevance">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="revenue-high">Revenue (High to Low)</SelectItem>
                    <SelectItem value="revenue-low">Revenue (Low to High)</SelectItem>
                    <SelectItem value="headcount-high">Headcount (High to Low)</SelectItem>
                    <SelectItem value="headcount-low">Headcount (Low to High)</SelectItem>
                    <SelectItem value="recent-activity">Recent Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 className="h-8 w-8 text-muted-foreground mb-3 animate-spin" />
                <p className="text-[13px] font-medium">Searching...</p>
                <p className="text-[12px] text-muted-foreground mt-1">Finding companies that match your criteria</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-[13px] font-medium">No companies found</p>
                <p className="text-[12px] text-muted-foreground mt-1 max-w-xs">Try adjusting your search criteria or filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border whitespace-nowrap">Name</th>
                      {ACCT_RESULT_COLS.filter(c => visibleResultCols.has(c.key)).map(c => (
                        <th key={c.key} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border whitespace-nowrap">{c.label}</th>
                      ))}
                      <th className="px-4 py-2.5 border-b border-border w-28" />
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((company) => {
                      const isExpanded = expandedCards.has(company.id)

                      return (
                        <Fragment key={company.id}>
                          <tr
                            className="border-b border-border/60 cursor-pointer transition-colors hover:bg-muted/30"
                            onClick={() => toggleExpanded(company.id)}
                          >
                            {/* Name */}
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-medium text-foreground whitespace-nowrap">{toTitleCase(company.name)}</span>
                                {company.verified && <span className="text-[10px] text-primary">✓</span>}
                                {company.linkedin && (
                                  <a href={company.linkedin} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                    <LinkedinIcon className="h-3.5 w-3.5 text-[#0A66C2] opacity-70 hover:opacity-100" />
                                  </a>
                                )}
                                {company.website && (
                                  <a href={company.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                    <Globe className="h-3.5 w-3.5 text-muted-foreground opacity-70 hover:opacity-100" />
                                  </a>
                                )}
                              </div>
                              {company.description && (
                                <p className="text-[12px] text-muted-foreground truncate max-w-[220px]">{company.description}</p>
                              )}
                            </td>
                            {visibleResultCols.has('industry') && (
                              <td className="px-4 py-2.5">
                                <span className="text-[13px] text-muted-foreground">{toTitleCase(company.industry) || '—'}</span>
                              </td>
                            )}
                            {visibleResultCols.has('location') && (
                              <td className="px-4 py-2.5">
                                <span className="text-[13px] text-muted-foreground whitespace-nowrap">{toTitleCase(company.location) || '—'}</span>
                              </td>
                            )}
                            {visibleResultCols.has('employees') && (
                              <td className="px-4 py-2.5">
                                <span className="text-[13px] text-muted-foreground whitespace-nowrap">
                                  {company.employees ? company.employees.toLocaleString() : '—'}
                                </span>
                              </td>
                            )}
                            {visibleResultCols.has('buyingSignals') && (
                              <td className="px-4 py-2.5 max-w-[200px]">
                                {company.buyingSignals && company.buyingSignals.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {company.buyingSignals.slice(0, 2).map((signal, idx) => (
                                      <span key={idx} className="px-1.5 py-0.5 rounded text-[11px] bg-secondary text-muted-foreground border border-border">
                                        {signal}
                                      </span>
                                    ))}
                                    {company.buyingSignals.length > 2 && (
                                      <span className="text-[11px] text-muted-foreground">+{company.buyingSignals.length - 2}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[13px] text-muted-foreground">—</span>
                                )}
                              </td>
                            )}
                            {visibleResultCols.has('revenue') && (
                              <td className="px-4 py-2.5">
                                <span className="text-[13px] text-muted-foreground whitespace-nowrap">
                                  {company.revenue ? `$${company.revenue.toLocaleString()}` : '—'}
                                </span>
                              </td>
                            )}
                            {visibleResultCols.has('founded') && (
                              <td className="px-4 py-2.5">
                                <span className="text-[13px] text-muted-foreground">{company.founded || '—'}</span>
                              </td>
                            )}
                            {visibleResultCols.has('technologies') && (
                              <td className="px-4 py-2.5 max-w-[200px]">
                                {company.technologies && company.technologies.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {company.technologies.slice(0, 2).map((tech, idx) => (
                                      <span key={idx} className="px-1.5 py-0.5 rounded text-[11px] bg-secondary text-muted-foreground border border-border">{tech}</span>
                                    ))}
                                    {company.technologies.length > 2 && (
                                      <span className="text-[11px] text-muted-foreground">+{company.technologies.length - 2}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[13px] text-muted-foreground">—</span>
                                )}
                              </td>
                            )}
                            {/* Actions */}
                            <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <Button size="sm" className="h-7 text-[12px]" onClick={() => handleAddToAccounts(company)}>
                                  + Add
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => toggleExpanded(company.id)}
                                >
                                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="border-b border-border/60 bg-muted/10">
                              <td colSpan={2 + visibleResultCols.size} className="px-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Company Details</p>
                                    <div className="space-y-1.5 text-[12px] text-muted-foreground">
                                      {company.founded && <p>Founded: {company.founded}</p>}
                                      {company.size && <p>Size: {company.size}</p>}
                                      {company.revenue && <p>Revenue: ${company.revenue.toLocaleString()}</p>}
                                      {company.technologies && company.technologies.length > 0 && (
                                        <div>
                                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">Technologies</p>
                                          <div className="flex flex-wrap gap-1">
                                            {company.technologies.map((tech, idx) => (
                                              <span key={idx} className="px-1.5 py-0.5 rounded text-[11px] bg-secondary text-muted-foreground border border-border">{tech}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Point of View</p>
                                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                                      <strong className="text-foreground">Opportunity:</strong> Recent funding and aggressive hiring indicate {toTitleCase(company.name)} is in rapid growth mode and likely experiencing operational scaling challenges.
                                    </p>
                                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                                      <strong className="text-foreground">Angle:</strong> Lead with ROI case studies from similar-sized companies. Emphasize time-to-value given their growth timeline.
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AccountResultColSettings
        open={columnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
        visibleCols={visibleResultCols}
        onSave={setVisibleResultCols}
      />
    </div>
  )
}
