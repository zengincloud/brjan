"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow, format } from "date-fns"
import {
  Search, SlidersHorizontal, Settings2, ChevronDown, Mail, Globe,
  AlertTriangle, CheckCircle2, TrendingUp, Plus, Pencil, Trash2,
  MoreHorizontal, ExternalLink, Eye, MousePointerClick, Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmailTemplateManager } from "@/components/email-template-manager"

// ── Types ──────────────────────────────────────────────────────────────────────

type Email = {
  id: string
  to: string
  from?: string | null
  subject?: string | null
  status: string
  sentAt?: string | null
  openedAt?: string | null
  clickedAt?: string | null
  createdAt: string
  prospectId?: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusPill({ email }: { email: Email }) {
  if (email.clickedAt) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400">
      <MousePointerClick className="h-2.5 w-2.5" /> Clicked
    </span>
  )
  if (email.openedAt) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[hsl(100,78%,44%,0.12)] text-[hsl(100,78%,44%)]">
      <Eye className="h-2.5 w-2.5" /> Opened
    </span>
  )
  if (email.sentAt || email.status === 'sent') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground">
      <Send className="h-2.5 w-2.5" /> Sent
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground">
      Draft
    </span>
  )
}

// ── Domain health card (shown in empty state) ─────────────────────────────────

const DOMAIN_ROWS = [
  { domain: 'yourcompany.com', issues: 'SPF, DKIM, DMARC', health: 'fix', mailboxes: 2 },
  { domain: 'outreach.yourcompany.com', issues: 'Tracking subdomain', health: 'review', mailboxes: 3 },
  { domain: 'mail.yourcompany.com', issues: 'All checks passing', health: 'good', mailboxes: 1 },
]

function DomainHealthCard() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xl w-[520px] overflow-hidden">
      <div className="grid grid-cols-4 px-4 py-2 border-b border-border bg-muted/30">
        {['DOMAINS', 'AT RISK', 'HEALTH', 'MAILBOXES'].map(h => (
          <span key={h} className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">{h}</span>
        ))}
      </div>
      {DOMAIN_ROWS.map((row, i) => (
        <div key={i} className={cn('grid grid-cols-4 items-center px-4 py-3', i < DOMAIN_ROWS.length - 1 && 'border-b border-border/60')}>
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span className="text-[12px] text-foreground truncate">{row.domain}</span>
          </div>
          <span className="text-[12px] text-muted-foreground truncate pr-2">{row.issues}</span>
          <div>
            {row.health === 'fix' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400">
                <AlertTriangle className="h-2.5 w-2.5" /> Fix
              </span>
            )}
            {row.health === 'review' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-500/10 text-orange-400">
                <AlertTriangle className="h-2.5 w-2.5" /> Review
              </span>
            )}
            {row.health === 'good' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[hsl(100,78%,44%,0.12)] text-[hsl(100,78%,44%)]">
                <CheckCircle2 className="h-2.5 w-2.5" /> Good
              </span>
            )}
          </div>
          <span className="text-[12px] text-foreground">{row.mailboxes}</span>
        </div>
      ))}
    </div>
  )
}

// ── Email table ───────────────────────────────────────────────────────────────

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-4 py-2.5 text-left text-[11px] font-medium text-muted-foreground border-b border-border', className)}>
      {children}
    </th>
  )
}

function EmailTable({ emails, loading }: { emails: Email[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <BRLoader />
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-16">
        <DomainHealthCard />
        <div className="flex flex-col items-center gap-2 text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-1">
            <Mail className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-[15px] font-semibold text-foreground">No emails yet.</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Once you start sending emails, they&apos;ll appear here. Before you begin, make sure your domains are healthy so your messages reach the inbox.
          </p>
          <Button variant="outline" size="sm" className="mt-1 h-8 text-[12px] gap-1.5">
            <Globe className="h-3.5 w-3.5" /> View domains
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground/50 flex items-center gap-1.5 max-w-sm text-center">
          <TrendingUp className="h-3 w-3 shrink-0" />
          Healthy domains can deliver up to 2–3× more emails to prospects&apos; inboxes compared to domains with unresolved issues.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-background z-10">
          <tr>
            <Th>To</Th>
            <Th>Subject</Th>
            <Th>Status</Th>
            <Th>Sent</Th>
            <Th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <tr key={email.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
              <td className="px-4 py-2.5 text-[13px] text-foreground">{email.to}</td>
              <td className="px-4 py-2.5 text-[13px] text-muted-foreground truncate max-w-[280px]">{email.subject || '(no subject)'}</td>
              <td className="px-4 py-2.5"><StatusPill email={email} /></td>
              <td className="px-4 py-2.5 text-[12px] text-muted-foreground whitespace-nowrap">
                {email.sentAt ? format(new Date(email.sentAt), 'MMM d, h:mm a') : email.createdAt ? formatDistanceToNow(new Date(email.createdAt), { addSuffix: true }) : '—'}
              </td>
              <td className="px-4 py-2.5 w-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export function EmailerDashboard({ isTrialUser }: { isTrialUser?: boolean }) {
  const [tab, setTab] = useState<'all' | 'templates' | 'analytics'>('all')
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [inboxFilter, setInboxFilter] = useState('My inbox')

  useEffect(() => {
    if (tab !== 'all') return
    setLoading(true)
    fetch('/api/emails?pageSize=100')
      .then(r => r.json())
      .then(d => setEmails(d.emails || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab])

  const filtered = emails.filter(e =>
    !search ||
    e.to?.toLowerCase().includes(search.toLowerCase()) ||
    e.subject?.toLowerCase().includes(search.toLowerCase())
  )

  const TABS = [
    { id: 'all', label: 'All emails' },
    { id: 'templates', label: 'Templates' },
    { id: 'analytics', label: 'Analytics' },
  ] as const

  return (
    <div className="-m-5 flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <h1 className="text-[15px] font-semibold text-foreground">Emails</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[12px] gap-1.5">
            <Settings2 className="h-3.5 w-3.5" /> Manage mailboxes
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-[12px] gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Deliverability stats
          </Button>
        </div>
      </div>

      {/* Tab row */}
      <div className="flex items-end gap-0 px-6 border-b border-border shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2.5 text-[13px] border-b-2 transition-colors -mb-px',
              tab === t.id
                ? 'border-foreground text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      {tab === 'all' && (
        <div className="flex items-center gap-2 px-6 py-2 border-b border-border shrink-0">
          {/* Left: inbox picker + filters + search */}
          <button className="flex items-center gap-1 h-7 px-3 text-[12px] rounded-md border border-border hover:bg-muted/40 transition-colors text-foreground shrink-0">
            <Mail className="h-3 w-3 text-muted-foreground" />
            {inboxFilter}
            <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
          </button>

          <button className="flex items-center gap-1 h-7 px-3 text-[12px] rounded-md border border-border hover:bg-muted/40 transition-colors text-muted-foreground shrink-0">
            <SlidersHorizontal className="h-3 w-3" /> Show Filters
          </button>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emails"
              className="h-7 pl-8 text-[12px] bg-muted/20 border-border"
            />
          </div>

          {/* Right */}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-[12px]">
              Save as new view
            </Button>
            <button className="flex items-center gap-1 h-7 px-2.5 text-[12px] rounded-md border border-border hover:bg-muted/40 transition-colors text-muted-foreground">
              <Settings2 className="h-3.5 w-3.5" /> View options
            </button>
          </div>
        </div>
      )}

      {/* Trial gate */}
      {isTrialUser && (
        <div className="mx-6 mt-4 shrink-0 flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Email sending is not available on the trial plan.</p>
            <p className="text-xs text-yellow-400/70 mt-0.5">Upgrade to Starter or higher to send emails from your own inbox.</p>
          </div>
          <a href="/upgrade" className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-md border border-yellow-500/40 hover:bg-yellow-500/10 transition-colors">
            Upgrade
          </a>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'all' && <EmailTable emails={filtered} loading={loading} />}
        {tab === 'templates' && (
          <div className="flex-1 overflow-auto px-6 py-5">
            <EmailTemplateManager />
          </div>
        )}
        {tab === 'analytics' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-[13px] text-muted-foreground">Analytics coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
