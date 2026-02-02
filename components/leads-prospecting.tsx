"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, ChevronDown, ChevronUp, Building2, Briefcase, User, BarChart, ArrowRight, Clock, Mail, Phone, Linkedin as LinkedinIcon, Loader2, MapPin, Calendar, TrendingUp } from "lucide-react"
import { Collapsible } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/components/ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SearchResult {
  id: string
  name: string
  title: string
  company: string
  location: string
  email: string | null
  emails?: string[]
  phone: string | null
  linkedin: string
  seniorityLevel: string
  companySize: string
  industry: string
  buyerIntent: "high" | "medium" | "low"
}

// Available sequences
const sequences = [
  { id: "enterprise-outreach", name: "Enterprise Outreach" },
  { id: "smb-follow-up", name: "SMB Follow-up" },
  { id: "sales-leaders", name: "Sales Leaders" },
  { id: "product-demo", name: "Product Demo Request" },
  { id: "new-lead", name: "New Lead Welcome" },
]

// Helper function to convert text to title case
function toTitleCase(str: string | null | undefined): string {
  if (!str) return ""
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function LeadsProspecting() {
  const { toast } = useToast()
  const [isCompanyOpen, setIsCompanyOpen] = useState(true)
  const [isRoleOpen, setIsRoleOpen] = useState(true)
  const [isPersonalOpen, setIsPersonalOpen] = useState(true)
  const [isBuyerIntentOpen, setIsBuyerIntentOpen] = useState(true)
  const [isBestPathOpen, setIsBestPathOpen] = useState(true)
  const [isRecentUpdatesOpen, setIsRecentUpdatesOpen] = useState(true)
  const [headcountRange, setHeadcountRange] = useState([10, 5000])

  // Search filters
  const [query, setQuery] = useState("")
  const [nameFilter, setNameFilter] = useState("")
  const [currentCompany, setCurrentCompany] = useState("")
  const [jobFunction, setJobFunction] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [geography, setGeography] = useState("")
  const [city, setCity] = useState("")
  const [buyerIntent, setBuyerIntent] = useState("all")
  const [seniorityLevels, setSeniorityLevels] = useState<string[]>([])
  const [industries, setIndustries] = useState<string[]>([])

  // Search results
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const handleSearch = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/search/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          nameFilter,
          currentCompany,
          jobFunction,
          jobTitle,
          seniorityLevel: seniorityLevels,
          companyHeadcount: headcountRange,
          geography,
          city,
          industry: industries,
          limit: 1,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to search people")
      }

      const data = await response.json()
      setSearchResults(data.results)
      setTotalResults(data.total)
    } catch (err: any) {
      setError(err.message)
      console.error("Search error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setQuery("")
    setNameFilter("")
    setCurrentCompany("")
    setJobFunction("")
    setJobTitle("")
    setGeography("")
    setCity("")
    setBuyerIntent("all")
    setSeniorityLevels([])
    setIndustries([])
    setHeadcountRange([10, 5000])
    setSearchResults([])
    setTotalResults(0)
    setError(null)
  }

  const toggleExpanded = (leadId: string) => {
    const newExpandedCards = new Set(expandedCards)
    if (newExpandedCards.has(leadId)) {
      newExpandedCards.delete(leadId)
    } else {
      newExpandedCards.add(leadId)
    }
    setExpandedCards(newExpandedCards)
  }

  const handleAddToProspects = async (lead: SearchResult) => {
    try {
      const response = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          title: lead.title,
          location: lead.location,
          linkedin: lead.linkedin,
          status: "new_lead",
          source: "PDL Search",
          pdlData: lead, // Store full PDL data
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 409) {
          toast({
            title: "Already Added",
            description: `${lead.name} is already in your prospects list!`,
          })
          return
        }
        throw new Error(errorData.error || "Failed to add prospect")
      }

      toast({
        title: "Added 1 prospect!",
        description: `${lead.name} has been added to your prospects.`,
      })
    } catch (err: any) {
      console.error("Error adding prospect:", err)
      toast({
        title: "Error",
        description: "Failed to add prospect. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddToSequence = async (lead: SearchResult, sequenceId: string) => {
    const sequence = sequences.find(s => s.id === sequenceId)
    if (!sequence) return

    toast({
      title: "Adding to sequence...",
      description: `Adding ${lead.name} to ${sequence.name}`,
    })
  }

  const toggleSeniorityLevel = (level: string) => {
    setSeniorityLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    )
  }

  const toggleIndustry = (industry: string) => {
    setIndustries(prev =>
      prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]
    )
  }

  const getBuyerIntentBadge = (intent: string) => {
    switch (intent) {
      case "high":
        return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">High Intent</Badge>
      case "medium":
        return <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">Medium Intent</Badge>
      case "low":
        return <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30">Low Intent</Badge>
      default:
        return null
    }
  }

  const getBuyerIntentText = (intent: string) => {
    switch (intent) {
      case "high":
        return "high buyer intent signals"
      case "medium":
        return "moderate engagement signals"
      case "low":
        return "low buyer intent"
      default:
        return "unknown intent signals"
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Keywords */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for leads by name, title, company, or keywords..."
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
          {/* Company Filters */}
          <Card>
            <CardHeader className="py-3 cursor-pointer" onClick={() => setIsCompanyOpen(!isCompanyOpen)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Company
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isCompanyOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            <Collapsible open={isCompanyOpen}>
              <CardContent className="pt-0 space-y-5">
                {/* Current Company */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Current Company</Label>
                  <Input
                    placeholder="Enter company name"
                    value={currentCompany}
                    onChange={(e) => setCurrentCompany(e.target.value)}
                  />
                </div>

                <Separator />

                {/* Company Headcount */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Company Headcount</Label>
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
              </CardContent>
            </Collapsible>
          </Card>

          {/* Role Filters */}
          <Card>
            <CardHeader className="py-3 cursor-pointer" onClick={() => setIsRoleOpen(!isRoleOpen)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Role
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isRoleOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            <Collapsible open={isRoleOpen}>
              <CardContent className="pt-0 space-y-5">
                {/* Function */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Function</Label>
                  <Select value={jobFunction} onValueChange={setJobFunction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select function" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="it">IT</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="hr">Human Resources</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Current Job Title */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Current Job Title</Label>
                  <Input
                    placeholder="Enter job title"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>

                <Separator />

                {/* Seniority Level */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Seniority Level</Label>
                  <div className="space-y-2">
                    {["C-Suite", "VP", "Director", "Manager", "Individual Contributor"].map((level) => (
                      <div key={level} className="flex items-center space-x-2">
                        <Checkbox
                          id={`level-${level.toLowerCase().replace(/\s+/g, "-")}`}
                          checked={seniorityLevels.includes(level)}
                          onCheckedChange={() => toggleSeniorityLevel(level)}
                        />
                        <Label
                          htmlFor={`level-${level.toLowerCase().replace(/\s+/g, "-")}`}
                          className="text-sm font-normal"
                        >
                          {level}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Collapsible>
          </Card>

          {/* Personal Filters */}
          <Card>
            <CardHeader className="py-3 cursor-pointer" onClick={() => setIsPersonalOpen(!isPersonalOpen)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Personal
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isPersonalOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            <Collapsible open={isPersonalOpen}>
              <CardContent className="pt-0 space-y-5">
                {/* Name */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Name</Label>
                  <Input
                    placeholder="Enter person's name"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                  />
                </div>

                <Separator />

                {/* Geography */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Geography</Label>
                  <Select value={geography} onValueChange={setGeography}>
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
                          id={`personal-industry-${industry.toLowerCase()}`}
                          checked={industries.includes(industry)}
                          onCheckedChange={() => toggleIndustry(industry)}
                        />
                        <Label htmlFor={`personal-industry-${industry.toLowerCase()}`} className="text-sm font-normal">
                          {industry}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Collapsible>
          </Card>

          {/* Buyer Intent Filters */}
          <Card>
            <CardHeader className="py-3 cursor-pointer" onClick={() => setIsBuyerIntentOpen(!isBuyerIntentOpen)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center">
                  <BarChart className="h-4 w-4 mr-2" />
                  Buyer Intent
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isBuyerIntentOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            <Collapsible open={isBuyerIntentOpen}>
              <CardContent className="pt-0 space-y-5">
                <RadioGroup value={buyerIntent} onValueChange={setBuyerIntent}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="intent-all" />
                    <Label htmlFor="intent-all">All</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="strong" id="intent-strong" />
                    <Label htmlFor="intent-strong" className="flex items-center">
                      Strong
                      <Badge className="ml-2 bg-green-500/20 text-green-500 hover:bg-green-500/30">High</Badge>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="intent-medium" />
                    <Label htmlFor="intent-medium" className="flex items-center">
                      Medium
                      <Badge className="ml-2 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">Medium</Badge>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weak" id="intent-weak" />
                    <Label htmlFor="intent-weak" className="flex items-center">
                      Weak
                      <Badge className="ml-2 bg-blue-500/20 text-blue-500 hover:bg-blue-500/30">Low</Badge>
                    </Label>
                  </div>
                </RadioGroup>
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
                <span className="font-medium">{totalResults}</span> leads found matching your criteria
              </div>
              <Select defaultValue="relevance">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="intent-high">Buyer Intent (High to Low)</SelectItem>
                  <SelectItem value="recent-activity">Recent Activity</SelectItem>
                  <SelectItem value="title">Job Title</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
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
                <p className="text-muted-foreground">Finding leads that match your criteria</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No leads found</h3>
                <p className="text-muted-foreground max-w-md">
                  Try adjusting your search criteria or filters to find leads that match your prospecting needs.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((lead) => {
                  const isExpanded = expandedCards.has(lead.id)
                  // Get primary email (from current company) and phone
                  const primaryEmail = lead.emails?.[0] || lead.email
                  const otherEmails = lead.emails?.slice(1) || []

                  return (
                    <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Preview Card (Always Visible) */}
                          <div className="flex items-start justify-between">
                            <div
                              className="space-y-2 flex-1"
                              onClick={() => toggleExpanded(lead.id)}
                            >
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{toTitleCase(lead.name)}</h3>
                                {getBuyerIntentBadge(lead.buyerIntent)}
                              </div>
                              <p className="text-muted-foreground">{toTitleCase(lead.title)}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Building2 className="h-4 w-4" />
                                  {toTitleCase(lead.company)}
                                </div>
                                {lead.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {toTitleCase(lead.location)}
                                  </div>
                                )}
                              </div>

                              {/* Preview Contact Info */}
                              <div className="flex flex-col gap-2 text-sm">
                                {primaryEmail && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">{primaryEmail}</span>
                                    <Badge variant="secondary" className="text-xs h-5">
                                      Company Email
                                    </Badge>
                                  </div>
                                )}
                                {lead.phone && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    <span>{lead.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleExpanded(lead.id)}
                                title={isExpanded ? "Show less" : "Show more"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                              {lead.linkedin && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={lead.linkedin} target="_blank" rel="noopener noreferrer">
                                    <LinkedinIcon className="mr-2 h-4 w-4" />
                                    LinkedIn
                                  </a>
                                </Button>
                              )}
                              <Button size="sm" onClick={() => handleAddToProspects(lead)}>
                                Add to Prospects
                              </Button>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <>
                              <Separator />
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                {/* Additional Contact Info */}
                                <div className="space-y-3">
                                  <h4 className="font-medium text-sm flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    Additional Contact Information
                                  </h4>
                                  <div className="space-y-2 text-sm text-muted-foreground pl-6">
                                    {otherEmails.length > 0 ? (
                                      otherEmails.map((email, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                          <Mail className="h-3 w-3" />
                                          <span>{email}</span>
                                          <Badge variant="secondary" className="text-xs h-5">
                                            Personal
                                          </Badge>
                                        </div>
                                      ))
                                    ) : (
                                      <p>No additional emails available</p>
                                    )}
                                  </div>
                                </div>

                                {/* Previous Company */}
                                <div className="space-y-3">
                                  <h4 className="font-medium text-sm flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Previous Experience
                                  </h4>
                                  <div className="space-y-2 text-sm text-muted-foreground pl-6">
                                    <div>
                                      <p className="font-medium text-foreground">Senior {lead.title}</p>
                                      <p>TechCorp Inc. • 2019-2023</p>
                                      <p className="text-xs mt-1">Led team of 8, increased revenue by 45%</p>
                                    </div>
                                  </div>
                                </div>

                                {/* POV / Context Blurb */}
                                <div className="space-y-3 md:col-span-2">
                                  <h4 className="font-medium text-sm flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Point of View
                                  </h4>
                                  <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
                                    <p className="mb-2">
                                      <strong className="text-foreground">{toTitleCase(lead.name)}</strong> is currently working as a {toTitleCase(lead.title)} at {toTitleCase(lead.company)},
                                      a {lead.companySize} company in the {lead.industry} industry. Based on their seniority level ({lead.seniorityLevel}),
                                      they likely have decision-making authority in their department.
                                    </p>
                                    <p className="mb-2">
                                      As a {toTitleCase(lead.title)}, their job entails overseeing team performance, driving strategic initiatives, and managing
                                      key stakeholder relationships. Things that are important to them include operational efficiency, team productivity,
                                      scalable processes, and measurable ROI on new investments.
                                    </p>
                                    <p>
                                      With {getBuyerIntentText(lead.buyerIntent)}, this prospect may be actively looking for solutions
                                      in your space. Their background at TechCorp suggests they value scalable, data-driven solutions.
                                      Consider leading with ROI metrics and case studies from similar companies.
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Add to Sequence Button */}
                              <Separator />
                              <div className="flex justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button>
                                      Add to Sequence
                                      <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {sequences.map((sequence) => (
                                      <DropdownMenuItem
                                        key={sequence.id}
                                        onClick={() => handleAddToSequence(lead, sequence.id)}
                                      >
                                        {sequence.name}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
