"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, ChevronDown, ChevronUp, Building2, Briefcase, User, BarChart, ArrowRight, Clock, Mail, Phone, Linkedin as LinkedinIcon, Loader2, MapPin, Calendar, TrendingUp, X, Save, FolderOpen, Trash2, Ban } from "lucide-react"
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

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

interface SavedSearch {
  id: string
  name: string
  filters: {
    query: string
    nameFilter: string
    currentCompany: string
    jobFunction: string
    jobTitles: string[]
    geography: string
    cities: string[]
    buyerIntent: string
    seniorityLevels: string[]
    industries: string[]
    headcountRange: number[]
    // Exclusions
    excludedNames: string[]
    excludedCompanies: string[]
    excludedTitles: string[]
    excludedIndustries: string[]
  }
  createdAt: string
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
  const searchParams = useSearchParams()
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
  const [jobTitles, setJobTitles] = useState<string[]>([])
  const [jobTitleInput, setJobTitleInput] = useState("")
  const [geography, setGeography] = useState("")
  const [cities, setCities] = useState<string[]>([])
  const [cityInput, setCityInput] = useState("")
  const [buyerIntent, setBuyerIntent] = useState("all")
  const [seniorityLevels, setSeniorityLevels] = useState<string[]>([])
  const [industries, setIndustries] = useState<string[]>([])

  // Exclusion filters
  const [excludedNames, setExcludedNames] = useState<string[]>([])
  const [excludedNameInput, setExcludedNameInput] = useState("")
  const [excludedCompanies, setExcludedCompanies] = useState<string[]>([])
  const [excludedCompanyInput, setExcludedCompanyInput] = useState("")
  const [excludedTitles, setExcludedTitles] = useState<string[]>([])
  const [excludedTitleInput, setExcludedTitleInput] = useState("")
  const [excludedIndustries, setExcludedIndustries] = useState<string[]>([])
  const [excludedIndustryInput, setExcludedIndustryInput] = useState("")
  const [isExclusionsOpen, setIsExclusionsOpen] = useState(false)

  // Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveSearchName, setSaveSearchName] = useState("")

  // Search results
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [selectedProspects, setSelectedProspects] = useState<string[]>([])

  // Load saved searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('leadsSavedSearches')
    if (saved) {
      try {
        setSavedSearches(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading saved searches:', e)
      }
    }
  }, [])

  // Load saved search state on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('leadsProspectingState')
    if (savedState) {
      try {
        const state = JSON.parse(savedState)
        setQuery(state.query || "")
        setNameFilter(state.nameFilter || "")
        setCurrentCompany(state.currentCompany || "")
        setJobFunction(state.jobFunction || "")
        setJobTitles(state.jobTitles || [])
        setGeography(state.geography || "")
        setCities(state.cities || [])
        setBuyerIntent(state.buyerIntent || "all")
        setSeniorityLevels(state.seniorityLevels || [])
        setIndustries(state.industries || [])
        setHeadcountRange(state.headcountRange || [10, 5000])
        setSearchResults(state.searchResults || [])
        setTotalResults(state.totalResults || 0)
        // Load exclusions
        setExcludedNames(state.excludedNames || [])
        setExcludedCompanies(state.excludedCompanies || [])
        setExcludedTitles(state.excludedTitles || [])
        setExcludedIndustries(state.excludedIndustries || [])
      } catch (e) {
        console.error('Error loading saved state:', e)
      }
    }
  }, [])

  // Handle multithread URL params
  useEffect(() => {
    const company = searchParams.get('company')
    const seniorityLevelsParam = searchParams.get('seniorityLevels')
    const autoSearch = searchParams.get('autoSearch')

    if (company || seniorityLevelsParam) {
      // Set filters from URL params
      if (company) {
        setCurrentCompany(company)
      }
      if (seniorityLevelsParam) {
        try {
          const levels = JSON.parse(seniorityLevelsParam)
          setSeniorityLevels(levels)
        } catch (e) {
          console.error('Error parsing seniority levels:', e)
        }
      }

      // Auto-trigger search if requested
      if (autoSearch === 'true') {
        // Small delay to ensure state is set
        setTimeout(() => {
          handleSearch()
        }, 100)
      }
    }
  }, [searchParams])

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
          jobTitle: jobTitles,
          seniorityLevel: seniorityLevels,
          companyHeadcount: headcountRange,
          geography,
          city: cities,
          industry: industries,
          // Exclusions
          excludedNames,
          excludedCompanies,
          excludedTitles,
          excludedIndustries,
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

      // Save search state to sessionStorage
      const stateToSave = {
        query,
        nameFilter,
        currentCompany,
        jobFunction,
        jobTitles,
        geography,
        cities,
        buyerIntent,
        seniorityLevels,
        industries,
        headcountRange,
        excludedNames,
        excludedCompanies,
        excludedTitles,
        excludedIndustries,
        searchResults: data.results,
        totalResults: data.total,
      }
      sessionStorage.setItem('leadsProspectingState', JSON.stringify(stateToSave))
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
    setJobTitles([])
    setJobTitleInput("")
    setGeography("")
    setCities([])
    setCityInput("")
    setBuyerIntent("all")
    setSeniorityLevels([])
    setIndustries([])
    setHeadcountRange([10, 5000])
    // Clear exclusions
    setExcludedNames([])
    setExcludedNameInput("")
    setExcludedCompanies([])
    setExcludedCompanyInput("")
    setExcludedTitles([])
    setExcludedTitleInput("")
    setExcludedIndustries([])
    setExcludedIndustryInput("")
    setSearchResults([])
    setTotalResults(0)
    setError(null)

    // Clear saved state
    sessionStorage.removeItem('leadsProspectingState')
  }

  // Handle job title chip input
  const handleJobTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && jobTitleInput.trim()) {
      e.preventDefault()
      const newTitle = jobTitleInput.trim()
      if (!jobTitles.includes(newTitle)) {
        setJobTitles([...jobTitles, newTitle])
      }
      setJobTitleInput("")
    } else if (e.key === "Backspace" && !jobTitleInput && jobTitles.length > 0) {
      // Remove last chip on backspace if input is empty
      setJobTitles(jobTitles.slice(0, -1))
    }
  }

  const removeJobTitle = (titleToRemove: string) => {
    setJobTitles(jobTitles.filter(t => t !== titleToRemove))
  }

  // Handle city chip input
  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && cityInput.trim()) {
      e.preventDefault()
      const newCity = cityInput.trim()
      if (!cities.includes(newCity)) {
        setCities([...cities, newCity])
      }
      setCityInput("")
    } else if (e.key === "Backspace" && !cityInput && cities.length > 0) {
      setCities(cities.slice(0, -1))
    }
  }

  const removeCity = (cityToRemove: string) => {
    setCities(cities.filter(c => c !== cityToRemove))
  }

  // Exclusion chip handlers
  const handleExcludedNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && excludedNameInput.trim()) {
      e.preventDefault()
      const value = excludedNameInput.trim()
      if (!excludedNames.includes(value)) {
        setExcludedNames([...excludedNames, value])
      }
      setExcludedNameInput("")
    } else if (e.key === "Backspace" && !excludedNameInput && excludedNames.length > 0) {
      setExcludedNames(excludedNames.slice(0, -1))
    }
  }

  const handleExcludedCompanyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && excludedCompanyInput.trim()) {
      e.preventDefault()
      const value = excludedCompanyInput.trim()
      if (!excludedCompanies.includes(value)) {
        setExcludedCompanies([...excludedCompanies, value])
      }
      setExcludedCompanyInput("")
    } else if (e.key === "Backspace" && !excludedCompanyInput && excludedCompanies.length > 0) {
      setExcludedCompanies(excludedCompanies.slice(0, -1))
    }
  }

  const handleExcludedTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && excludedTitleInput.trim()) {
      e.preventDefault()
      const value = excludedTitleInput.trim()
      if (!excludedTitles.includes(value)) {
        setExcludedTitles([...excludedTitles, value])
      }
      setExcludedTitleInput("")
    } else if (e.key === "Backspace" && !excludedTitleInput && excludedTitles.length > 0) {
      setExcludedTitles(excludedTitles.slice(0, -1))
    }
  }

  const handleExcludedIndustryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && excludedIndustryInput.trim()) {
      e.preventDefault()
      const value = excludedIndustryInput.trim()
      if (!excludedIndustries.includes(value)) {
        setExcludedIndustries([...excludedIndustries, value])
      }
      setExcludedIndustryInput("")
    } else if (e.key === "Backspace" && !excludedIndustryInput && excludedIndustries.length > 0) {
      setExcludedIndustries(excludedIndustries.slice(0, -1))
    }
  }

  // Save search functions
  const handleSaveSearch = () => {
    if (!saveSearchName.trim()) {
      toast({ title: "Please enter a name", variant: "destructive" })
      return
    }

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: saveSearchName.trim(),
      filters: {
        query,
        nameFilter,
        currentCompany,
        jobFunction,
        jobTitles,
        geography,
        cities,
        buyerIntent,
        seniorityLevels,
        industries,
        headcountRange,
        excludedNames,
        excludedCompanies,
        excludedTitles,
        excludedIndustries,
      },
      createdAt: new Date().toISOString(),
    }

    const updated = [...savedSearches, newSearch]
    setSavedSearches(updated)
    localStorage.setItem('leadsSavedSearches', JSON.stringify(updated))
    setShowSaveDialog(false)
    setSaveSearchName("")
    toast({ title: "Search saved!", description: `"${newSearch.name}" has been saved.` })
  }

  const handleLoadSearch = (search: SavedSearch) => {
    const f = search.filters
    setQuery(f.query || "")
    setNameFilter(f.nameFilter || "")
    setCurrentCompany(f.currentCompany || "")
    setJobFunction(f.jobFunction || "")
    setJobTitles(f.jobTitles || [])
    setGeography(f.geography || "")
    setCities(f.cities || [])
    setBuyerIntent(f.buyerIntent || "all")
    setSeniorityLevels(f.seniorityLevels || [])
    setIndustries(f.industries || [])
    setHeadcountRange(f.headcountRange || [10, 5000])
    setExcludedNames(f.excludedNames || [])
    setExcludedCompanies(f.excludedCompanies || [])
    setExcludedTitles(f.excludedTitles || [])
    setExcludedIndustries(f.excludedIndustries || [])
    toast({ title: "Search loaded!", description: `"${search.name}" filters applied.` })
  }

  const handleDeleteSavedSearch = (id: string) => {
    const updated = savedSearches.filter(s => s.id !== id)
    setSavedSearches(updated)
    localStorage.setItem('leadsSavedSearches', JSON.stringify(updated))
    toast({ title: "Search deleted" })
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
        toast({
          title: "Error",
          description: errorData.error || "Failed to add prospect",
          variant: "destructive",
        })
        return
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

    try {
      // First add the prospect to prospects list
      await handleAddToProspects(lead)

      // Then add their company to accounts
      try {
        await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: lead.company,
            industry: lead.industry,
            website: `https://${lead.company.toLowerCase().replace(/\s+/g, '')}.com`,
            size: lead.companySize,
            source: "PDL Search",
          }),
        })
      } catch (err) {
        // Account might already exist, that's ok
        console.log("Account may already exist:", err)
      }

      toast({
        title: "Added to sequence!",
        description: `${lead.name} has been added to ${sequence.name}, your prospects list, and their company to accounts.`,
      })
    } catch (err: any) {
      console.error("Error adding to sequence:", err)
      toast({
        title: "Error",
        description: "Failed to add prospect to sequence. Please try again.",
        variant: "destructive",
      })
    }
  }

  const toggleProspectSelection = (prospectId: string) => {
    setSelectedProspects(prev =>
      prev.includes(prospectId)
        ? prev.filter(id => id !== prospectId)
        : [...prev, prospectId]
    )
  }

  const selectAllProspects = () => {
    if (selectedProspects.length === searchResults.length) {
      setSelectedProspects([])
    } else {
      setSelectedProspects(searchResults.map(lead => lead.id))
    }
  }

  const handleBulkAddToSequence = async (sequenceId: string) => {
    const sequence = sequences.find(s => s.id === sequenceId)
    if (!sequence) return

    const selectedLeads = searchResults.filter(lead => selectedProspects.includes(lead.id))

    try {
      // Add all selected prospects to prospects list and their companies to accounts
      await Promise.all(
        selectedLeads.map(async (lead) => {
          // Add prospect
          await handleAddToProspects(lead)

          // Add their company to accounts
          try {
            await fetch("/api/accounts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: lead.company,
                industry: lead.industry,
                website: `https://${lead.company.toLowerCase().replace(/\s+/g, '')}.com`,
                size: lead.companySize,
                source: "PDL Search",
              }),
            })
          } catch (err) {
            // Account might already exist, that's ok
            console.log("Account may already exist:", err)
          }
        })
      )

      toast({
        title: "Added to sequence!",
        description: `${selectedLeads.length} prospect${selectedLeads.length !== 1 ? 's' : ''} added to ${sequence.name}, your prospects list, and their companies to accounts.`,
      })

      // Clear selections after action
      setSelectedProspects([])
    } catch (err: any) {
      console.error("Error bulk adding to sequence:", err)
      toast({
        title: "Error",
        description: "Failed to add some prospects. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleOpenAllLinkedIns = () => {
    const selectedLeads = searchResults.filter(lead =>
      selectedProspects.includes(lead.id) && lead.linkedin
    )

    if (selectedLeads.length === 0) {
      toast({
        title: "No LinkedIn profiles",
        description: "None of the selected prospects have LinkedIn URLs",
        variant: "destructive",
      })
      return
    }

    // Open all LinkedIn profiles in new tabs
    selectedLeads.forEach(lead => {
      window.open(lead.linkedin, '_blank')
    })

    toast({
      title: "Opening LinkedIn profiles",
      description: `Opened ${selectedLeads.length} LinkedIn profile${selectedLeads.length !== 1 ? 's' : ''}`,
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
        <div className="flex gap-2">
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            {isLoading ? "Searching..." : "Search"}
          </Button>
          <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={savedSearches.length === 0}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Load
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {savedSearches.map((search) => (
                <DropdownMenuItem
                  key={search.id}
                  className="flex items-center justify-between"
                >
                  <span
                    className="flex-1 cursor-pointer"
                    onClick={() => handleLoadSearch(search)}
                  >
                    {search.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSavedSearch(search.id)
                    }}
                    className="ml-2 p-1 hover:bg-destructive/20 rounded"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </DropdownMenuItem>
              ))}
              {savedSearches.length === 0 && (
                <DropdownMenuItem disabled>No saved searches</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                placeholder="e.g., Sales Directors in Tech"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveSearch()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSearch}>
              Save Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      {headcountRange[0] === 10 ? "Any" : headcountRange[0].toLocaleString()} - {headcountRange[1] >= 5000 ? "5,000+" : headcountRange[1].toLocaleString()}
                    </span>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={headcountRange.map(v => v >= 5000 ? 2100 : v)}
                      min={10}
                      max={2100}
                      step={10}
                      onValueChange={(values) => {
                        // Map 2100 to 5000+ for the actual value
                        setHeadcountRange(values.map(v => v >= 2100 ? 5000 : v))
                      }}
                      className="my-5"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>10</span>
                      <span>500</span>
                      <span>1,000</span>
                      <span>2,000</span>
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

                {/* Current Job Title - Chip Input */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Current Job Title</Label>
                  <div className="flex flex-wrap gap-1.5 p-2 min-h-[42px] border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    {jobTitles.map((title) => (
                      <Badge
                        key={title}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-1 text-xs"
                      >
                        {title}
                        <button
                          type="button"
                          onClick={() => removeJobTitle(title)}
                          className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      type="text"
                      placeholder={jobTitles.length === 0 ? "Type and press enter..." : ""}
                      value={jobTitleInput}
                      onChange={(e) => setJobTitleInput(e.target.value)}
                      onKeyDown={handleJobTitleKeyDown}
                      className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Press enter to add multiple titles
                  </p>
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
                  <div className="flex flex-wrap gap-1.5 p-2 min-h-[42px] border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 mt-2">
                    {cities.map((c) => (
                      <Badge
                        key={c}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-1 text-xs"
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() => removeCity(c)}
                          className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      type="text"
                      placeholder={cities.length === 0 ? "City or country, press enter..." : ""}
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      onKeyDown={handleCityKeyDown}
                      className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Press enter to add multiple locations
                  </p>
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

          {/* Exclusions */}
          <Card>
            <CardHeader className="py-3 cursor-pointer" onClick={() => setIsExclusionsOpen(!isExclusionsOpen)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center">
                  <Ban className="h-4 w-4 mr-2" />
                  Exclusions
                  {(excludedNames.length > 0 || excludedCompanies.length > 0 || excludedTitles.length > 0 || excludedIndustries.length > 0) && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {excludedNames.length + excludedCompanies.length + excludedTitles.length + excludedIndustries.length}
                    </Badge>
                  )}
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isExclusionsOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            <Collapsible open={isExclusionsOpen}>
              <CardContent className="pt-0 space-y-5">
                {/* Exclude Names */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Exclude Names</Label>
                  <div className="flex flex-wrap gap-1.5 p-2 min-h-[38px] border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring">
                    {excludedNames.map((name) => (
                      <Badge key={name} variant="destructive" className="flex items-center gap-1 px-2 py-0.5 text-xs">
                        {name}
                        <button type="button" onClick={() => setExcludedNames(excludedNames.filter(n => n !== name))} className="ml-1 hover:bg-white/20 rounded-full p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      type="text"
                      placeholder={excludedNames.length === 0 ? "Name to exclude..." : ""}
                      value={excludedNameInput}
                      onChange={(e) => setExcludedNameInput(e.target.value)}
                      onKeyDown={handleExcludedNameKeyDown}
                      className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                {/* Exclude Companies */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Exclude Companies</Label>
                  <div className="flex flex-wrap gap-1.5 p-2 min-h-[38px] border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring">
                    {excludedCompanies.map((company) => (
                      <Badge key={company} variant="destructive" className="flex items-center gap-1 px-2 py-0.5 text-xs">
                        {company}
                        <button type="button" onClick={() => setExcludedCompanies(excludedCompanies.filter(c => c !== company))} className="ml-1 hover:bg-white/20 rounded-full p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      type="text"
                      placeholder={excludedCompanies.length === 0 ? "Company to exclude..." : ""}
                      value={excludedCompanyInput}
                      onChange={(e) => setExcludedCompanyInput(e.target.value)}
                      onKeyDown={handleExcludedCompanyKeyDown}
                      className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                {/* Exclude Titles */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Exclude Titles</Label>
                  <div className="flex flex-wrap gap-1.5 p-2 min-h-[38px] border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring">
                    {excludedTitles.map((title) => (
                      <Badge key={title} variant="destructive" className="flex items-center gap-1 px-2 py-0.5 text-xs">
                        {title}
                        <button type="button" onClick={() => setExcludedTitles(excludedTitles.filter(t => t !== title))} className="ml-1 hover:bg-white/20 rounded-full p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      type="text"
                      placeholder={excludedTitles.length === 0 ? "Title to exclude..." : ""}
                      value={excludedTitleInput}
                      onChange={(e) => setExcludedTitleInput(e.target.value)}
                      onKeyDown={handleExcludedTitleKeyDown}
                      className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                {/* Exclude Industries */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Exclude Industries</Label>
                  <div className="flex flex-wrap gap-1.5 p-2 min-h-[38px] border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring">
                    {excludedIndustries.map((industry) => (
                      <Badge key={industry} variant="destructive" className="flex items-center gap-1 px-2 py-0.5 text-xs">
                        {industry}
                        <button type="button" onClick={() => setExcludedIndustries(excludedIndustries.filter(i => i !== industry))} className="ml-1 hover:bg-white/20 rounded-full p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      type="text"
                      placeholder={excludedIndustries.length === 0 ? "Industry to exclude..." : ""}
                      value={excludedIndustryInput}
                      onChange={(e) => setExcludedIndustryInput(e.target.value)}
                      onKeyDown={handleExcludedIndustryKeyDown}
                      className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Press enter to add exclusions
                </p>
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
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{totalResults}</span> leads found matching your criteria
                </div>
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedProspects.length === searchResults.length && searchResults.length > 0}
                      onCheckedChange={selectAllProspects}
                      id="select-all"
                    />
                    <Label htmlFor="select-all" className="text-sm cursor-pointer">
                      Select all
                    </Label>
                  </div>
                )}
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

            {/* Bulk Actions Bar */}
            {selectedProspects.length > 0 && (
              <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {selectedProspects.length} prospect{selectedProspects.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAllLinkedIns}
                  >
                    <LinkedinIcon className="mr-2 h-4 w-4" />
                    Open All LinkedIns
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm">
                        Add All to Sequence
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {sequences.map((sequence) => (
                        <DropdownMenuItem
                          key={sequence.id}
                          onClick={() => handleBulkAddToSequence(sequence.id)}
                        >
                          {sequence.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}

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
                            <div className="flex items-start gap-3 flex-1">
                              <div onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedProspects.includes(lead.id)}
                                  onCheckedChange={() => toggleProspectSelection(lead.id)}
                                  className="mt-1"
                                />
                              </div>
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
                                      <strong className="text-foreground">Opportunity:</strong> {toTitleCase(lead.name)} is a {toTitleCase(lead.title)} at {toTitleCase(lead.company)},
                                      a {lead.companySize} company in the {lead.industry} industry. Based on their seniority level ({lead.seniorityLevel}),
                                      they likely have decision-making authority. As a {toTitleCase(lead.title)}, their job entails overseeing team performance, driving strategic initiatives, and managing
                                      key stakeholder relationships. With {getBuyerIntentText(lead.buyerIntent)}, they may be actively evaluating solutions.
                                    </p>
                                    <p className="mb-2">
                                      <strong className="text-foreground">Industry Context:</strong> In the {lead.industry} space, companies like {toTitleCase(lead.company)} are
                                      currently facing challenges around digital transformation and data security. With increasing regulatory compliance requirements
                                      and pressure to modernize legacy systems, this is something they're likely worried about. Market consolidation and
                                      the need for scalable, AI-driven solutions are hot topics right now.
                                    </p>
                                    <p className="mb-2">
                                      <strong className="text-foreground">How to Help:</strong> Your platform can help {toTitleCase(lead.name)} address operational efficiency, team productivity,
                                      and scalable processes while delivering measurable ROI on new investments. Their background suggests they value data-driven solutions.
                                    </p>
                                    <p>
                                      <strong className="text-foreground">Angle:</strong> Lead with ROI metrics and case studies from similar companies in the {lead.industry} space.
                                      Emphasize quick time-to-value and ease of implementation. Focus on how your solution addresses their key priorities: efficiency gains,
                                      cost reduction, and competitive advantage.
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
