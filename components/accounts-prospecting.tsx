"use client"

import { useState, useEffect } from "react"
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
  const [revenueRange, setRevenueRange] = useState([10, 500])
  const [headcountRange, setHeadcountRange] = useState([10, 5000])

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
        setRevenueRange(state.revenueRange || [10, 500])
        setHeadcountRange(state.headcountRange || [10, 5000])
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
      const response = await fetch("/api/search/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          industry: industries,
          revenueRange,
          headcountRange,
          location,
          city,
          technologies,
          jobOpportunities,
          recentActivities,
          limit: 1,
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
    setRevenueRange([10, 500])
    setHeadcountRange([10, 5000])
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
          website: company.website,
          employeeCount: company.employees,
          revenue: company.revenue,
          status: "new_lead",
          source: "PDL Search",
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
        throw new Error(errorData.error || "Failed to add account")
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
            placeholder="Search for companies by name, domain, or keywords..."
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
                <CardTitle className="text-md flex items-center">
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
                      {headcountRange[0] === 10 ? "Any" : headcountRange[0].toLocaleString()} - {headcountRange[1] === 5000 ? "Any" : headcountRange[1].toLocaleString()}
                    </span>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={headcountRange}
                      min={10}
                      max={5000}
                      step={50}
                      onValueChange={setHeadcountRange}
                      className="my-5"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>10</span>
                      <span>2,500</span>
                      <span>5,000+</span>
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
                <CardTitle className="text-md flex items-center">
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
            <CardTitle>Search Results</CardTitle>
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
                <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                <h3 className="text-lg font-medium mb-2">Searching...</h3>
                <p className="text-muted-foreground">Finding companies that match your criteria</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No companies found</h3>
                <p className="text-muted-foreground max-w-md">
                  Try adjusting your search criteria or filters to find companies that match your prospecting needs.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((company) => {
                  const isExpanded = expandedCards.has(company.id)

                  return (
                    <Card key={company.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Preview Card (Always Visible) */}
                          <div className="flex items-start justify-between">
                            <div
                              className="space-y-2 flex-1"
                              onClick={() => toggleExpanded(company.id)}
                            >
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{toTitleCase(company.name)}</h3>
                                {company.verified && <Badge className="bg-primary/20 text-primary">Verified</Badge>}
                              </div>
                              {company.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{company.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Building2 className="h-4 w-4" />
                                  {toTitleCase(company.industry)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Globe className="h-4 w-4" />
                                  {toTitleCase(company.location)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {company.employees?.toLocaleString()} employees
                                </div>
                              </div>
                              {company.buyingSignals && company.buyingSignals.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {company.buyingSignals.map((signal, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {signal}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleExpanded(company.id)}
                                title={isExpanded ? "Show less" : "Show more"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                              {company.linkedin && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={company.linkedin} target="_blank" rel="noopener noreferrer">
                                    <LinkedinIcon className="mr-2 h-4 w-4" />
                                    LinkedIn
                                  </a>
                                </Button>
                              )}
                              {company.website && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={company.website} target="_blank" rel="noopener noreferrer">
                                    <Globe className="mr-2 h-4 w-4" />
                                    Website
                                  </a>
                                </Button>
                              )}
                              <Button size="sm" onClick={() => handleAddToAccounts(company)}>
                                Add to Accounts
                              </Button>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <>
                              <Separator />
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                                {/* Intent */}
                                <div className="space-y-3">
                                  <h4 className="font-medium text-sm flex items-center gap-2">
                                    <Target className="h-4 w-4" />
                                    Intent Signals
                                  </h4>
                                  <div className="space-y-2 text-sm text-muted-foreground pl-6">
                                    <div className="flex items-start gap-2">
                                      <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium text-foreground">Recent Funding</p>
                                        <p className="text-xs">Series B: $25M raised 3 months ago</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <DollarSign className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium text-foreground">Tech Stack Expansion</p>
                                        <p className="text-xs">Added 3 new tools in last quarter</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <Users className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium text-foreground">Hiring Spree</p>
                                        <p className="text-xs">25+ open positions in Sales & Ops</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Past Conversations */}
                                <div className="space-y-3">
                                  <h4 className="font-medium text-sm flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Past Conversations
                                  </h4>
                                  <div className="space-y-2 text-sm text-muted-foreground pl-6">
                                    <div className="border-l-2 border-primary/30 pl-3 py-1">
                                      <p className="text-xs text-muted-foreground mb-1">Nov 15, 2025</p>
                                      <p className="font-medium text-foreground">Initial Discovery Call</p>
                                      <p className="text-xs">Discussed scaling challenges with John Smith (VP Sales)</p>
                                    </div>
                                    <div className="border-l-2 border-muted pl-3 py-1">
                                      <p className="text-xs text-muted-foreground mb-1">Oct 3, 2025</p>
                                      <p className="font-medium text-foreground">Product Demo Request</p>
                                      <p className="text-xs">Maria Garcia (Director of Ops) attended webinar</p>
                                    </div>
                                  </div>
                                </div>

                                {/* POV */}
                                <div className="space-y-3">
                                  <h4 className="font-medium text-sm flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4" />
                                    Point of View
                                  </h4>
                                  <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
                                    <p className="mb-2">
                                      <strong className="text-foreground">Opportunity:</strong> Recent funding and aggressive hiring
                                      indicate {toTitleCase(company.name)} is in rapid growth mode and likely experiencing operational scaling challenges.
                                    </p>
                                    <p className="mb-2">
                                      <strong className="text-foreground">Industry Context:</strong> In the {company.industry} space, companies like
                                      {toTitleCase(company.name)} are currently facing challenges around AI adoption, workforce efficiency, and maintaining
                                      competitive advantage during market shifts. With increasing pressure to do more with less and demonstrate clear ROI
                                      on technology investments, this is something they're likely worried about. Automation and intelligent workflows are
                                      hot topics right now as companies seek to scale without proportional cost increases.
                                    </p>
                                    <p className="mb-2">
                                      <strong className="text-foreground">How to Help:</strong> Your platform's automation capabilities
                                      can help them scale their {company.industry.toLowerCase()} operations without proportional headcount increases.
                                    </p>
                                    <p>
                                      <strong className="text-foreground">Angle:</strong> Lead with ROI case studies from similar-sized
                                      companies. Emphasize time-to-value and ease of implementation given their rapid growth timeline.
                                      Focus on VP of Sales/Ops who owns scaling challenges.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
