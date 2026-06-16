'use client'

import { useState, useEffect, useCallback, ElementType, useRef } from 'react'
import { useSessionState } from '@/hooks/use-session-state'
import { formatDistanceToNow } from 'date-fns'
import { Globe, Linkedin, Plus, Upload, X, Trash2, Search, MoreHorizontal, FolderInput, Users, Phone, Mail, Sparkles, RefreshCw, UserPlus, Check, SlidersHorizontal, Settings2, RotateCcw, MapPin, Building2, Briefcase } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { UploadAccountsDialog } from '@/components/upload-accounts-dialog'
import { AddAccountDialog } from '@/components/add-account-dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AccountStatusBoxes } from '@/components/account-status-boxes'

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
}

// ── Custom checkbox ────────────────────────────────────────────────────────────

function Cb({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'w-[15px] h-[15px] rounded-[3px] border transition-colors shrink-0 flex items-center justify-center',
        checked
          ? 'bg-[hsl(100,78%,44%)] border-[hsl(100,78%,44%)]'
          : 'border-border bg-transparent hover:border-muted-foreground/60'
      )}
    >
      {checked && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
    </button>
  )
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-cyan-600', 'bg-emerald-600',
  'bg-amber-500', 'bg-rose-500', 'bg-violet-600', 'bg-pink-600',
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function AccountAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'lg' }) {
  const initials = name.trim().slice(0, 2).toUpperCase()
  const cls = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-6 h-6 text-[11px]'
  return (
    <div className={cn('rounded-md flex items-center justify-center font-semibold text-white shrink-0', getAvatarColor(name), cls)}>
      {initials}
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    new_lead:    'bg-secondary text-muted-foreground',
    contacted:   'bg-blue-500/10 text-blue-400',
    in_sequence: 'bg-yellow-500/10 text-yellow-400',
    qualified:   'bg-accent/10 text-accent',
    customer:    'bg-purple-500/10 text-purple-400',
    churned:     'bg-red-500/10 text-red-400',
  }
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', colorMap[status] ?? 'bg-secondary text-muted-foreground')}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

type ActivityItem = {
  id: string
  type: 'call' | 'email' | 'linkedin'
  contactName: string | null
  detail: string
  time: string
  outcome?: string | null
  duration?: number | null
  recordingUrl?: string | null
  emailStatus?: string | null
  subject?: string | null
  sdrName?: string | null
  notes?: string | null
}

type Contact = {
  id: string
  name: string
  email: string | null
  title: string | null
  phone: string | null
  linkedin: string | null
  status: string
}

type POVData = {
  whatTheyDo?: string
  specificIndustry?: string
  exampleUseCase?: string
  companyIntel?: string
  [key: string]: any
}

// ── Detail panel ───────────────────────────────────────────────────────────────

function AccountDetail({
  account,
  onClose,
  onDelete,
  onStatusChange,
}: {
  account: Account
  onClose: () => void
  onDelete: (a: Account) => void
  onStatusChange: (id: string, status: string) => void
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'overview' | 'activity' | 'contacts'>('overview')
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pov, setPov] = useState<POVData | null>(null)
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingPov, setLoadingPov] = useState(false)

  useEffect(() => {
    setActivity([]); setContacts([]); setPov(null)

    setLoadingActivity(true)
    fetch(`/api/accounts/${account.id}/activity`)
      .then((r) => r.json()).then((d) => setActivity(d.activity || [])).catch(() => {})
      .finally(() => setLoadingActivity(false))

    setLoadingContacts(true)
    fetch(`/api/accounts/${account.id}/contacts`)
      .then((r) => r.json()).then((d) => setContacts(d.contacts || [])).catch(() => {})
      .finally(() => setLoadingContacts(false))

    setLoadingPov(true)
    fetch(`/api/accounts/${account.id}/pov`)
      .then((r) => r.ok ? r.json() : null).then((d) => d && setPov(d.pov)).catch(() => {})
      .finally(() => setLoadingPov(false))
  }, [account.id])

  const OUTCOME_LABELS: Record<string, string> = {
    connected: 'Connected', connected_intro_booked: 'Intro Booked',
    connected_referral: 'Referral', connected_not_interested: 'Not Interested',
    connected_info_gathered: 'Info Gathered', callback: 'Call Back Later',
    voicemail: 'Voicemail', no_answer: 'No Answer', busy: 'Busy',
    failed: 'Failed', gatekeeper: 'Gatekeeper',
  }

  const formatDur = (secs?: number | null) => {
    if (!secs) return null
    const m = Math.floor(secs / 60), s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const detailRows = [
    { label: 'Industry',    value: account.industry || '—' },
    { label: 'Location',    value: account.location || '—' },
    { label: 'Employees',   value: account.employees?.toLocaleString() || '—' },
    { label: 'Website',     value: account.website
        ? <a href={account.website.startsWith('http') ? account.website : `https://${account.website}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{account.website}</a>
        : '—' },
    { label: 'Status',      value: <StatusBadge status={account.status} /> },
    { label: 'Sequence',    value: account.sequence || '—' },
    { label: 'Step',        value: account.sequenceStep || '—' },
    { label: 'Contacts',    value: String(account.contacts ?? 0) },
    { label: 'Last activity', value: account.lastActivity ? formatDistanceToNow(new Date(account.lastActivity), { addSuffix: true }) : '—' },
  ]

  const handleMultithread = () => {
    const params = new URLSearchParams({ company: account.name, seniorityLevels: JSON.stringify(['VP', 'Director', 'Manager']), autoSearch: 'true' })
    router.push(`/prospecting/outbound?tab=leads&${params.toString()}`)
  }

  return (
    <div className="flex flex-col h-full border-l border-border">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <AccountAvatar name={account.name} size="lg" />
          <div>
            <h2 className="text-[14px] font-semibold leading-tight">{account.name}</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {[account.industry, account.location].filter(Boolean).join(' · ') || 'No details'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
        {account.website && (
          <Button size="sm" variant="outline" className="h-7 px-3 text-[12px] gap-1.5" onClick={() => window.open(account.website!.startsWith('http') ? account.website! : `https://${account.website}`, '_blank')}>
            <Globe className="h-3.5 w-3.5" /> Website
          </Button>
        )}
        {account.linkedin && (
          <Button size="sm" variant="outline" className="h-7 px-3 text-[12px] gap-1.5" onClick={() => window.open(account.linkedin!, '_blank')}>
            <Linkedin className="h-3.5 w-3.5" /> LinkedIn
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 px-3 text-[12px] gap-1.5" onClick={handleMultithread}>
          <UserPlus className="h-3.5 w-3.5" /> Multithread
        </Button>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange(account.id, 'qualified')}>
                <FolderInput className="h-4 w-4 mr-2" /> Mark as Qualified
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(account.id, 'customer')}>
                <FolderInput className="h-4 w-4 mr-2" /> Mark as Customer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(account)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-5 border-b border-border shrink-0">
        {(['overview', 'activity', 'contacts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'mr-5 py-2.5 text-[12px] font-medium capitalize border-b-2 -mb-px transition-colors',
              tab === t ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t}{t === 'activity' && activity.length > 0 ? ` (${activity.length})` : ''}
            {t === 'contacts' && contacts.length > 0 ? ` (${contacts.length})` : ''}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {tab === 'overview' && (
          <>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2.5">Details</p>
              <div className="rounded-lg border border-border overflow-hidden">
                {detailRows.map(({ label, value }) => (
                  <div key={label} className="flex items-center px-3 py-2 border-b border-border last:border-0">
                    <span className="text-[12px] text-muted-foreground w-28 shrink-0">{label}</span>
                    <span className="text-[12px] text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* POV */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Point of View</p>
                <button
                  onClick={() => {
                    setLoadingPov(true)
                    fetch(`/api/accounts/${account.id}/pov?force=true`)
                      .then((r) => r.ok ? r.json() : null).then((d) => d && setPov(d.pov)).catch(() => {})
                      .finally(() => setLoadingPov(false))
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <RefreshCw className={cn('h-3 w-3', loadingPov && 'animate-spin')} />
                  {pov ? 'Refresh' : 'Generate'}
                </button>
              </div>
              {loadingPov ? (
                <p className="text-[12px] text-muted-foreground">Generating...</p>
              ) : pov ? (
                <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                  {pov.whatTheyDo && <div><p className="text-[11px] font-medium text-muted-foreground mb-0.5">What They Do</p><p className="text-[12px] text-foreground leading-relaxed">{pov.whatTheyDo}</p></div>}
                  {pov.specificIndustry && <div><p className="text-[11px] font-medium text-muted-foreground mb-0.5">Industry</p><p className="text-[12px] text-foreground">{pov.specificIndustry}</p></div>}
                  {pov.exampleUseCase && <div><p className="text-[11px] font-medium text-muted-foreground mb-0.5">Example Use Case</p><p className="text-[12px] text-foreground leading-relaxed">{pov.exampleUseCase}</p></div>}
                  {!pov.whatTheyDo && pov.companyIntel && <div><p className="text-[11px] font-medium text-muted-foreground mb-0.5">Company Intel</p><p className="text-[12px] text-foreground leading-relaxed">{pov.companyIntel}</p></div>}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <Sparkles className="h-5 w-5 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-[12px] text-muted-foreground mb-2">Generate an AI-powered briefing for {account.name}</p>
                  <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={() => {
                    setLoadingPov(true)
                    fetch(`/api/accounts/${account.id}/pov`)
                      .then((r) => r.ok ? r.json() : null).then((d) => d && setPov(d.pov)).catch(() => {})
                      .finally(() => setLoadingPov(false))
                  }}>
                    <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'activity' && (
          <>
            {loadingActivity ? (
              <p className="text-[12px] text-muted-foreground py-6 text-center">Loading...</p>
            ) : activity.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Phone className="h-7 w-7 text-muted-foreground/20" />
                <p className="text-[12px] text-muted-foreground">No activity recorded yet</p>
              </div>
            ) : (
              <div className="space-y-0 rounded-lg border border-border overflow-hidden">
                {activity.map((item) => {
                  const isCall = item.type === 'call'
                  const isEmail = item.type === 'email'
                  const isLinkedIn = item.type === 'linkedin'
                  const isPositive = item.outcome?.startsWith('connected')
                  const isVM = item.outcome === 'voicemail'
                  const outcomeLabel = item.outcome ? (OUTCOME_LABELS[item.outcome] ?? item.outcome.replace(/_/g, ' ')) : ''
                  const dur = formatDur(item.duration)
                  return (
                    <div key={item.id} className="flex flex-col gap-1.5 px-3 py-2.5 border-b border-border last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isCall && <Phone className={cn('h-3.5 w-3.5 shrink-0', isPositive ? 'text-accent' : isVM ? 'text-yellow-400' : 'text-muted-foreground')} />}
                          {isEmail && <Mail className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
                          {isLinkedIn && <Linkedin className="h-3.5 w-3.5 shrink-0 text-[#0A66C2]" />}
                          <span className="text-[12px] font-medium text-foreground truncate max-w-[200px]">{item.detail}</span>
                          {dur && <span className="text-[11px] text-muted-foreground shrink-0">{dur}</span>}
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                          {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                        </span>
                      </div>
                      {item.contactName && (
                        <p className="text-[11px] text-muted-foreground pl-5">{item.contactName}</p>
                      )}
                      {isCall && item.sdrName && (
                      <p className="text-[11px] text-muted-foreground pl-5">
                        <span className="text-foreground/50">SDR</span> {item.sdrName}
                      </p>
                    )}
                    {isCall && item.notes && (
                      <p className="text-[12px] text-foreground/70 leading-relaxed pl-5">{item.notes}</p>
                    )}
                    {isCall && item.recordingUrl && (
                        <div className="pl-5">
                          <audio controls className="h-7 w-full" src={`/api/calls/${item.id}/recording`} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {tab === 'contacts' && (
          <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Contacts</p>
              <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={handleMultithread}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Find More
              </Button>
            </div>
            {loadingContacts ? (
              <p className="text-[12px] text-muted-foreground py-4 text-center">Loading...</p>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Users className="h-7 w-7 text-muted-foreground/20" />
                <p className="text-[12px] text-muted-foreground">No contacts linked yet</p>
              </div>
            ) : (
              <div className="space-y-0 rounded-lg border border-border overflow-hidden">
                {contacts.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0', getAvatarColor(c.name))}>
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{c.title || c.email || '—'}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.email && <a href={`mailto:${c.email}`} className="p-1 text-muted-foreground hover:text-foreground"><Mail className="h-3.5 w-3.5" /></a>}
                      {c.phone && <a href={`tel:${c.phone}`} className="p-1 text-muted-foreground hover:text-foreground"><Phone className="h-3.5 w-3.5" /></a>}
                      {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="p-1 text-muted-foreground hover:text-foreground"><Linkedin className="h-3.5 w-3.5" /></a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Column definitions ─────────────────────────────────────────────────────────

type ColDef = { key: string; label: string }

const ACCOUNT_COLS: ColDef[] = [
  { key: 'contacts',    label: 'Contacts' },
  { key: 'location',   label: 'HQ Location' },
  { key: 'industry',   label: 'Industry' },
  { key: 'employees',  label: 'Headcount' },
  { key: 'status',     label: 'Status' },
  { key: 'lastActivity', label: 'Last Activity' },
  { key: 'sequence',   label: 'Sequence' },
]

const DEFAULT_ACCOUNT_COLS = new Set(['industry', 'location', 'employees', 'status', 'lastActivity'])

// ── Filter row ─────────────────────────────────────────────────────────────────

function FilterRow({ icon: Icon, label, value, onSet, onClear }: {
  icon: ElementType
  label: string
  value: string
  onSet: (v: string) => void
  onClear: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [inputVal, setInputVal] = useState('')

  if (value) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-accent/10 group">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-[12px] flex-1 truncate">
          <span className="text-muted-foreground">{label}: </span>
          <span className="font-medium">{value}</span>
        </span>
        <button onClick={onClear} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity">
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  if (adding) {
    return (
      <div className="flex items-center gap-2 px-2 py-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          autoFocus
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && inputVal.trim()) { onSet(inputVal.trim()); setAdding(false); setInputVal('') }
            if (e.key === 'Escape') { setAdding(false); setInputVal('') }
          }}
          onBlur={() => { if (inputVal.trim()) onSet(inputVal.trim()); setAdding(false); setInputVal('') }}
          className="text-[12px] flex-1 bg-transparent border-b border-accent outline-none text-foreground placeholder:text-muted-foreground/50"
          placeholder={`Filter by ${label.toLowerCase()}…`}
        />
        <button onClick={() => { setAdding(false); setInputVal('') }} className="text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setAdding(true)}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-foreground/80 hover:bg-muted/50 transition-colors"
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-[13px] flex-1 text-left">{label}</span>
      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  )
}

// ── Column settings dialog ──────────────────────────────────────────────────────

function AccountColumnSettings({ open, onOpenChange, visibleColumns, onSave }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  visibleColumns: Set<string>
  onSave: (cols: Set<string>) => void
}) {
  const [draft, setDraft] = useState<Set<string>>(new Set(visibleColumns))

  useEffect(() => { if (open) setDraft(new Set(visibleColumns)) }, [open, visibleColumns])

  const toggle = (key: string) =>
    setDraft((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })

  const orderedVisible = ACCOUNT_COLS.filter((c) => draft.has(c.key))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <DialogTitle>Company Column Settings</DialogTitle>
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">Select the columns you want to see.</p>
        </DialogHeader>

        <div className="flex gap-8 pt-2">
          {/* Left: checkboxes */}
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Columns</p>
            <div className="space-y-2.5">
              {ACCOUNT_COLS.map((col) => (
                <label key={col.key} className="flex items-center gap-2.5 cursor-pointer">
                  <Cb checked={draft.has(col.key)} onChange={() => toggle(col.key)} />
                  <span className="text-[13px]">{col.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Right: ordered list */}
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Column Order</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
                <span className="text-[12px] text-muted-foreground w-4 shrink-0">1</span>
                <span className="text-[13px] text-muted-foreground flex-1">Company</span>
              </div>
              {orderedVisible.map((col, i) => (
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
          <Button variant="ghost" size="sm" onClick={() => setDraft(new Set(DEFAULT_ACCOUNT_COLS))} className="mr-auto gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={() => { onSave(draft); onOpenChange(false) }}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Table header cell ──────────────────────────────────────────────────────────

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border whitespace-nowrap', className)}>
      {children}
    </th>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { toast } = useToast()

  const [accounts, setAccounts] = useSessionState<Account[]>('accounts-data', [])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useSessionState<number>('accounts-total', 0)
  const [page, setPage] = useState(1)
  const pageSize = 50
  const hasCachedAccounts = useRef(false)

  const [searchTerm, setSearchTerm] = useSessionState('accounts-search', '')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [showFilters, setShowFilters] = useSessionState('accounts-show-filters', false)
  const [filters, setFilters] = useSessionState('accounts-filters', { name: '', location: '', industry: '', employees: '', status: '' })
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(DEFAULT_ACCOUNT_COLS))

  hasCachedAccounts.current = accounts.length > 0

  const loadAccounts = useCallback(async (loadPage = 1, append = false) => {
    try {
      if (!append && !hasCachedAccounts.current) setLoading(true)
      const params = new URLSearchParams({ page: String(loadPage), pageSize: String(pageSize) })
      const res = await fetch(`/api/accounts?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (append) {
        setAccounts((prev) => [...prev, ...data.accounts])
      } else {
        setAccounts(data.accounts)
      }
      setTotalCount(data.totalCount || 0)
      setPage(loadPage)
    } catch {
      toast({ title: 'Error', description: 'Failed to load accounts', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  const filteredAccounts = accounts.filter((a) => {
    const q = searchTerm.toLowerCase()
    if (q && !((a.name?.toLowerCase() ?? '').includes(q) || (a.industry?.toLowerCase() ?? '').includes(q) || (a.location?.toLowerCase() ?? '').includes(q))) return false
    if (filters.name && !(a.name?.toLowerCase() ?? '').includes(filters.name.toLowerCase())) return false
    if (filters.location && !(a.location?.toLowerCase() ?? '').includes(filters.location.toLowerCase())) return false
    if (filters.industry && !(a.industry?.toLowerCase() ?? '').includes(filters.industry.toLowerCase())) return false
    if (filters.employees && !String(a.employees ?? '').includes(filters.employees)) return false
    if (filters.status && a.status !== filters.status) return false
    return true
  })
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const toggleRow = (id: string) =>
    setSelectedRows((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id])

  const toggleAll = () =>
    setSelectedRows((prev) => prev.length === filteredAccounts.length ? [] : filteredAccounts.map((a) => a.id))

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      const res = await fetch(`/api/accounts/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Deleted', description: `${deleteTarget.name} deleted` })
      if (selectedAccount?.id === deleteTarget.id) setSelectedAccount(null)
      setAccounts((prev) => prev.filter((a) => a.id !== deleteTarget.id))
    } catch {
      toast({ title: 'Error', description: 'Failed to delete account', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }

  const handleStatusChange = async (accountId: string, status: string) => {
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Status updated' })
      setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, status } : a))
      if (selectedAccount?.id === accountId) setSelectedAccount((prev) => prev ? { ...prev, status } : prev)
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
    }
  }

  const compact = !!selectedAccount

  return (
    <>
      <div className="-m-5 flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>

        {/* Stats row */}
        <div className="px-5 pt-4 shrink-0">
          <AccountStatusBoxes />
        </div>

        <div className="flex flex-1 overflow-hidden mt-4">

          {/* ── Filter sidebar ──────────────────────────────────────────── */}
          {showFilters && !compact && (
            <div className="w-60 shrink-0 border-r border-border flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
                <span className="text-[12px] text-muted-foreground">{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied.</span>
                <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2 px-1">Company Filters</p>
                  <div className="space-y-0.5">
                    <FilterRow icon={Building2} label="Business Name" value={filters.name} onSet={(v) => setFilters((f) => ({ ...f, name: v }))} onClear={() => setFilters((f) => ({ ...f, name: '' }))} />
                    <FilterRow icon={MapPin} label="HQ Location" value={filters.location} onSet={(v) => setFilters((f) => ({ ...f, location: v }))} onClear={() => setFilters((f) => ({ ...f, location: '' }))} />
                    <FilterRow icon={Briefcase} label="Industry" value={filters.industry} onSet={(v) => setFilters((f) => ({ ...f, industry: v }))} onClear={() => setFilters((f) => ({ ...f, industry: '' }))} />
                    <FilterRow icon={Users} label="Headcount" value={filters.employees} onSet={(v) => setFilters((f) => ({ ...f, employees: v }))} onClear={() => setFilters((f) => ({ ...f, employees: '' }))} />
                    <FilterRow icon={FolderInput} label="Status" value={filters.status} onSet={(v) => setFilters((f) => ({ ...f, status: v }))} onClear={() => setFilters((f) => ({ ...f, status: '' }))} />
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setFilters({ name: '', location: '', industry: '', employees: '', status: '' })}
                    className="w-full text-[12px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" /> Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Table panel ─────────────────────────────────────────────── */}
          <div className={cn('flex flex-col overflow-hidden transition-all duration-200', compact ? 'w-[400px] shrink-0' : 'flex-1')}>

            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-[13px]"
                />
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                {!compact && (
                  <>
                    <Button
                      size="sm"
                      variant={showFilters ? 'secondary' : 'outline'}
                      onClick={() => setShowFilters((v) => !v)}
                      className="h-8 text-[12px] gap-1.5"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Filters
                      {activeFilterCount > 0 && (
                        <span className="bg-accent text-white rounded-full text-[10px] px-1.5 py-0 leading-5 font-medium">{activeFilterCount}</span>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setColumnSettingsOpen(true)}
                      className="h-8 text-[12px] gap-1.5"
                    >
                      <Settings2 className="h-3.5 w-3.5" /> Columns
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => setUploadDialogOpen(true)} className="h-8 text-[12px]">
                  <Upload className="h-3.5 w-3.5 mr-1" /> Upload CSV
                </Button>
                <Button size="sm" onClick={() => setAddDialogOpen(true)} className="h-8 text-[12px]">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Account
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-background z-10">
                  <tr>
                    <th className="px-4 py-2.5 border-b border-border w-10">
                      <Cb
                        checked={selectedRows.length === filteredAccounts.length && filteredAccounts.length > 0}
                        onChange={toggleAll}
                      />
                    </th>
                    <Th>Account</Th>
                    {!compact && visibleColumns.has('contacts') && <Th>Contacts</Th>}
                    {!compact && visibleColumns.has('industry') && <Th>Industry</Th>}
                    {!compact && visibleColumns.has('location') && <Th>HQ Location</Th>}
                    {!compact && visibleColumns.has('employees') && <Th>Headcount</Th>}
                    {!compact && visibleColumns.has('status') && <Th>Status</Th>}
                    {!compact && visibleColumns.has('lastActivity') && <Th>Last Activity</Th>}
                    {!compact && visibleColumns.has('sequence') && <Th>Sequence</Th>}
                    <Th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={compact ? 3 : 8} className="text-center py-12 text-[13px] text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={compact ? 3 : 8} className="text-center py-12">
                        <p className="text-[13px] text-muted-foreground mb-3">No accounts found</p>
                        <div className="flex items-center justify-center gap-2">
                          {searchTerm.trim() && (
                            <Button size="sm" variant="outline" onClick={() => router.push(`/prospecting/outbound?tab=accounts&keyword=${encodeURIComponent(searchTerm.trim())}&autoSearch=true`)} className="text-[12px] h-8">
                              <Search className="h-3.5 w-3.5 mr-1" /> Find account
                            </Button>
                          )}
                          <Button size="sm" onClick={() => setAddDialogOpen(true)} className="text-[12px] h-8">
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add account manually
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((a) => {
                      const isSelected = selectedAccount?.id === a.id
                      const isChecked = selectedRows.includes(a.id)

                      return (
                        <tr
                          key={a.id}
                          onClick={() => setSelectedAccount(isSelected ? null : a)}
                          className={cn(
                            'border-b border-border/60 cursor-pointer transition-colors group',
                            isSelected ? 'bg-accent/5' : 'hover:bg-muted/30'
                          )}
                        >
                          {/* Checkbox */}
                          <td className="px-4 py-2.5 w-10" onClick={(e) => e.stopPropagation()}>
                            <Cb checked={isChecked} onChange={() => toggleRow(a.id)} />
                          </td>

                          {/* Account */}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <AccountAvatar name={a.name} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[13px] font-medium text-foreground whitespace-nowrap">{a.name}</span>
                                  {a.linkedin && (
                                    <a href={a.linkedin} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                      <Linkedin className="h-3.5 w-3.5 text-[#0A66C2] opacity-70 hover:opacity-100" />
                                    </a>
                                  )}
                                </div>
                                {a.website && !compact && (
                                  <a
                                    href={a.website.startsWith('http') ? a.website : `https://${a.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[11px] text-muted-foreground hover:text-accent truncate block max-w-[160px]"
                                  >
                                    {a.website}
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>

                          {!compact && visibleColumns.has('contacts') && <td className="px-4 py-2.5 text-[13px] text-foreground/70 whitespace-nowrap">{a.contacts ?? '—'}</td>}
                          {!compact && visibleColumns.has('industry') && <td className="px-4 py-2.5 text-[13px] text-foreground/70 whitespace-nowrap">{a.industry || '—'}</td>}
                          {!compact && visibleColumns.has('location') && <td className="px-4 py-2.5 text-[13px] text-foreground/70 whitespace-nowrap">{a.location || '—'}</td>}
                          {!compact && visibleColumns.has('employees') && <td className="px-4 py-2.5 text-[13px] text-foreground/70 whitespace-nowrap">{a.employees?.toLocaleString() || '—'}</td>}
                          {!compact && visibleColumns.has('status') && <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>}
                          {!compact && visibleColumns.has('lastActivity') && <td className="px-4 py-2.5 text-[13px] text-muted-foreground whitespace-nowrap">{a.lastActivity ? formatDistanceToNow(new Date(a.lastActivity), { addSuffix: true }) : '—'}</td>}
                          {!compact && visibleColumns.has('sequence') && <td className="px-4 py-2.5 text-[13px] text-foreground/70 whitespace-nowrap">{a.sequence || '—'}</td>}

                          {/* Row actions */}
                          <td className="px-2 py-2.5 w-10" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleStatusChange(a.id, 'qualified')}>
                                  <FolderInput className="h-4 w-4 mr-2" /> Mark as Qualified
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(a.id, 'customer')}>
                                  <FolderInput className="h-4 w-4 mr-2" /> Mark as Customer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setDeleteTarget(a); setDeleteDialogOpen(true) }} className="text-destructive focus:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>

              {/* Load more */}
              {accounts.length < totalCount && (
                <div className="flex justify-center py-4 border-t border-border">
                  <button
                    onClick={() => loadAccounts(page + 1, true)}
                    className="text-[12px] text-muted-foreground hover:text-foreground underline"
                  >
                    Load more ({accounts.length} of {totalCount})
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Detail panel ────────────────────────────────────────────── */}
          {selectedAccount && (
            <div className="flex-1 overflow-hidden">
              <AccountDetail
                account={selectedAccount}
                onClose={() => setSelectedAccount(null)}
                onDelete={(a) => { setDeleteTarget(a); setDeleteDialogOpen(true) }}
                onStatusChange={handleStatusChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <UploadAccountsDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} onUploadComplete={loadAccounts} />
      <AddAccountDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onAccountAdded={loadAccounts} />
      <AccountColumnSettings
        open={columnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
        visibleColumns={visibleColumns}
        onSave={setVisibleColumns}
      />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
