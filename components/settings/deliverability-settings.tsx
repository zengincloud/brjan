"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bell,
  ChevronRight,
  ExternalLink,
  Filter,
  Info,
  Link2,
  Loader2,
  Mail,
  MoreHorizontal,
  Play,
  Search,
  Settings2,
  SlidersHorizontal,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"
import { toast } from "sonner"

interface GmailIntegration {
  email: string
  isActive: boolean
  connectedAt: string
  tokenValid: boolean
}

interface GmailStatus {
  connected: boolean
  integration: GmailIntegration | null
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  children,
  badge,
  footer,
}: {
  title: string
  value: string
  subtitle?: string
  children?: React.ReactNode
  badge?: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="border border-border rounded-lg p-4 flex flex-col gap-3 relative">
      {badge && <div className="absolute top-4 right-4">{badge}</div>}
      <div>
        <p className="text-[12px] text-muted-foreground">{title}</p>
        <p className="text-xl font-semibold mt-0.5">{value}</p>
        {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="space-y-1.5">{children}</div>}
      {footer && (
        <div className="pt-2 mt-auto border-t border-border">
          {footer}
        </div>
      )}
    </div>
  )
}

function StatRow({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  )
}

/* ─── OVERVIEW ─── */
function OverviewView({ gmailStatus }: { gmailStatus: GmailStatus | null }) {
  return (
    <div className="space-y-4">
      {/* Alert */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-muted/30 text-[13px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" />
          <span>Deliverability is best managed with a teammate. Invite someone who owns DNS, email, or IT settings to help configure this correctly.</span>
        </div>
        <X className="h-4 w-4 cursor-pointer shrink-0 ml-3" />
      </div>

      {/* Mailbox performance */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <p className="text-[13px] font-semibold">Mailbox performance</p>
        <p className="text-[12px] text-muted-foreground">Select a mailbox to view its specific performance metrics below.</p>
        <div className="flex items-center gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-48 h-8 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[13px]">All mailboxes</SelectItem>
              {gmailStatus?.integration && (
                <SelectItem value={gmailStatus.integration.email} className="text-[13px]">
                  {gmailStatus.integration.email}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Manage mailboxes
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          title="Emails sent successfully"
          value="0 %"
          subtitle="From last month"
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Delivery performance</p>
              <p className="text-[12px] text-muted-foreground">Learn how to improve delivery results <span className="underline cursor-pointer">here</span>.</p>
            </div>
          }
        >
          <StatRow icon={TrendingUp} label="0 Delivered" />
          <StatRow icon={TrendingDown} label="0 Bounced" />
        </StatCard>

        <StatCard
          title="Open rate"
          value="0 %"
          subtitle="From last month"
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Inbox interactions</p>
              <p className="text-[12px] text-muted-foreground">Understand what impacts your open rate <span className="underline cursor-pointer">here</span>.</p>
            </div>
          }
        >
          <StatRow icon={Mail} label="0 Opened" />
          <StatRow icon={ExternalLink} label="0 Clicked" />
        </StatCard>

        <StatCard
          title="Reply activity"
          value="0 %"
          subtitle="From last month"
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reply engagement</p>
              <p className="text-[12px] text-muted-foreground">Learn what affects your reply rate <span className="underline cursor-pointer">here</span>.</p>
            </div>
          }
        >
          <StatRow icon={TrendingUp} label="0 Total number of replies" />
          <StatRow icon={ThumbsUp} label="0 Positive replies" />
        </StatCard>
      </div>

      {/* Chart + Recommendations */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">Emails Deliverability and Activity</p>
            <Select defaultValue="7d">
              <SelectTrigger className="w-36 h-7 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d" className="text-[12px]">Last 7 days</SelectItem>
                <SelectItem value="30d" className="text-[12px]">Last 30 days</SelectItem>
                <SelectItem value="90d" className="text-[12px]">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4 border-b border-border pb-2">
            {["Deliverability", "Activity"].map((t, i) => (
              <button key={t} className={`text-[13px] pb-2 border-b-2 ${i === 0 ? "border-foreground font-medium" : "border-transparent text-muted-foreground"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="h-32 flex items-end justify-center gap-2 pt-4">
            <p className="text-[12px] text-muted-foreground self-center">No data available</p>
          </div>
        </div>

        <div className="border border-border rounded-lg p-4 space-y-3">
          <p className="text-[13px] font-semibold">Recommendations</p>
          <Select defaultValue="active">
            <SelectTrigger className="h-7 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active" className="text-[12px]">Active</SelectItem>
              <SelectItem value="all" className="text-[12px]">All</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[12px] text-muted-foreground">No recommendations at this time.</p>
        </div>
      </div>
    </div>
  )
}

/* ─── DOMAINS ─── */
function DomainsView({ domain }: { domain: string | null }) {
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Authenticated sending domains"
          value="0 %"
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Authentication coverage</p>
              <p className="text-[12px] text-muted-foreground">Learn how these affect email deliverability <span className="underline cursor-pointer">here</span>.</p>
            </div>
          }
        >
          <StatRow icon={Bell} label={`${domain ? "0/1" : "0/0"} SPF`} />
          <StatRow icon={Bell} label={`${domain ? "0/1" : "0/0"} DKIM`} />
          <StatRow icon={Bell} label={`${domain ? "0/1" : "0/0"} DMARC`} />
        </StatCard>

        <StatCard
          title="Average bounce rate performance"
          value="0 %"
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Bounce rate by domain</p>
              <p className="text-[12px] text-muted-foreground">Understand bounce rate and its impact <span className="underline cursor-pointer">here</span>.</p>
            </div>
          }
        >
          <p className="text-[12px] text-muted-foreground">No emails sent</p>
        </StatCard>
      </div>

      {/* Domains table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-[13px] font-semibold">Domains</span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
          <Button variant="ghost" size="sm" className="h-7 text-[12px] gap-1.5 text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Show Filters
          </Button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search domains..." className="h-7 pl-7 text-[12px] w-48" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-[12px] gap-1.5 text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Sort
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[12px] gap-1.5 text-muted-foreground">
              <Settings2 className="h-3.5 w-3.5" />
              View options
            </Button>
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border">
              {["Domain", "Status", "Type", "Bounce rate", "Linked mailboxes", "Redirect URL", "Next bill date"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {domain ? (
              <tr className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{domain}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className="text-[11px]">N/A</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Link2 className="h-3.5 w-3.5" />
                    Linked
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">0 %</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[11px] gap-1">
                    <Mail className="h-3 w-3" />
                    {domain ? `sadid@${domain}` : "—"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">—</td>
                <td className="px-4 py-3 text-muted-foreground">—</td>
              </tr>
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                  No domains found. Link a mailbox to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── MAILBOXES ─── */
function MailboxesView({
  gmailStatus,
  onLinkMailbox,
}: {
  gmailStatus: GmailStatus | null
  onLinkMailbox: () => void
}) {
  const mailbox = gmailStatus?.integration
  const totalMailboxes = mailbox ? 1 : 0
  const completedMailboxes = 0 // Would require DNS checks
  const warmedMailboxes = 0

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Mailboxes completed and ready for use"
          value={`${completedMailboxes} of ${totalMailboxes}`}
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mailbox setup status</p>
              <p className="text-[12px] text-muted-foreground">Learn what&apos;s needed to complete setup <span className="underline cursor-pointer">here</span>.</p>
            </div>
          }
        >
          <StatRow icon={Bell} label={`${totalMailboxes > 0 ? 1 : 0} Partial`} />
          <StatRow icon={Bell} label="0 Not started" />
          <StatRow icon={Bell} label="0 Needs Attention" />
        </StatCard>

        <StatCard
          title="Mailboxes warmed up"
          value={`${warmedMailboxes} of ${totalMailboxes}`}
          badge={
            <div className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
              0%
            </div>
          }
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mailbox warmup</p>
              <p className="text-[12px] text-muted-foreground">Learn why warming up your mailbox matters <span className="underline cursor-pointer">here</span>.</p>
            </div>
          }
        >
          {mailbox && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Bell className="h-3.5 w-3.5" />
                We recommend starting warmup for the remaining ones:
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <Badge variant="outline" className="text-[11px] gap-1 font-normal">
                  <ChevronRight className="h-3 w-3" />
                  {mailbox.email}
                </Badge>
              </div>
            </div>
          )}
        </StatCard>
      </div>

      {/* Mailboxes table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-semibold">Mailboxes</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
          <Button variant="ghost" size="sm" className="h-7 text-[12px] gap-1.5 text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Show Filters
          </Button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search mailboxes..." className="h-7 pl-7 text-[12px] w-48" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-[12px] bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-medium"
              onClick={onLinkMailbox}
            >
              Link mailbox
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[12px] gap-1.5 text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Sort
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[12px] gap-1.5 text-muted-foreground">
              <Settings2 className="h-3.5 w-3.5" />
              View options
            </Button>
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border">
              <th className="w-8 px-4 py-2.5">
                <input type="checkbox" className="h-3.5 w-3.5 rounded" />
              </th>
              {["Mailbox", "Type", "Setup", "Warmup", "Daily limit", "Deliverability", "Blocklist", "Inbox placement", "Actions"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 whitespace-nowrap">
                  {h === "Warmup" || h === "Deliverability" || h === "Blocklist" || h === "Inbox placement" ? (
                    <span className="flex items-center gap-1">{h} <Info className="h-3 w-3" /></span>
                  ) : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mailbox ? (
              <tr className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <input type="checkbox" className="h-3.5 w-3.5 rounded" />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-white border flex items-center justify-center shrink-0">
                      <GoogleIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-1.5">
                        {mailbox.email}
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Default</Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground">0 email aliases</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5" />
                    Linked mailbox
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <span>See details</span>
                      <span>20% Completed</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full w-32 overflow-hidden">
                      <div className="h-full bg-foreground/60 rounded-full" style={{ width: "20%" }} />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <Switch className="scale-75" />
                    <span className="text-muted-foreground">Start warm up</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-muted-foreground">0 / 250</td>
                <td className="px-3 py-3">
                  <Badge variant="secondary" className="text-[11px]">No data</Badge>
                </td>
                <td className="px-3 py-3">
                  <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-[12px]">
                    <Play className="h-3 w-3" />
                    Run check
                  </button>
                </td>
                <td className="px-3 py-3">
                  <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-[12px]">
                    <Play className="h-3 w-3" />
                    Run test
                  </button>
                </td>
                <td className="px-3 py-3">
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                  No mailboxes found. Click &quot;Link mailbox&quot; to connect your inbox.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── MAIN COMPONENT ─── */
export function DeliverabilitySettings({ tab }: { tab: "overview" | "domains" | "mailboxes" }) {
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const fetchGmailStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/gmail/status")
      if (res.ok) {
        const data = await res.json()
        setGmailStatus(data)
        return data
      }
    } catch {}
    return null
  }, [])

  useEffect(() => {
    fetchGmailStatus()
  }, [fetchGmailStatus])

  const handleLinkMailbox = async () => {
    setIsConnecting(true)
    try {
      const res = await fetch("/api/integrations/gmail/connect")
      const data = await res.json()
      if (data.authUrl) {
        window.open(data.authUrl, "_blank", "noopener,noreferrer")
        const handleFocus = async () => {
          const newStatus = await fetchGmailStatus()
          if (newStatus?.connected) {
            window.removeEventListener("focus", handleFocus)
            setIsConnecting(false)
            toast.success("Mailbox linked successfully!")
          }
        }
        window.addEventListener("focus", handleFocus)
        setTimeout(() => {
          setIsConnecting(false)
          window.removeEventListener("focus", handleFocus)
        }, 5 * 60 * 1000)
      }
    } catch {
      toast.error("Failed to initiate mailbox connection")
      setIsConnecting(false)
    }
  }

  const domain = gmailStatus?.integration?.email
    ? gmailStatus.integration.email.split("@")[1]
    : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Deliverability Suite</h2>
        {isConnecting && (
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Connecting...
          </div>
        )}
      </div>

      {tab === "overview" && <OverviewView gmailStatus={gmailStatus} />}
      {tab === "domains" && <DomainsView domain={domain} />}
      {tab === "mailboxes" && <MailboxesView gmailStatus={gmailStatus} onLinkMailbox={handleLinkMailbox} />}
    </div>
  )
}
