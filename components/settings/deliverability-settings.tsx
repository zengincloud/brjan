"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Mail,
  Shield,
  ShieldAlert,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  MousePointerClick,
  Send,
} from "lucide-react"
import { toast } from "sonner"

interface GmailStatus {
  connected: boolean
  integration: { email: string; isActive: boolean; connectedAt: string; tokenValid: boolean } | null
}

interface DnsResult {
  pass: boolean
  record: string | null
  fix: string | null
}

interface DnsCheck {
  domain: string
  spf: DnsResult
  dkim: DnsResult
  dmarc: DnsResult
}

interface BlacklistResult {
  domain: string
  listed: string[]
  clean: string[]
  totalChecked: number
  isClean: boolean
}

interface DeliveryStats {
  period: number
  totals: { sent: number; failed: number; opened: number; clicked: number; total: number }
  rates: { deliveryRate: number | null; openRate: number | null; clickRate: number | null; bounceRate: number | null }
  daily: { date: string; sent: number; failed: number; opened: number }[]
}

function StatusIcon({ pass, loading }: { pass?: boolean; loading?: boolean }) {
  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  if (pass === true) return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (pass === false) return <XCircle className="h-4 w-4 text-red-500" />
  return <AlertCircle className="h-4 w-4 text-muted-foreground" />
}

function DnsRow({ label, result, loading }: { label: string; result?: DnsResult; loading: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <StatusIcon pass={result?.pass} loading={loading} />
        <span className="text-sm font-medium">{label}</span>
        {!loading && result && (
          <Badge variant={result.pass ? "secondary" : "destructive"} className="text-xs ml-auto">
            {result.pass ? "Pass" : "Fail"}
          </Badge>
        )}
      </div>
      {!loading && result?.record && (
        <p className="text-xs text-muted-foreground font-mono pl-6 truncate">{result.record}</p>
      )}
      {!loading && result?.fix && (
        <p className="text-xs text-amber-500 pl-6">{result.fix}</p>
      )}
    </div>
  )
}

function StatBox({ label, value, icon: Icon, sub }: { label: string; value: string | null; icon: React.ElementType; sub?: string }) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-semibold">{value ?? "—"}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

/* ─── OVERVIEW ─── */
function OverviewView({ domain }: { domain: string | null }) {
  const [stats, setStats] = useState<DeliveryStats | null>(null)
  const [period, setPeriod] = useState("30")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/deliverability/stats?days=${period}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data) })
      .finally(() => setLoading(false))
  }, [period])

  const fmt = (n: number | null) => n === null ? null : `${n}%`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Sending from {domain ?? "no mailbox connected"}</p>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="Delivery rate" value={fmt(stats?.rates.deliveryRate ?? null)} icon={Send} sub={`${stats?.totals.sent ?? 0} sent / ${stats?.totals.failed ?? 0} failed`} />
            <StatBox label="Open rate" value={fmt(stats?.rates.openRate ?? null)} icon={TrendingUp} sub={`${stats?.totals.opened ?? 0} opened`} />
            <StatBox label="Click rate" value={fmt(stats?.rates.clickRate ?? null)} icon={MousePointerClick} sub={`${stats?.totals.clicked ?? 0} clicked`} />
            <StatBox label="Bounce rate" value={fmt(stats?.rates.bounceRate ?? null)} icon={TrendingDown} sub={`${stats?.totals.failed ?? 0} bounced`} />
          </div>

          {stats && stats.totals.total === 0 && (
            <div className="border border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
              No emails sent in the last {period} days. Start sending to see stats here.
            </div>
          )}

          {stats && stats.daily.length > 0 && (
            <div className="border border-border rounded-lg p-4">
              <p className="text-sm font-medium mb-3">Daily sends</p>
              <div className="flex items-end gap-1 h-24">
                {stats.daily.map(d => {
                  const max = Math.max(...stats.daily.map(x => x.sent + x.failed), 1)
                  const h = Math.round(((d.sent + d.failed) / max) * 100)
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.date}: ${d.sent} sent, ${d.failed} failed`}>
                      <div className="w-full rounded-sm bg-primary/40" style={{ height: `${h}%`, minHeight: h > 0 ? 2 : 0 }} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── DOMAINS ─── */
function DomainsView({ domain }: { domain: string | null }) {
  const [dnsCheck, setDnsCheck] = useState<DnsCheck | null>(null)
  const [blacklist, setBlacklist] = useState<BlacklistResult | null>(null)
  const [dnsLoading, setDnsLoading] = useState(false)
  const [blLoading, setBlLoading] = useState(false)

  const runChecks = useCallback(async () => {
    if (!domain) return
    setDnsLoading(true)
    setBlLoading(true)

    fetch(`/api/deliverability/dns?domain=${domain}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setDnsCheck(data) })
      .finally(() => setDnsLoading(false))

    fetch(`/api/deliverability/blacklist?domain=${domain}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setBlacklist(data) })
      .finally(() => setBlLoading(false))
  }, [domain])

  useEffect(() => { runChecks() }, [runChecks])

  const passCount = dnsCheck ? [dnsCheck.spf, dnsCheck.dkim, dnsCheck.dmarc].filter(r => r.pass).length : 0
  const authScore = dnsCheck ? Math.round((passCount / 3) * 100) : null

  return (
    <div className="space-y-4">
      {!domain ? (
        <div className="border border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          Connect a Gmail mailbox in Settings → Integrations to run domain checks.
        </div>
      ) : (
        <>
          {/* DNS Auth */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <p className="text-sm font-semibold">DNS Authentication — {domain}</p>
              </div>
              <div className="flex items-center gap-2">
                {authScore !== null && (
                  <Badge variant={authScore === 100 ? "secondary" : "destructive"} className="text-xs">
                    {passCount}/3 passing
                  </Badge>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={runChecks} disabled={dnsLoading}>
                  <RefreshCw className={`h-3.5 w-3.5 ${dnsLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            <div className="space-y-3 divide-y divide-border">
              <DnsRow label="SPF" result={dnsCheck?.spf} loading={dnsLoading} />
              <div className="pt-3"><DnsRow label="DKIM" result={dnsCheck?.dkim} loading={dnsLoading} /></div>
              <div className="pt-3"><DnsRow label="DMARC" result={dnsCheck?.dmarc} loading={dnsLoading} /></div>
            </div>
          </div>

          {/* Blacklist */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                <p className="text-sm font-semibold">Blacklist Status</p>
              </div>
              {blacklist && (
                <Badge variant={blacklist.isClean ? "secondary" : "destructive"} className="text-xs">
                  {blacklist.isClean ? `Clean (${blacklist.totalChecked} lists checked)` : `Listed on ${blacklist.listed.length} list${blacklist.listed.length > 1 ? "s" : ""}`}
                </Badge>
              )}
            </div>

            {blLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking {5} blacklists...
              </div>
            ) : blacklist ? (
              <div className="grid grid-cols-2 gap-1.5">
                {[...blacklist.clean.map(n => ({ name: n, listed: false })), ...blacklist.listed.map(n => ({ name: n, listed: true }))].map(bl => (
                  <div key={bl.name} className="flex items-center gap-1.5 text-xs">
                    {bl.listed
                      ? <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      : <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                    <span className={bl.listed ? "text-red-500" : "text-muted-foreground"}>{bl.name}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {blacklist && !blacklist.isClean && (
              <p className="text-xs text-amber-500">
                You're listed on {blacklist.listed.join(", ")}. Submit a delisting request directly on each provider's website.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── MAILBOXES ─── */
function MailboxesView({ gmailStatus, onLinkMailbox }: { gmailStatus: GmailStatus | null; onLinkMailbox: () => void }) {
  const mailbox = gmailStatus?.integration

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Connected Mailboxes</span>
          </div>
          <Button size="sm" className="h-7 text-xs" onClick={onLinkMailbox}>
            {mailbox ? "Reconnect" : "Link Mailbox"}
          </Button>
        </div>

        {mailbox ? (
          <div className="px-4 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center shrink-0">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{mailbox.email}</p>
              <p className="text-xs text-muted-foreground">Connected {new Date(mailbox.connectedAt).toLocaleDateString()}</p>
            </div>
            <Badge variant={mailbox.isActive && mailbox.tokenValid ? "secondary" : "destructive"} className="text-xs">
              {mailbox.isActive && mailbox.tokenValid ? "Active" : "Reconnect required"}
            </Badge>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No mailbox connected. Link your Gmail to start sending.
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── MAIN ─── */
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

  useEffect(() => { fetchGmailStatus() }, [fetchGmailStatus])

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
        setTimeout(() => { setIsConnecting(false); window.removeEventListener("focus", handleFocus) }, 5 * 60 * 1000)
      }
    } catch {
      toast.error("Failed to initiate mailbox connection")
      setIsConnecting(false)
    }
  }

  const domain = gmailStatus?.integration?.email?.split("@")[1] ?? null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Deliverability Suite</h2>
        {isConnecting && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Connecting...
          </div>
        )}
      </div>

      {tab === "overview" && <OverviewView domain={domain} />}
      {tab === "domains" && <DomainsView domain={domain} />}
      {tab === "mailboxes" && <MailboxesView gmailStatus={gmailStatus} onLinkMailbox={handleLinkMailbox} />}
    </div>
  )
}
