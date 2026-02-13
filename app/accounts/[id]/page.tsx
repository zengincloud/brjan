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
  TrendingUp,
  DollarSign,
  Wrench,
  Briefcase,
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

type CompanyInsights = {
  growth: string | null
  funding: string | null
  techStack: string | null
  hiring: string | null
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

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const accountId = params.id as string

  const [account, setAccount] = useState<Account | null>(null)
  const [insights, setInsights] = useState<CompanyInsights | null>(null)
  const [pov, setPov] = useState<POVData | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [loadingPov, setLoadingPov] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)

  useEffect(() => {
    if (accountId) {
      loadAccount()
      loadInsights()
      loadPov()
      loadContacts()
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

  const loadInsights = async (force: boolean = false) => {
    try {
      setLoadingInsights(true)
      const url = force
        ? `/api/accounts/${accountId}/insights?force=true`
        : `/api/accounts/${accountId}/insights`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch insights")
      }

      const data = await response.json()
      setInsights(data.insights)
    } catch (error) {
      console.error("Error fetching insights:", error)
      toast({
        title: "Error",
        description: "Failed to load company insights",
        variant: "destructive",
      })
    } finally {
      setLoadingInsights(false)
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
    } catch (error) {
      console.error("Error fetching POV:", error)
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
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading account details...</p>
        </div>
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
                <CardTitle className="text-3xl">{account.name}</CardTitle>
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

      {/* Company Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Company Insights</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadInsights(true)}
              disabled={loadingInsights}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingInsights ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <CardDescription>AI-powered insights from recent news and data</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInsights ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Fetching latest company insights...</span>
              </div>
            </div>
          ) : insights ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.growth && (
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                  <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium mb-1">Growth signals</div>
                    <div className="text-sm text-muted-foreground">{insights.growth}</div>
                  </div>
                </div>
              )}

              {insights.funding && (
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                  <DollarSign className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium mb-1">Funding</div>
                    <div className="text-sm text-muted-foreground">{insights.funding}</div>
                  </div>
                </div>
              )}

              {insights.techStack && (
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                  <Wrench className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium mb-1">Tech stack</div>
                    <div className="text-sm text-muted-foreground">{insights.techStack}</div>
                  </div>
                </div>
              )}

              {insights.hiring && (
                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                  <Briefcase className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium mb-1">Hiring</div>
                    <div className="text-sm text-muted-foreground">{insights.hiring}</div>
                  </div>
                </div>
              )}

              {!insights.growth && !insights.funding && !insights.techStack && !insights.hiring && (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  No recent insights found for this company
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Click refresh to load company insights
            </div>
          )}
        </CardContent>
      </Card>

      {/* Point of View - AI Generated */}
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
          <CardDescription>AI-powered strategic intelligence and engagement strategy</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPov ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <div>
                  <p className="font-medium">Generating strategic briefing...</p>
                  <p className="text-sm">Analyzing news, industry trends, and company data</p>
                </div>
              </div>
            </div>
          ) : pov ? (
            <div className="space-y-6">
              {/* Industry Landscape */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Industry Landscape
                </h4>
                <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg whitespace-pre-line leading-relaxed">
                  {pov.industryLandscape}
                </div>
              </div>

              {/* Company Intel */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Company Intelligence
                </h4>
                <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg whitespace-pre-line leading-relaxed">
                  {pov.companyIntel}
                </div>
              </div>

              {/* SWOT Analysis */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  SWOT Analysis
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">Strengths</span>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {pov.swot.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">+</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium text-sm">Weaknesses</span>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {pov.swot.weaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-yellow-500 mt-0.5">-</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">Opportunities</span>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {pov.swot.opportunities.map((o, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">*</span>
                          <span>{o}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-sm">Threats</span>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {pov.swot.threats.map((t, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">!</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Key Players */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Key Players in the Space
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {pov.keyPlayers.map((player, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg border bg-card text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{player}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Engagement Strategy */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Engagement Strategy
                </h4>
                <div className="text-sm text-muted-foreground bg-primary/5 border border-primary/20 p-4 rounded-lg whitespace-pre-line leading-relaxed">
                  {pov.engagementStrategy}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-1">No briefing generated yet</p>
              <p className="text-sm mb-4">Click Generate to create an AI-powered strategic briefing for {account.name}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadPov(false)}
                disabled={loadingPov}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Briefing
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
          <div className="text-center py-8 text-muted-foreground">
            No activity recorded yet
          </div>
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
