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
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type Account = {
  id: string
  name: string
  industry?: string | null
  location?: string | null
  website?: string | null
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

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const accountId = params.id as string

  const [account, setAccount] = useState<Account | null>(null)
  const [insights, setInsights] = useState<CompanyInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingInsights, setLoadingInsights] = useState(false)

  useEffect(() => {
    if (accountId) {
      loadAccount()
      loadInsights()
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

  const formatLastActivity = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return "Recently"
    }
  }

  const handleMultithread = () => {
    // Get the last 3 different roles that have been touched (dummy data for now)
    // In the future, this will query actual prospect data for this account
    const recentRoles = ["VP", "Director", "Manager"]

    // Build query params for leads prospecting
    const params = new URLSearchParams({
      company: account?.name || "",
      seniorityLevels: JSON.stringify(recentRoles),
      autoSearch: "true", // Flag to trigger search on load
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
          <p className="text-muted-foreground mb-4">The account you're looking for doesn't exist.</p>
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
            {account.employees !== null && (
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

      {/* Point of View */}
      <Card>
        <CardHeader>
          <CardTitle>Point of View</CardTitle>
          <CardDescription>Strategic insights and engagement approach</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Intent Signals */}
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
                Engagement Strategy
              </h4>
              <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
                <p className="mb-2">
                  <strong className="text-foreground">Opportunity:</strong> Recent funding and aggressive hiring
                  indicate {account.name} is in rapid growth mode and likely experiencing operational scaling challenges.
                </p>
                <p className="mb-2">
                  <strong className="text-foreground">Industry Context:</strong> In the {account.industry || "their"} space, companies like
                  {" "}{account.name} are currently facing challenges around AI adoption, workforce efficiency, and maintaining
                  competitive advantage during market shifts. With increasing pressure to do more with less and demonstrate clear ROI
                  on technology investments, this is something they're likely worried about.
                </p>
                <p className="mb-2">
                  <strong className="text-foreground">How to Help:</strong> Your platform's automation capabilities
                  can help them scale their operations without proportional headcount increases.
                </p>
                <p>
                  <strong className="text-foreground">Angle:</strong> Lead with ROI case studies from similar-sized
                  companies. Emphasize time-to-value and ease of implementation given their rapid growth timeline.
                  Focus on VP of Sales/Ops who owns scaling challenges.
                </p>
              </div>
            </div>
          </div>
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

      {/* Contacts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contacts</CardTitle>
              <CardDescription>People associated with this account</CardDescription>
            </div>
            <Button size="sm">Add Contact</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {account.contacts === 0 ? "No contacts added yet" : `${account.contacts} contacts`}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
