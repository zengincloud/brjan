"use client"

import { useState, useEffect, Fragment, ElementType } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, ChevronDown, ChevronUp, Building2, Briefcase, User, BarChart, ArrowRight, Clock, Mail, Phone, Linkedin as LinkedinIcon, Loader2, MapPin, Calendar, TrendingUp, X, Save, FolderOpen, Trash2, Ban, Eye, Plus, Settings2, RotateCcw, SlidersHorizontal, DollarSign, Users } from "lucide-react"
import { Collapsible } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
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
  companyWebsite: string | null
}

interface RevealedData {
  email: string | null
  emailType: string | null
  emailStatus: string | null
  emails: { email: string; type: string; status: string }[]
  phone: string | null
  phoneStatus: string | null
  phones: { number: string; prettyNumber: string; type: string }[]
  name: string | null
  title: string | null
  company: string | null
  location: string | null
  companySize: number | null
  companySizeRange: string | null
  companyIndustry: string | null
  companyDomain: string | null
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

type LeadColDef = { key: string; label: string }

const LEAD_RESULT_COLS: LeadColDef[] = [
  { key: 'title',     label: 'Job Title' },
  { key: 'company',   label: 'Company' },
  { key: 'emails',    label: 'Emails' },
  { key: 'phones',    label: 'Phone Numbers' },
  { key: 'location',  label: 'Location' },
  { key: 'seniority', label: 'Seniority' },
  { key: 'intent',    label: 'Buyer Intent' },
]
const DEFAULT_LEAD_RESULT_COLS = new Set(['title', 'company', 'emails', 'phones'])

// ── Column settings dialog ──────────────────────────────────────────────────────

function LeadsResultColSettings({ open, onOpenChange, visibleCols, onSave }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  visibleCols: Set<string>
  onSave: (cols: Set<string>) => void
}) {
  const [draft, setDraft] = useState<Set<string>>(new Set(visibleCols))
  useEffect(() => { if (open) setDraft(new Set(visibleCols)) }, [open, visibleCols])
  const toggle = (key: string) =>
    setDraft((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })
  const ordered = LEAD_RESULT_COLS.filter((c) => draft.has(c.key))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <DialogTitle>Contact Column Settings</DialogTitle>
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">Select the columns you want to see.</p>
        </DialogHeader>
        <div className="flex gap-8 pt-2">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Columns</p>
            <div className="space-y-2.5">
              {LEAD_RESULT_COLS.map((col) => (
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
                <span className="text-[13px] text-muted-foreground flex-1">Name</span>
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
          <Button variant="ghost" size="sm" onClick={() => setDraft(new Set(DEFAULT_LEAD_RESULT_COLS))} className="mr-auto gap-1.5">
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

export function LeadsProspecting() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [isCompanyOpen, setIsCompanyOpen] = useState(true)
  const [isRoleOpen, setIsRoleOpen] = useState(true)
  const [isPersonalOpen, setIsPersonalOpen] = useState(true)
  const [isBuyerIntentOpen, setIsBuyerIntentOpen] = useState(true)
  const [isBestPathOpen, setIsBestPathOpen] = useState(true)
  const [isRecentUpdatesOpen, setIsRecentUpdatesOpen] = useState(true)
  const [headcountRange, setHeadcountRange] = useState([10, 10000])

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

  // Revenue + headcount UI state
  const [revenue, setRevenue] = useState("")
  const [headcountSelected, setHeadcountSelected] = useState("")

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

  // Reveal state
  const [revealedContacts, setRevealedContacts] = useState<Record<string, RevealedData>>({})
  const [revealingContacts, setRevealingContacts] = useState<Set<string>>(new Set())

  // Filter panel + column settings
  const [showFilters, setShowFilters] = useState(true)
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const [visibleResultCols, setVisibleResultCols] = useState<Set<string>>(new Set(DEFAULT_LEAD_RESULT_COLS))

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
        setHeadcountRange(state.headcountRange || [10, 10000])
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
      const trimmedQuery = query.trim()

      // Detect LinkedIn person profile URL (linkedin.com/in/username)
      const personLinkedInMatch = trimmedQuery.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i)
      if (personLinkedInMatch) {
        const linkedinUrl = trimmedQuery.startsWith('http') ? trimmedQuery : `https://${trimmedQuery}`
        toast({ title: "LinkedIn profile detected", description: "Revealing contact details..." })

        const revealResponse = await fetch("/api/search/reveal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkedinUrl }),
        })

        if (!revealResponse.ok) {
          const errorData = await revealResponse.json()
          throw new Error(errorData.error || "Failed to reveal contact")
        }

        const revealData = await revealResponse.json()
        if (revealData.success) {
          const d = revealData.data
          const result: SearchResult = {
            id: linkedinUrl,
            name: d.name || personLinkedInMatch[1].replace(/-/g, " "),
            title: d.title || "",
            company: d.company || "",
            location: d.location || "",
            email: d.email || null,
            emails: d.emails?.map((e: any) => typeof e === 'string' ? e : e?.email).filter(Boolean) || [],
            phone: d.phone || null,
            linkedin: linkedinUrl,
            seniorityLevel: "",
            companySize: d.companySizeRange || "",
            industry: d.companyIndustry || "",
            buyerIntent: "medium",
            companyWebsite: d.companyDomain || null,
          }
          setSearchResults([result])
          setTotalResults(1)
          // Auto-store reveal data so it shows immediately
          setRevealedContacts(prev => ({ ...prev, [linkedinUrl]: d }))

          toast({
            title: "Contact found!",
            description: `${result.name}${result.company ? ` at ${result.company}` : ""}`,
          })
        } else {
          throw new Error("Could not find contact details for this LinkedIn profile")
        }

        setIsLoading(false)
        return
      }

      // Detect LinkedIn company page URL (linkedin.com/company/company-name)
      const companyLinkedInMatch = trimmedQuery.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/company\/([a-zA-Z0-9_-]+)/i)
      if (companyLinkedInMatch) {
        const companySlug = companyLinkedInMatch[1].replace(/-/g, " ")
        toast({ title: "Company LinkedIn detected", description: `Searching for leads at "${toTitleCase(companySlug)}"...` })

        // Use the company name extracted from the URL slug as the company filter
        const response = await fetch("/api/search/people", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentCompany: companySlug,
            seniorityLevel: seniorityLevels.length > 0 ? seniorityLevels : undefined,
            companyHeadcount: headcountRange,
            geography,
            city: cities,
            industry: industries,
            jobTitle: jobTitles,
            jobFunction,
            excludedNames,
            excludedCompanies,
            excludedTitles,
            excludedIndustries,
            limit: 2,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to search people")
        }

        const data = await response.json()
        setSearchResults(data.results)
        setTotalResults(data.total)
        // Also set the company filter so the user can see what was searched
        setCurrentCompany(companySlug)

        setIsLoading(false)
        return
      }

      // Detect website domain (e.g. salesforce.com, www.stripe.com, https://google.com)
      const domainMatch = trimmedQuery.match(/^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+)\.[a-zA-Z]{2,}(?:\/.*)?$/i)
      if (domainMatch && !trimmedQuery.includes(' ')) {
        const companyName = domainMatch[1]
        const domain = trimmedQuery.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')
        toast({ title: "Domain detected", description: `Searching for leads at "${toTitleCase(companyName)}"...` })

        const response = await fetch("/api/search/people", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentCompany: companyName,
            companyDomain: domain,
            seniorityLevel: seniorityLevels.length > 0 ? seniorityLevels : undefined,
            companyHeadcount: headcountRange,
            geography,
            city: cities,
            industry: industries,
            jobTitle: jobTitles,
            jobFunction,
            excludedNames,
            excludedCompanies,
            excludedTitles,
            excludedIndustries,
            limit: 2,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to search people")
        }

        const data = await response.json()
        setSearchResults(data.results)
        setTotalResults(data.total)
        setCurrentCompany(companyName)

        setIsLoading(false)
        return
      }

      // Normal search flow
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
          limit: 2,
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
    setHeadcountRange([10, 10000])
    setHeadcountSelected("")
    setRevenue("")
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

  // Handle revealing a contact's details
  const handleReveal = async (lead: SearchResult) => {
    const leadId = lead.id
    if (revealingContacts.has(leadId) || revealedContacts[leadId]) return

    setRevealingContacts(prev => new Set(prev).add(leadId))

    try {
      const response = await fetch("/api/search/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedinUrl: lead.linkedin || undefined,
          fullName: lead.name || undefined,
          company: lead.company || undefined,
          domain: lead.companyWebsite || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast({
          title: "Reveal failed",
          description: errorData.error || "Could not reveal contact details",
          variant: "destructive",
        })
        return
      }

      const data = await response.json()
      console.log("Reveal response for", lead.name, ":", JSON.stringify(data, null, 2))

      if (data.success) {
        setRevealedContacts(prev => ({
          ...prev,
          [leadId]: data.data,
        }))

        // Update the search result with revealed data
        setSearchResults(prev =>
          prev.map(r => {
            if (r.id === leadId) {
              return {
                ...r,
                email: data.data.email || r.email,
                phone: data.data.phone || r.phone,
                emails: data.data.emails?.map((e: any) => typeof e === 'string' ? e : e?.email).filter(Boolean) || r.emails,
              }
            }
            return r
          })
        )

        const foundEmail = data.data.email || (data.data.emails?.length > 0 ? data.data.emails[0].email : null)
        const foundPhone = data.data.phone || (data.data.phones?.length > 0 ? data.data.phones[0].number : null)

        toast({
          title: "Contact revealed!",
          description: foundEmail || foundPhone
            ? `Found: ${foundEmail || "no email"}${foundPhone ? `, ${foundPhone}` : ""}`
            : `${lead.name}'s reveal completed but no contact details were found.`,
        })
      } else if (data.pending) {
        toast({
          title: "Still processing",
          description: "The reveal is taking longer than expected. Try again in a moment.",
        })
      }
    } catch (err: any) {
      console.error("Reveal error:", err)
      toast({
        title: "Error",
        description: "Failed to reveal contact. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRevealingContacts(prev => {
        const next = new Set(prev)
        next.delete(leadId)
        return next
      })
    }
  }

  // Handle revealing all search results
  const handleRevealAll = async () => {
    const unrevealed = searchResults.filter(
      lead => !revealedContacts[lead.id] && !revealingContacts.has(lead.id)
    )
    if (unrevealed.length === 0) {
      toast({ title: "All contacts already revealed" })
      return
    }

    toast({
      title: `Revealing ${unrevealed.length} contact${unrevealed.length !== 1 ? "s" : ""}...`,
      description: "This may take a moment.",
    })

    // Reveal sequentially to avoid rate limiting
    for (const lead of unrevealed) {
      await handleReveal(lead)
    }
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
    } else if (e.key === "Enter" && !jobTitleInput.trim()) {
      e.preventDefault()
      handleSearch()
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
    } else if (e.key === "Enter" && !cityInput.trim()) {
      e.preventDefault()
      handleSearch()
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
    } else if (e.key === "Enter" && !excludedNameInput.trim()) {
      e.preventDefault()
      handleSearch()
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
    } else if (e.key === "Enter" && !excludedCompanyInput.trim()) {
      e.preventDefault()
      handleSearch()
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
    } else if (e.key === "Enter" && !excludedTitleInput.trim()) {
      e.preventDefault()
      handleSearch()
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
    } else if (e.key === "Enter" && !excludedIndustryInput.trim()) {
      e.preventDefault()
      handleSearch()
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
    setHeadcountRange(f.headcountRange || [10, 10000])
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
      // Auto-reveal if not already revealed
      const revealed = revealedContacts[lead.id]
      let email = lead.email
      let phone = lead.phone

      if (!revealed && !email) {
        // Reveal contact first
        toast({
          title: "Revealing contact...",
          description: `Getting ${lead.name}'s contact details before adding.`,
        })

        try {
          const revealResponse = await fetch("/api/search/reveal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              linkedinUrl: lead.linkedin || undefined,
              fullName: lead.name || undefined,
              company: lead.company || undefined,
              domain: lead.companyWebsite || undefined,
            }),
          })

          if (revealResponse.ok) {
            const revealData = await revealResponse.json()
            if (revealData.success) {
              email = revealData.data.email || email
              phone = revealData.data.phone || phone

              setRevealedContacts(prev => ({
                ...prev,
                [lead.id]: revealData.data,
              }))

              setSearchResults(prev =>
                prev.map(r => {
                  if (r.id === lead.id) {
                    return {
                      ...r,
                      email: revealData.data.email || r.email,
                      phone: revealData.data.phone || r.phone,
                      emails: revealData.data.emails?.map((e: any) => typeof e === 'string' ? e : e?.email).filter(Boolean) || r.emails,
                    }
                  }
                  return r
                })
              )
            }
          }
        } catch (revealErr) {
          console.error("Auto-reveal failed:", revealErr)
        }
      } else if (revealed) {
        email = revealed.email || email
        phone = revealed.phone || phone
      }

      const response = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          email,
          phone,
          company: lead.company,
          title: lead.title,
          location: lead.location,
          linkedin: lead.linkedin,
          status: "new_lead",
          source: "Wiza Search",
          wizaData: { ...lead, ...(revealed || {}) },
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
            source: "Wiza Search",
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

  const handleBulkAddToProspects = async () => {
    const selectedLeads = searchResults.filter(lead => selectedProspects.includes(lead.id))
    if (selectedLeads.length === 0) return

    let added = 0
    let failed = 0

    for (const lead of selectedLeads) {
      try {
        await handleAddToProspects(lead)
        added++
      } catch (err) {
        failed++
        console.error("Error adding prospect:", err)
      }
    }

    toast({
      title: `Added ${added} prospect${added !== 1 ? "s" : ""}!`,
      description: failed > 0
        ? `${failed} failed (may already exist).`
        : `All selected prospects have been added.`,
    })

    setSelectedProspects([])
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
                source: "Wiza Search",
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

  const activeFilterCount = (
    (nameFilter ? 1 : 0) +
    (currentCompany ? 1 : 0) +
    (jobFunction ? 1 : 0) +
    jobTitles.length +
    (geography || cities.length ? 1 : 0) +
    seniorityLevels.length +
    industries.length +
    (headcountSelected ? 1 : 0) +
    (revenue ? 1 : 0) +
    (buyerIntent !== "all" ? 1 : 0)
  )

  return (
    <div className="space-y-6">
      {/* Search and Keywords */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, title, or paste a LinkedIn URL or domain..."
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

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {/* PERSONAL FILTERS */}
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-2 px-1">Personal Filters</p>
              <div className="space-y-0.5 mb-4">

                <FilterSectionRow icon={User} label="Name"
                  isOpen={openFilter === 'name'} onToggle={() => setOpenFilter(openFilter === 'name' ? null : 'name')}
                  hasValue={!!nameFilter} onClear={() => setNameFilter('')}>
                  <Input value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Person's name..." className="h-8 text-[12px]" />
                </FilterSectionRow>

                <FilterSectionRow icon={Briefcase} label="Job Information"
                  isOpen={openFilter === 'job'} onToggle={() => setOpenFilter(openFilter === 'job' ? null : 'job')}
                  hasValue={!!(jobFunction || jobTitles.length)} onClear={() => { setJobFunction(''); setJobTitles([]) }}>
                  <Select value={jobFunction} onValueChange={setJobFunction}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select function" /></SelectTrigger>
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
                  <div className="flex flex-wrap gap-1 p-1.5 min-h-[36px] border rounded-md bg-background text-[12px]">
                    {jobTitles.map((t) => (
                      <Badge key={t} variant="secondary" className="flex items-center gap-1 px-1.5 py-0.5 text-[11px]">
                        {t}
                        <button type="button" onClick={() => setJobTitles(jobTitles.filter(x => x !== t))}><X className="h-2.5 w-2.5" /></button>
                      </Badge>
                    ))}
                    <input type="text" placeholder={jobTitles.length === 0 ? "Add title, press enter..." : ""} value={jobTitleInput} onChange={(e) => setJobTitleInput(e.target.value)} onKeyDown={handleJobTitleKeyDown} className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-[12px]" />
                  </div>
                </FilterSectionRow>

                <FilterSectionRow icon={MapPin} label="Location"
                  isOpen={openFilter === 'location'} onToggle={() => setOpenFilter(openFilter === 'location' ? null : 'location')}
                  hasValue={!!(geography || cities.length)} onClear={() => { setGeography(''); setCities([]) }}>
                  <Select value={geography} onValueChange={setGeography}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select region" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="north-america">North America</SelectItem>
                      <SelectItem value="europe">Europe</SelectItem>
                      <SelectItem value="asia-pacific">Asia Pacific</SelectItem>
                      <SelectItem value="latin-america">Latin America</SelectItem>
                      <SelectItem value="middle-east">Middle East & Africa</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1 p-1.5 min-h-[36px] border rounded-md bg-background">
                    {cities.map((c) => (
                      <Badge key={c} variant="secondary" className="flex items-center gap-1 px-1.5 py-0.5 text-[11px]">
                        {c}
                        <button type="button" onClick={() => removeCity(c)}><X className="h-2.5 w-2.5" /></button>
                      </Badge>
                    ))}
                    <input type="text" placeholder={cities.length === 0 ? "City or country..." : ""} value={cityInput} onChange={(e) => setCityInput(e.target.value)} onKeyDown={handleCityKeyDown} className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-[12px]" />
                  </div>
                </FilterSectionRow>

                <FilterSectionRow icon={BarChart} label="Seniority"
                  isOpen={openFilter === 'seniority'} onToggle={() => setOpenFilter(openFilter === 'seniority' ? null : 'seniority')}
                  hasValue={seniorityLevels.length > 0} onClear={() => setSeniorityLevels([])}>
                  <div className="space-y-1.5">
                    {["C-Suite", "VP", "Director", "Manager", "Individual Contributor"].map((level) => (
                      <div key={level} className="flex items-center gap-2">
                        <Checkbox id={`sl-${level}`} checked={seniorityLevels.includes(level)} onCheckedChange={() => toggleSeniorityLevel(level)} />
                        <Label htmlFor={`sl-${level}`} className="text-[12px] font-normal">{level}</Label>
                      </div>
                    ))}
                  </div>
                </FilterSectionRow>

              </div>

              {/* COMPANY FILTERS */}
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-2 px-1">Company Filters</p>
              <div className="space-y-0.5">

                <FilterSectionRow icon={Building2} label="Business Name"
                  isOpen={openFilter === 'company'} onToggle={() => setOpenFilter(openFilter === 'company' ? null : 'company')}
                  hasValue={!!currentCompany} onClear={() => setCurrentCompany('')}>
                  <Input value={currentCompany} onChange={(e) => setCurrentCompany(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Company name..." className="h-8 text-[12px]" />
                </FilterSectionRow>

                <FilterSectionRow icon={MapPin} label="HQ Location"
                  isOpen={openFilter === 'hq'} onToggle={() => setOpenFilter(openFilter === 'hq' ? null : 'hq')}
                  hasValue={false} onClear={() => {}}>
                  <Input placeholder="Country or region..." className="h-8 text-[12px]" />
                </FilterSectionRow>

                <FilterSectionRow icon={Briefcase} label="Industry"
                  isOpen={openFilter === 'industry'} onToggle={() => setOpenFilter(openFilter === 'industry' ? null : 'industry')}
                  hasValue={industries.length > 0} onClear={() => setIndustries([])}>
                  <Select value={industries[0] || ""} onValueChange={(v) => setIndustries(v ? [v] : [])}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Industry" /></SelectTrigger>
                    <SelectContent>
                      {["Technology", "Software & SaaS", "Financial Services", "Banking", "Healthcare", "Pharmaceuticals", "Manufacturing", "Retail & E-Commerce", "Real Estate", "Education", "Media & Entertainment", "Telecommunications", "Transportation & Logistics", "Energy & Utilities", "Government", "Non-Profit", "Legal Services", "Consulting", "Marketing & Advertising", "Other"].map((ind) => (
                        <SelectItem key={ind} value={ind} className="text-[12px]">{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select defaultValue="naics">
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="naics" className="text-[12px]">NAICS</SelectItem>
                      <SelectItem value="sic" className="text-[12px]">SIC</SelectItem>
                      <SelectItem value="isic" className="text-[12px]">ISIC</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Search by NAICS code" className="h-8 text-[12px]" />
                </FilterSectionRow>

                <FilterSectionRow icon={Users} label="Headcount"
                  isOpen={openFilter === 'headcount'} onToggle={() => setOpenFilter(openFilter === 'headcount' ? null : 'headcount')}
                  hasValue={!!headcountSelected} onClear={() => { setHeadcountSelected(""); setHeadcountRange([10, 10000]) }}>
                  <Select value={headcountSelected} onValueChange={(v) => {
                    setHeadcountSelected(v)
                    const map: Record<string, [number, number]> = {
                      "1-10": [1, 10], "11-50": [11, 50], "51-200": [51, 200],
                      "201-500": [201, 500], "501-1000": [501, 1000],
                      "1001-5000": [1001, 5000], "5001-10000": [5001, 10000], "10001+": [10001, 1000000],
                    }
                    setHeadcountRange(map[v] ?? [10, 10000])
                  }}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Company Headcount" /></SelectTrigger>
                    <SelectContent>
                      {["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10001+"].map((r) => (
                        <SelectItem key={r} value={r} className="text-[12px]">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Headcount Annual Growth" /></SelectTrigger>
                    <SelectContent>
                      {["Shrinking (< 0%)", "Flat (0–5%)", "Growing (5–20%)", "Fast Growing (20–50%)", "Hyper Growth (50%+)"].map((r) => (
                        <SelectItem key={r} value={r} className="text-[12px]">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterSectionRow>

                <FilterSectionRow icon={DollarSign} label="Revenue"
                  isOpen={openFilter === 'revenue'} onToggle={() => setOpenFilter(openFilter === 'revenue' ? null : 'revenue')}
                  hasValue={!!revenue} onClear={() => setRevenue("")}>
                  <Select value={revenue} onValueChange={setRevenue}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select revenue range" /></SelectTrigger>
                    <SelectContent>
                      {["$0–$1M", "$1M–$10M", "$10M–$25M", "$25M–$50M", "$50M–$100M", "$100M–$250M", "$250M–$500M", "$500M–$1B", "$1B+"].map((r) => (
                        <SelectItem key={r} value={r} className="text-[12px]">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]" onClick={() => setColumnSettingsOpen(true)}>
                  <Settings2 className="h-3.5 w-3.5" /> Columns
                </Button>
                {searchResults.length > 0 && searchResults.some(lead => !revealedContacts[lead.id]) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevealAll}
                    disabled={revealingContacts.size > 0}
                  >
                    {revealingContacts.size > 0 ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Revealing...
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Reveal All
                      </>
                    )}
                  </Button>
                )}
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
                    onClick={handleBulkAddToProspects}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Add All to Prospects
                  </Button>
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
                <Loader2 className="h-8 w-8 text-muted-foreground mb-3 animate-spin" />
                <p className="text-[13px] font-medium">Searching...</p>
                <p className="text-[12px] text-muted-foreground mt-1">Finding leads that match your criteria</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <User className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-[13px] font-medium">No leads found</p>
                <p className="text-[12px] text-muted-foreground mt-1 max-w-xs">Try adjusting your search criteria or filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-4 py-2.5 w-10 border-b border-border">
                        <Checkbox
                          checked={selectedProspects.length === searchResults.length && searchResults.length > 0}
                          onCheckedChange={selectAllProspects}
                          id="select-all-thead"
                        />
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border whitespace-nowrap">Name</th>
                      {LEAD_RESULT_COLS.filter(c => visibleResultCols.has(c.key)).map(c => (
                        <th key={c.key} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border whitespace-nowrap">{c.label}</th>
                      ))}
                      <th className="px-4 py-2.5 border-b border-border w-28" />
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((lead) => {
                      const isExpanded = expandedCards.has(lead.id)
                      const rawPrimary = lead.emails?.[0]
                      const primaryEmail = (typeof rawPrimary === 'string' ? rawPrimary : (rawPrimary as any)?.email) || lead.email
                      const revealed = revealedContacts[lead.id]
                      const displayEmail = revealed?.emails?.[0]?.email || revealed?.email || primaryEmail
                      const displayPhone = revealed?.phones?.[0]?.prettyNumber || revealed?.phones?.[0]?.number || revealed?.phone || lead.phone

                      return (
                        <Fragment key={lead.id}>
                          <tr
                            className="border-b border-border/60 cursor-pointer transition-colors hover:bg-muted/30"
                            onClick={() => toggleExpanded(lead.id)}
                          >
                            {/* Checkbox */}
                            <td className="px-4 py-2.5 w-10" onClick={(e) => { e.stopPropagation(); toggleProspectSelection(lead.id) }}>
                              <Checkbox
                                checked={selectedProspects.includes(lead.id)}
                                onCheckedChange={() => toggleProspectSelection(lead.id)}
                              />
                            </td>
                            {/* Name */}
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-medium text-foreground whitespace-nowrap">{toTitleCase(lead.name)}</span>
                                {lead.linkedin && (
                                  <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                    <LinkedinIcon className="h-3.5 w-3.5 text-[#0A66C2] opacity-70 hover:opacity-100" />
                                  </a>
                                )}
                              </div>
                            </td>
                            {visibleResultCols.has('title') && (
                              <td className="px-4 py-2.5 max-w-[200px]">
                                <span className="text-[13px] text-muted-foreground truncate block">{toTitleCase(lead.title) || '—'}</span>
                              </td>
                            )}
                            {visibleResultCols.has('company') && (
                              <td className="px-4 py-2.5">
                                <span className="text-[13px] text-foreground whitespace-nowrap">{toTitleCase(lead.company) || '—'}</span>
                              </td>
                            )}
                            {visibleResultCols.has('emails') && (
                              <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                {displayEmail ? (
                                  <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                    {displayEmail}
                                  </span>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[12px] gap-1.5"
                                    disabled={revealingContacts.has(lead.id)}
                                    onClick={() => handleReveal(lead)}
                                  >
                                    {revealingContacts.has(lead.id) ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Mail className="h-3 w-3 text-green-500" />
                                    )}
                                    Access email
                                  </Button>
                                )}
                              </td>
                            )}
                            {visibleResultCols.has('phones') && (
                              <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                {displayPhone ? (
                                  <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                    {displayPhone}
                                  </span>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[12px] gap-1.5"
                                    disabled={revealingContacts.has(lead.id)}
                                    onClick={() => handleReveal(lead)}
                                  >
                                    {revealingContacts.has(lead.id) ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Phone className="h-3 w-3" />
                                    )}
                                    Access mobile
                                  </Button>
                                )}
                              </td>
                            )}
                            {visibleResultCols.has('location') && (
                              <td className="px-4 py-2.5">
                                <span className="text-[13px] text-muted-foreground whitespace-nowrap">{toTitleCase(lead.location) || '—'}</span>
                              </td>
                            )}
                            {visibleResultCols.has('seniority') && (
                              <td className="px-4 py-2.5">
                                <span className="text-[13px] text-muted-foreground">{lead.seniorityLevel || '—'}</span>
                              </td>
                            )}
                            {visibleResultCols.has('intent') && (
                              <td className="px-4 py-2.5">
                                {getBuyerIntentBadge(lead.buyerIntent)}
                              </td>
                            )}
                            {/* Actions */}
                            <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <Button size="sm" className="h-7 text-[12px]" onClick={() => handleAddToProspects(lead)}>
                                  + Add
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => toggleExpanded(lead.id)}
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
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Contact Details</p>
                                    <div className="space-y-1.5">
                                      {revealed ? (
                                        <>
                                          {revealed.emails?.map((e, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-[13px]">
                                              <Mail className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                              <span>{e.email}</span>
                                              <span className="text-[11px] text-muted-foreground">{e.type}</span>
                                              {e.status === 'valid' && <span className="text-[11px] text-green-500">verified</span>}
                                            </div>
                                          ))}
                                          {!revealed.emails?.length && revealed.email && (
                                            <div className="flex items-center gap-2 text-[13px]">
                                              <Mail className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                              <span>{revealed.email}</span>
                                            </div>
                                          )}
                                          {revealed.phones?.map((p, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-[13px]">
                                              <Phone className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                              <span>{p.prettyNumber || p.number}</span>
                                              <span className="text-[11px] text-muted-foreground">{p.type}</span>
                                            </div>
                                          ))}
                                          {!revealed.phones?.length && revealed.phone && (
                                            <div className="flex items-center gap-2 text-[13px]">
                                              <Phone className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                              <span>{revealed.phone}</span>
                                            </div>
                                          )}
                                          {!revealed.emails?.length && !revealed.email && !revealed.phones?.length && !revealed.phone && (
                                            <p className="text-[12px] text-muted-foreground">No contact details found</p>
                                          )}
                                        </>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 text-[12px]"
                                          disabled={revealingContacts.has(lead.id)}
                                          onClick={() => handleReveal(lead)}
                                        >
                                          {revealingContacts.has(lead.id) ? (
                                            <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Revealing...</>
                                          ) : 'Reveal Contact'}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Point of View</p>
                                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                                      <strong className="text-foreground">Opportunity:</strong> {toTitleCase(lead.name)} is a {toTitleCase(lead.title)} at {toTitleCase(lead.company)}{lead.companySize ? `, a ${lead.companySize} company` : ''}{lead.industry ? ` in the ${lead.industry} industry` : ''}. {lead.seniorityLevel ? `Based on their seniority (${lead.seniorityLevel}), they likely have decision-making authority.` : ''} {getBuyerIntentText(lead.buyerIntent) ? `With ${getBuyerIntentText(lead.buyerIntent)}, they may be actively evaluating solutions.` : ''}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" className="h-7 text-[12px]">
                                        Add to Sequence <ChevronDown className="ml-1.5 h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {sequences.map((sequence) => (
                                        <DropdownMenuItem key={sequence.id} onClick={() => handleAddToSequence(lead, sequence.id)}>
                                          {sequence.name}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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

      <LeadsResultColSettings
        open={columnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
        visibleCols={visibleResultCols}
        onSave={setVisibleResultCols}
      />
    </div>
  )
}
