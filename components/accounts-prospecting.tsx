"use client"

import { useState, useEffect, Fragment } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, ChevronDown, ChevronUp, Building2, Briefcase, Zap, Newspaper, Loader2, Globe, Users, Linkedin as LinkedinIcon, Target, MessageSquare, Lightbulb, TrendingUp, DollarSign } from "lucide-react"
import { Collapsible } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

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
        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>

      {/* Filters Section */}
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        {/* Left Sidebar - Filters */}
        <div className="space-y-6">
          {/* Company Attributes Filter */}
          <Card>
            <CardHeader
              className="py-3 cursor-pointer"
              onClick={() => setIsCompanyAttributesOpen(!isCompanyAttributesOpen)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-[13px] font-semibold flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Company Attributes
                </CardTitle>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isCompanyAttributesOpen ? "rotate-180" : ""}`}
                />
              </div>
            </CardHeader>
            <Collapsible open={isCompanyAttributesOpen}>
              <CardContent className="pt-0 space-y-5">
                {/* Annual Revenue */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Annual Revenue</Label>
                    <span className="text-xs font-medium text-primary">
                      {revenueRange[0] === 1 ? "Any" : `$${revenueRange[0]}M`} - {revenueRange[1] === 1000 ? "Any" : `$${revenueRange[1]}M`}
                    </span>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={revenueRange}
                      min={1}
                      max={1000}
                      step={10}
                      onValueChange={setRevenueRange}
                      className="my-5"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>$1M</span>
                      <span>$500M</span>
                      <span>$1B+</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Headcount */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Headcount</Label>
                    <span className="text-xs font-medium text-primary">
                      {headcountRange[0] === 10 ? "Any" : headcountRange[0].toLocaleString()} - {headcountRange[1] >= 10000 ? "10,000+" : headcountRange[1].toLocaleString()}
                    </span>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={headcountRange.map(v => v >= 10000 ? 1000 : Math.round(v / 10))}
                      min={1}
                      max={1000}
                      step={1}
                      onValueChange={(values) => {
                        setHeadcountRange(values.map(v => v >= 1000 ? 10000 : v * 10))
                      }}
                      className="my-5"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>10</span>
                      <span>2,500</span>
                      <span>5,000</span>
                      <span>10,000+</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* HQ Location */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">HQ Location</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="north-america">North America</SelectItem>
                      <SelectItem value="europe">Europe</SelectItem>
                      <SelectItem value="asia-pacific">Asia Pacific</SelectItem>
                      <SelectItem value="latin-america">Latin America</SelectItem>
                      <SelectItem value="middle-east">Middle East & Africa</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="City or Country"
                    className="mt-2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <Separator />

                {/* Industry */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Industry</Label>
                  <div className="space-y-2">
                    {["Technology", "Financial Services", "Healthcare", "Manufacturing", "Retail"].map((industry) => (
                      <div key={industry} className="flex items-center space-x-2">
                        <Checkbox
                          id={`industry-${industry.toLowerCase()}`}
                          checked={industries.includes(industry)}
                          onCheckedChange={() => toggleIndustry(industry)}
                        />
                        <Label htmlFor={`industry-${industry.toLowerCase()}`} className="text-sm font-normal">
                          {industry}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Technologies Used */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Technologies Used</Label>
                  <div className="space-y-2">
                    {["Salesforce", "HubSpot", "Marketo", "AWS", "Slack"].map((tech) => (
                      <div key={tech} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tech-${tech.toLowerCase()}`}
                          checked={technologies.includes(tech)}
                          onCheckedChange={() => toggleTechnology(tech)}
                        />
                        <Label htmlFor={`tech-${tech.toLowerCase()}`} className="text-sm font-normal">
                          {tech}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Collapsible>
          </Card>

          {/* Spotlight Filters */}
          <Card>
            <CardHeader className="py-3 cursor-pointer" onClick={() => setIsSpotlightOpen(!isSpotlightOpen)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[13px] font-semibold flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Spotlight
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isSpotlightOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            <Collapsible open={isSpotlightOpen}>
              <CardContent className="pt-0 space-y-4">
                {/* Job Opportunities */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <Briefcase className="h-3 w-3 mr-2" />
                    Job Opportunities
                  </Label>
                  <div className="space-y-2">
                    {["Hiring Sales Roles", "Hiring Marketing Roles", "Hiring Leadership"].map((job) => (
                      <div key={job} className="flex items-center space-x-2">
                        <Checkbox
                          id={`job-${job.toLowerCase().replace(/\s+/g, "-")}`}
                          checked={jobOpportunities.includes(job)}
                          onCheckedChange={() => toggleJobOpportunity(job)}
                        />
                        <Label
                          htmlFor={`job-${job.toLowerCase().replace(/\s+/g, "-")}`}
                          className="text-sm font-normal"
                        >
                          {job}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Recent Activities */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <Newspaper className="h-3 w-3 mr-2" />
                    Recent Activities
                  </Label>
                  <div className="space-y-2">
                    {["Funding Rounds", "Leadership Changes", "Product Launches", "Expansion News"].map((activity) => (
                      <div key={activity} className="flex items-center space-x-2">
                        <Checkbox
                          id={`activity-${activity.toLowerCase().replace(/\s+/g, "-")}`}
                          checked={recentActivities.includes(activity)}
                          onCheckedChange={() => toggleRecentActivity(activity)}
                        />
                        <Label
                          htmlFor={`activity-${activity.toLowerCase().replace(/\s+/g, "-")}`}
                          className="text-sm font-normal"
                        >
                          {activity}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Collapsible>
          </Card>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSearch} disabled={isLoading}>
              Apply Filters
            </Button>
            <Button variant="outline" onClick={handleReset}>Reset</Button>
          </div>
        </div>

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
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border whitespace-nowrap">Industry</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border whitespace-nowrap">Location</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border whitespace-nowrap">Employees</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border whitespace-nowrap">Buying Signals</th>
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
                            {/* Industry */}
                            <td className="px-4 py-2.5">
                              <span className="text-[13px] text-muted-foreground">{toTitleCase(company.industry) || '—'}</span>
                            </td>
                            {/* Location */}
                            <td className="px-4 py-2.5">
                              <span className="text-[13px] text-muted-foreground whitespace-nowrap">{toTitleCase(company.location) || '—'}</span>
                            </td>
                            {/* Employees */}
                            <td className="px-4 py-2.5">
                              <span className="text-[13px] text-muted-foreground whitespace-nowrap">
                                {company.employees ? company.employees.toLocaleString() : '—'}
                              </span>
                            </td>
                            {/* Buying Signals */}
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
                              <td colSpan={6} className="px-6 py-4">
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
    </div>
  )
}
