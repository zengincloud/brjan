"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  Globe,
  Sparkles,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  Target,
  MessageSquare,
  Lightbulb,
  UserPlus,
  Linkedin,
  Shield,
  AlertTriangle,
  Zap,
  BookOpen,
  Mic,
  Clock,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type Account = {
  id: string
  name: string
  industry?: string | null
  location?: string | null
  website?: string | null
  linkedin?: string | null
  employees?: number | null
  status: string
  sequence?: string | null
  sequenceStep?: string | null
  lastActivity: string
  contacts: number
  createdAt: string
  updatedAt: string
}

type POVData = {
  industryLandscape: string
  companyIntel: string
  swot: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
  keyPlayers: string[]
  engagementStrategy: string
  whatTheyDo?: string
  specificIndustry?: string
  exampleUseCase?: string
}

type Contact = {
  id: string
  name: string
  email: string | null
  title: string | null
  company: string | null
  phone: string | null
  linkedin: string | null
  status: string
  lastActivity: string
}

type ActivityItem = {
  id: string
  type: "call" | "email" | "linkedin"
  contactName: string | null
  detail: string
  time: string
  outcome?: string | null
  duration?: number | null
  recordingUrl?: string | null
  emailStatus?: string | null
  subject?: string | null
}

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const accountId = params.id as string

  const [account, setAccount] = useState<Account | null>(null)
  const [pov, setPov] = useState<POVData | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPov, setLoadingPov] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingActivity, setLoadingActivity] = useState(false)

  useEffect(() => {
    if (accountId) {
      loadAccount()
      loadPov()
      loadContacts()
      loadActivity()
    }
  }, [accountId])

  const loadAccount = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/accounts/${accountId}`)
      if (!response.ok) {
        throw new Error("Failed to load account")
      }
      const data = await response.json()
      setAccount(data.account)
      // Pre-populate POV from cached account data if available
      if (data.account?.pov) {
        setPov(data.account.pov as POVData)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to load account details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadPov = async (force: boolean = false) => {
    try {
      setLoadingPov(true)
      const url = force
        ? `/api/accounts/${accountId}/pov?force=true`
        : `/api/accounts/${accountId}/pov`

      const response = await fetch(url)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        if (data.error?.includes('ANTHROPIC_API_KEY')) {
          // Silently skip if no API key configured
          return
        }
        throw new Error(data.error || "Failed to fetch POV")
      }

      const data = await response.json()
      setPov(data.pov)
    } catch (error: any) {
      console.error("Error fetching POV:", error)
      toast({
        title: "POV Generation Failed",
        description: error.message || "Something went wrong generating the briefing",
        variant: "destructive",
      })
    } finally {
      setLoadingPov(false)
    }
  }

  const loadContacts = async () => {
    try {
      setLoadingContacts(true)
      const response = await fetch(`/api/accounts/${accountId}/contacts`)
      if (!response.ok) throw new Error("Failed to fetch contacts")
      const data = await response.json()
      setContacts(data.contacts || [])
    } catch (error) {
      console.error("Error fetching contacts:", error)
    } finally {
      setLoadingContacts(false)
    }
  }

  const loadActivity = async () => {
    try {
      setLoadingActivity(true)
      const response = await fetch(`/api/accounts/${accountId}/activity`)
      if (!response.ok) throw new Error("Failed to fetch activity")
      const data = await response.json()
      setActivity(data.activity || [])
    } catch (error) {
      console.error("Error fetching activity:", error)
    } finally {
      setLoadingActivity(false)
    }
  }

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getOutcomeVariant = (outcome: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
    if (!outcome) return "outline"
    if (outcome.startsWith("connected")) return "default"
    if (outcome === "voicemail" || outcome === "gatekeeper") return "secondary"
    if (outcome === "failed") return "destructive"
    return "outline"
  }

  const formatLastActivity = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return "Recently"
    }
  }

  const handleMultithread = () => {
    const recentRoles = ["VP", "Director", "Manager"]

    const params = new URLSearchParams({
      company: account?.name || "",
      seniorityLevels: JSON.stringify(recentRoles),
      autoSearch: "true",
    })

    router.push(`/prospecting/outbound?tab=leads&${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BRLoader />
      </div>
    )
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Account Not Found</h2>
          <p className="text-muted-foreground mb-4">The account you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push("/accounts")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Accounts
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/accounts")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Accounts
        </Button>
        <div className="flex gap-2">
          {account.linkedin && (
            <Button variant="outline" asChild>
              <a href={account.linkedin} target="_blank" rel="noopener noreferrer">
                <Linkedin className="mr-2 h-4 w-4" />
                LinkedIn
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={handleMultithread}>
            <UserPlus className="mr-2 h-4 w-4" />
            Multithread?
          </Button>
          <Button variant="outline">
            <Phone className="mr-2 h-4 w-4" />
            Call
          </Button>
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
        </div>
      </div>

      {/* Account Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl flex items-center gap-2">
                  {account.name}
                  {account.linkedin && (
                    <a href={account.linkedin} target="_blank" rel="noopener noreferrer" title="View LinkedIn">
                      <Linkedin className="h-5 w-5 text-[#0A66C2] hover:opacity-80 transition-opacity" />
                    </a>
                  )}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  {account.industry || "Industry not specified"}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {account.status.replace(/_/g, " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {account.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{account.location}</p>
                </div>
              </div>
            )}
            {account.employees != null && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="font-medium">{account.employees.toLocaleString()}</p>
                </div>
              </div>
            )}
            {account.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  <a
                    href={account.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {account.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Last Activity</p>
                <p className="font-medium">{formatLastActivity(account.lastActivity)}</p>
              </div>
            </div>
          </div>

          {account.sequence && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Sequence</p>
                  <p className="font-medium">{account.sequence}</p>
                </div>
                {account.sequenceStep && (
                  <Badge variant="secondary">{account.sequenceStep}</Badge>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Point of View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <CardTitle>Point of View</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPov(true)}
              disabled={loadingPov}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingPov ? "animate-spin" : ""}`} />
              {pov ? "Refresh" : "Generate"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPov ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Generating point of view...</span>
              </div>
            </div>
          ) : pov ? (
            <div className="space-y-4">
              {pov.whatTheyDo && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">What They Do</p>
                  <p className="text-sm leading-relaxed">{pov.whatTheyDo}</p>
                </div>
              )}
              {pov.specificIndustry && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Industry</p>
                  <p className="text-sm font-medium">{pov.specificIndustry}</p>
                </div>
              )}
              {pov.exampleUseCase && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Example Use Case</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{pov.exampleUseCase}</p>
                </div>
              )}
              {/* Fallback for older POVs that don't have simplified fields */}
              {!pov.whatTheyDo && !pov.specificIndustry && pov.companyIntel && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Company Intel</p>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{pov.companyIntel}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-3">Generate an AI-powered point of view for {account.name}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadPov(false)}
                disabled={loadingPov}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Emails, calls, and other interactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingActivity ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
              Loading activity...
            </div>
          ) : activity.length > 0 ? (
            <div className="divide-y">
              {activity.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 py-2.5">
                  <div className="flex items-center gap-2 w-40 shrink-0">
                    {item.type === "call" ? (
                      <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                    ) : item.type === "linkedin" ? (
                      <Linkedin className="h-3.5 w-3.5 text-[#0A66C2] shrink-0" />
                    ) : (
                      <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">
                      {item.contactName || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {item.type === "call" && item.outcome && (
                      <Badge variant={getOutcomeVariant(item.outcome)} className="text-xs shrink-0">
                        {item.detail.replace("Call — ", "")}
                      </Badge>
                    )}
                    {(item.type === "email" || item.type === "linkedin") && (
                      <span className="text-sm text-muted-foreground truncate">{item.detail}</span>
                    )}
                    {item.type === "call" && item.duration != null && item.duration > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">{formatDuration(item.duration)}</span>
                    )}
                    {item.type === "call" && item.recordingUrl && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Mic className="h-3 w-3 text-primary" />
                        <audio controls className="h-6 w-32" src={`/api/calls/${item.id}/recording`} />
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatLastActivity(item.time)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No activity recorded yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts - Linked Prospects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contacts</CardTitle>
              <CardDescription>Prospects associated with {account.name}</CardDescription>
            </div>
            <Button size="sm" onClick={handleMultithread}>
              <UserPlus className="mr-2 h-4 w-4" />
              Find More
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingContacts ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
              Loading contacts...
            </div>
          ) : contacts.length > 0 ? (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {contact.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.title || "No title"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.email && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={`mailto:${contact.email}`} title={contact.email}>
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {contact.phone && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={`tel:${contact.phone}`} title={contact.phone}>
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {contact.linkedin && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                          <Linkedin className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {contact.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-1">No contacts yet</p>
              <p className="text-sm mb-4">Save prospects from {account.name} to see them here</p>
              <Button variant="outline" size="sm" onClick={handleMultithread}>
                <UserPlus className="mr-2 h-4 w-4" />
                Find Contacts
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
