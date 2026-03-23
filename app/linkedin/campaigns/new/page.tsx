"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, Play } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

type SearchResult = {
  provider_id: string
  name: string
  headline?: string
  company?: string
  linkedin_url?: string
}

const NETWORK_OPTIONS = [
  { value: "F", label: "1st degree" },
  { value: "S", label: "2nd degree" },
  { value: "O", label: "3rd+ degree" },
]

export default function NewCampaignPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [keyword, setKeyword] = useState("")
  const [title, setTitle] = useState("")
  const [company, setCompany] = useState("")
  const [industry, setIndustry] = useState("")
  const [location, setLocation] = useState("")
  const [networkDegree, setNetworkDegree] = useState<string[]>(["S"])
  const [inviteMessage, setInviteMessage] = useState("")
  const [followUpMessage, setFollowUpMessage] = useState("")
  const [followUpDelayDays, setFollowUpDelayDays] = useState("1")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedProspects, setSelectedProspects] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)

  const searchFilters = {
    keyword: keyword || undefined,
    title: title || undefined,
    company: company || undefined,
    industry: industry || undefined,
    location: location || undefined,
    networkDegree: networkDegree.length ? networkDegree : undefined,
  }

  const handlePreviewSearch = async () => {
    setSearching(true)
    try {
      // First create a draft campaign, then run search on it
      const createRes = await fetch("/api/linkedin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "Draft",
          searchFilters,
          inviteMessage: inviteMessage || null,
          followUpMessage: followUpMessage || null,
          followUpDelayDays: parseInt(followUpDelayDays) || 1,
        }),
      })
      const created = await createRes.json()
      if (!created.campaign?.id) throw new Error("Failed to create campaign")

      const searchRes = await fetch(`/api/linkedin/campaigns/${created.campaign.id}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 0 }),
      })
      const searchData = await searchRes.json()
      const results = searchData.results?.items || []
      setSearchResults(results)

      // Delete the temp draft if user doesn't save
      await fetch(`/api/linkedin/campaigns/${created.campaign.id}`, { method: "DELETE" })
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" })
    } finally {
      setSearching(false)
    }
  }

  const toggleProspect = (p: SearchResult) => {
    setSelectedProspects(prev =>
      prev.find(x => x.provider_id === p.provider_id)
        ? prev.filter(x => x.provider_id !== p.provider_id)
        : [...prev, p]
    )
  }

  const handleLaunch = async (asDraft = false) => {
    if (!name.trim()) {
      toast({ title: "Campaign name required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const createRes = await fetch("/api/linkedin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          searchFilters,
          inviteMessage: inviteMessage || null,
          followUpMessage: followUpMessage || null,
          followUpDelayDays: parseInt(followUpDelayDays) || 1,
        }),
      })
      const { campaign } = await createRes.json()

      if (!asDraft && selectedProspects.length > 0) {
        await fetch(`/api/linkedin/campaigns/${campaign.id}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prospects: selectedProspects.map(p => ({
              linkedinProfileId: p.provider_id,
              name: p.name,
              company: p.company || null,
              title: p.headline || null,
              linkedinUrl: p.linkedin_url || null,
            })),
          }),
        })
      }

      router.push(`/linkedin/campaigns/${campaign.id}`)
    } catch (err: any) {
      toast({ title: "Failed to create campaign", description: err.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/linkedin/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">New Campaign</h1>
      </div>

      {/* Campaign name */}
      <div className="space-y-2">
        <Label>Campaign name</Label>
        <Input
          placeholder="e.g. VP Sales Outreach Q2"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      {/* Search filters */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Search Filters
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Keywords</Label>
            <Input placeholder="e.g. sales manager" value={keyword} onChange={e => setKeyword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Job title</Label>
            <Input placeholder="e.g. VP of Sales" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Input placeholder="e.g. Salesforce" value={company} onChange={e => setCompany(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Industry</Label>
            <Input placeholder="e.g. Software" value={industry} onChange={e => setIndustry(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input placeholder="e.g. Toronto, ON" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Network degree</Label>
            <div className="flex gap-2 flex-wrap">
              {NETWORK_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setNetworkDegree(prev =>
                      prev.includes(opt.value)
                        ? prev.filter(v => v !== opt.value)
                        : [...prev, opt.value]
                    )
                  }
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    networkDegree.includes(opt.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Separator />
        <p className="text-xs text-muted-foreground">
          Advanced filters (seniority level, company size, company type) require Sales Navigator — results will default to basic filters if Sales Navigator is not detected on your account.
        </p>

        <Button variant="outline" onClick={handlePreviewSearch} disabled={searching}>
          <Search className="h-4 w-4 mr-2" />
          {searching ? "Searching..." : "Preview Results"}
        </Button>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {searchResults.length} results — {selectedProspects.length} selected
            </p>
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto"
              onClick={() =>
                selectedProspects.length === searchResults.length
                  ? setSelectedProspects([])
                  : setSelectedProspects(searchResults)
              }
            >
              {selectedProspects.length === searchResults.length ? "Deselect all" : "Select all"}
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden divide-y max-h-64 overflow-y-auto">
            {searchResults.map(p => {
              const selected = selectedProspects.some(x => x.provider_id === p.provider_id)
              return (
                <button
                  key={p.provider_id}
                  onClick={() => toggleProspect(p)}
                  className={`w-full text-left px-4 py-2.5 transition-colors ${
                    selected ? "bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      {p.headline && (
                        <p className="text-xs text-muted-foreground">{p.headline}</p>
                      )}
                    </div>
                    {selected && (
                      <Badge variant="default" className="text-xs h-5">Selected</Badge>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Messages
        </h2>
        <div className="space-y-2">
          <Label>Connection request message <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            placeholder="Hi {{firstName}}, I'd love to connect..."
            value={inviteMessage}
            onChange={e => setInviteMessage(e.target.value)}
            rows={3}
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground text-right">{inviteMessage.length}/300</p>
        </div>
        <div className="space-y-2">
          <Label>Follow-up message after accepting <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            placeholder="Thanks for connecting! I wanted to reach out about..."
            value={followUpMessage}
            onChange={e => setFollowUpMessage(e.target.value)}
            rows={4}
          />
        </div>
        {followUpMessage && (
          <div className="space-y-2">
            <Label>Send follow-up after</Label>
            <Select value={followUpDelayDays} onValueChange={setFollowUpDelayDays}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Same day</SelectItem>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="2">2 days</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="5">5 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={() => handleLaunch(true)} disabled={saving}>
          Save as draft
        </Button>
        <Button
          onClick={() => handleLaunch(false)}
          disabled={saving || selectedProspects.length === 0}
        >
          <Play className="h-4 w-4 mr-2" />
          Launch Campaign ({selectedProspects.length} prospects)
        </Button>
      </div>
    </div>
  )
}
