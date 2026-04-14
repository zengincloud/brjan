'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Phone, Mail, Linkedin, Plus, Upload, X, Pencil, Trash2, Zap, Search, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useUser } from '@/hooks/use-user'
import { UploadProspectsDialog } from '@/components/upload-prospects-dialog'
import { AddProspectDialog } from '@/components/add-prospect-dialog'
import { EditProspectDialog } from '@/components/edit-prospect-dialog'
import { CallProspectDialog } from '@/components/call-prospect-dialog'
import { AddToSequenceDialog } from '@/components/add-to-sequence-dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { TrialLimitBanner } from '@/components/trial-limit-banner'
import { TRIAL_LIMITS } from '@/lib/trial-limits'
import { ProspectStatusBoxes } from '@/components/prospect-status-boxes'

type Prospect = {
  id: string
  name: string
  email: string
  title?: string | null
  company?: string | null
  phone?: string | null
  status: string
  linkedin?: string | null
  sequence?: string | null
  sequenceStep?: string | null
  lastActivity: string
  povData?: any
}

type SequenceOption = { id: string; name: string }

// ── Score ──────────────────────────────────────────────────────────────────────

function getScore(status: string): 'High' | 'Medium' | 'Low' {
  if (['qualified', 'meeting_scheduled'].includes(status)) return 'High'
  if (['contacted', 'in_sequence'].includes(status)) return 'Medium'
  return 'Low'
}

function ScoreCell({ status }: { status: string }) {
  const score = getScore(status)
  const bars = [
    { active: true },
    { active: score === 'Medium' || score === 'High' },
    { active: score === 'High' },
  ]
  const textColor =
    score === 'High' ? 'text-[hsl(100,78%,44%)]' :
    score === 'Medium' ? 'text-yellow-400' :
    'text-muted-foreground'

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-end gap-[3px]">
        {bars.map((bar, i) => (
          <div
            key={i}
            className={cn(
              'w-[3px] rounded-sm',
              bar.active
                ? score === 'High' ? 'bg-[hsl(100,78%,44%)]' : score === 'Medium' ? 'bg-yellow-400' : 'bg-muted-foreground/50'
                : 'bg-muted-foreground/20'
            )}
            style={{ height: `${8 + i * 4}px` }}
          />
        ))}
      </div>
      <span className={cn('text-[13px]', textColor)}>{score}</span>
    </div>
  )
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-cyan-600', 'bg-emerald-600',
  'bg-amber-500', 'bg-rose-500', 'bg-violet-600', 'bg-pink-600',
]

function getInitials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-6 h-6 text-[11px]'
  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold text-white shrink-0', getAvatarColor(name), cls)}>
      {getInitials(name)}
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    new_lead: 'bg-secondary text-muted-foreground',
    contacted: 'bg-blue-500/10 text-blue-400',
    in_sequence: 'bg-yellow-500/10 text-yellow-400',
    meeting_scheduled: 'bg-purple-500/10 text-purple-400',
    qualified: 'bg-accent/10 text-accent',
    unqualified: 'bg-red-500/10 text-red-400',
  }
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', colorMap[status] ?? 'bg-secondary text-muted-foreground')}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

type CallRecord = {
  id: string
  outcome?: string | null
  duration?: number | null
  recordingDuration?: number | null
  recordingUrl?: string | null
  notes?: string | null
  createdAt: string
  startedAt?: string | null
}

// ── Detail panel ───────────────────────────────────────────────────────────────

function ProspectDetail({
  prospect,
  onClose,
  onEdit,
  onCall,
  onDelete,
}: {
  prospect: Prospect
  onClose: () => void
  onEdit: (p: Prospect) => void
  onCall: (p: Prospect) => void
  onDelete: (p: Prospect) => void
}) {
  const [tab, setTab] = useState<'overview' | 'activity'>('overview')
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [loadingCalls, setLoadingCalls] = useState(false)

  useEffect(() => {
    setCalls([])
    setLoadingCalls(true)
    fetch(`/api/calls?prospectId=${prospect.id}&limit=20`)
      .then((r) => r.json())
      .then((d) => setCalls(d.calls || []))
      .catch(() => {})
      .finally(() => setLoadingCalls(false))
  }, [prospect.id])

  let povParsed: any = null
  try { povParsed = typeof prospect.povData === 'string' ? JSON.parse(prospect.povData) : prospect.povData } catch {}

  const detailRows = [
    { label: 'Email', value: prospect.email },
    { label: 'Phone', value: prospect.phone || '—' },
    { label: 'Company', value: prospect.company || '—' },
    { label: 'Title', value: prospect.title || '—' },
    { label: 'Status', value: <StatusBadge status={prospect.status} /> },
    { label: 'Sequence', value: prospect.sequence || '—' },
    { label: 'Step', value: prospect.sequenceStep || '—' },
    { label: 'Last activity', value: prospect.lastActivity ? formatDistanceToNow(new Date(prospect.lastActivity), { addSuffix: true }) : '—' },
  ]

  const OUTCOME_LABELS: Record<string, string> = {
    connected: 'Connected',
    connected_intro_booked: 'Intro Booked',
    connected_referral: 'Referral',
    connected_not_interested: 'Not Interested',
    connected_info_gathered: 'Info Gathered',
    callback: 'Call Back Later',
    voicemail: 'Voicemail',
    no_answer: 'No Answer',
    busy: 'Busy',
    failed: 'Failed',
    gatekeeper: 'Gatekeeper',
  }

  const formatDuration = (secs?: number | null) => {
    if (!secs) return null
    const m = Math.floor(secs / 60), s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full border-l border-border">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Avatar name={prospect.name} size="lg" />
          <div>
            <h2 className="text-[14px] font-semibold leading-tight">{prospect.name}</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {[prospect.title, prospect.company].filter(Boolean).join(' · ') || prospect.email}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
        <Button size="sm" variant="outline" onClick={() => onCall(prospect)} className="h-7 px-3 text-[12px] gap-1.5">
          <Phone className="h-3.5 w-3.5" /> Call
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-3 text-[12px] gap-1.5">
          <Mail className="h-3.5 w-3.5" /> Email
        </Button>
        {prospect.linkedin && (
          <Button size="sm" variant="outline" className="h-7 px-3 text-[12px] gap-1.5" onClick={() => window.open(prospect.linkedin!, '_blank')}>
            <Linkedin className="h-3.5 w-3.5" /> LinkedIn
          </Button>
        )}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(prospect)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(prospect)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-5 border-b border-border shrink-0">
        {(['overview', 'activity'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'mr-5 py-2.5 text-[12px] font-medium capitalize border-b-2 -mb-px transition-colors',
              tab === t ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t}{t === 'activity' && calls.length > 0 ? ` (${calls.length})` : ''}
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
                    <span className="text-[12px] text-muted-foreground w-24 shrink-0">{label}</span>
                    <span className="text-[12px] text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            {povParsed && Object.keys(povParsed).length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2.5">AI Research</p>
                <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                  {Object.entries(povParsed).map(([k, v]) => (
                    typeof v === 'string' ? (
                      <div key={k}>
                        <p className="text-[11px] font-medium text-muted-foreground capitalize mb-0.5">{k.replace(/_/g, ' ')}</p>
                        <p className="text-[12px] text-foreground leading-relaxed">{v}</p>
                      </div>
                    ) : null
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'activity' && (
          <>
            {loadingCalls ? (
              <p className="text-[12px] text-muted-foreground py-6 text-center">Loading...</p>
            ) : calls.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Phone className="h-7 w-7 text-muted-foreground/20" />
                <p className="text-[12px] text-muted-foreground">No calls recorded yet</p>
                <Button size="sm" variant="outline" onClick={() => onCall(prospect)} className="h-7 text-[12px] mt-1">
                  <Phone className="h-3.5 w-3.5 mr-1" /> Make a call
                </Button>
              </div>
            ) : (
              <div className="space-y-0 rounded-lg border border-border overflow-hidden">
                {calls.map((call) => {
                  const label = call.outcome ? (OUTCOME_LABELS[call.outcome] ?? call.outcome.replace(/_/g, ' ')) : 'Call'
                  const dur = formatDuration(call.recordingDuration || call.duration)
                  const isPositive = call.outcome?.startsWith('connected')
                  const isVM = call.outcome === 'voicemail'
                  return (
                    <div key={call.id} className="flex flex-col gap-1.5 px-3 py-2.5 border-b border-border last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className={cn('h-3.5 w-3.5 shrink-0', isPositive ? 'text-accent' : isVM ? 'text-yellow-400' : 'text-muted-foreground')} />
                          <span className={cn('text-[12px] font-medium', isPositive ? 'text-accent' : 'text-foreground')}>{label}</span>
                          {dur && <span className="text-[11px] text-muted-foreground">{dur}</span>}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(call.startedAt || call.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {call.notes && (
                        <p className="text-[12px] text-muted-foreground leading-relaxed pl-5">{call.notes}</p>
                      )}
                      {call.recordingUrl && (
                        <div className="pl-5">
                          <audio controls className="h-7 w-full" src={`/api/calls/${call.id}/recording`} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
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

export default function ProspectsPage() {
  const { toast } = useToast()
  const { user } = useUser()

  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 50

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [sequences, setSequences] = useState<SequenceOption[]>([])

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null)
  const [callDialogOpen, setCallDialogOpen] = useState(false)
  const [callingProspect, setCallingProspect] = useState<Prospect | null>(null)
  const [sequenceDialogOpen, setSequenceDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadProspects = useCallback(async (loadPage = 1, append = false) => {
    try {
      if (!append) setLoading(true)
      const params = new URLSearchParams({ page: String(loadPage), pageSize: String(pageSize) })
      const res = await fetch(`/api/prospects?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (append) {
        setProspects((prev) => [...prev, ...data.prospects])
      } else {
        setProspects(data.prospects)
      }
      setTotalCount(data.totalCount || 0)
      setPage(loadPage)
    } catch {
      toast({ title: 'Error', description: 'Failed to load prospects', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadSequences = useCallback(async () => {
    try {
      const res = await fetch('/api/sequences')
      if (res.ok) {
        const data = await res.json()
        setSequences((data.sequences || []).map((s: any) => ({ id: s.id, name: s.name })))
      }
    } catch {}
  }, [])

  useEffect(() => { loadProspects(); loadSequences() }, [loadProspects, loadSequences])

  const filteredProspects = prospects.filter((p) => {
    const q = searchTerm.toLowerCase()
    return !q || (p.name?.toLowerCase() ?? '').includes(q) || (p.company?.toLowerCase() ?? '').includes(q) || (p.email?.toLowerCase() ?? '').includes(q)
  })

  const toggleRow = (id: string) =>
    setSelectedRows((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id])

  const toggleAll = () =>
    setSelectedRows((prev) => prev.length === filteredProspects.length ? [] : filteredProspects.map((p) => p.id))

  const confirmDelete = (ids: string[], label: string) => {
    setDeleteTarget({ ids, label })
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      const results = await Promise.all(deleteTarget.ids.map((id) => fetch(`/api/prospects/${id}`, { method: 'DELETE' })))
      const failed = results.filter((r) => !r.ok).length
      if (failed > 0) {
        toast({ title: 'Error', description: `Failed to delete ${failed} prospect${failed > 1 ? 's' : ''}`, variant: 'destructive' })
      } else {
        toast({ title: 'Deleted', description: `${deleteTarget.ids.length === 1 ? deleteTarget.label : `${deleteTarget.ids.length} prospects`} deleted` })
        if (selectedProspect && deleteTarget.ids.includes(selectedProspect.id)) setSelectedProspect(null)
      }
      setSelectedRows((prev) => prev.filter((id) => !deleteTarget.ids.includes(id)))
      setProspects((prev) => prev.filter((p) => !deleteTarget.ids.includes(p.id)))
    } catch {
      toast({ title: 'Error', description: 'Failed to delete prospects', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }

  // When detail panel is open, only show Contact + Score + Company columns
  const compact = !!selectedProspect

  return (
    <>
      <div className="-m-5 flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>
        {/* Stats row */}
        <div className="px-5 pt-4 shrink-0">
          {user?.tier === 'trial' && (
            <div className="mb-3">
              <TrialLimitBanner current={totalCount} limit={TRIAL_LIMITS.prospects} resourceLabel="prospects" />
            </div>
          )}
          <ProspectStatusBoxes />
        </div>

        <div className="flex flex-1 overflow-hidden mt-4">

          {/* ── Table panel ───────────────────────────────────────────────── */}
          <div className={cn('flex flex-col overflow-hidden transition-all duration-200', compact ? 'w-[400px] shrink-0' : 'flex-1')}>

            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-[13px]"
                />
              </div>

              {selectedRows.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[12px]">{selectedRows.length} selected</Badge>
                  <Button size="sm" variant="outline" onClick={() => setSequenceDialogOpen(true)} className="h-8 text-[12px]">
                    <Zap className="h-3.5 w-3.5 mr-1" /> Sequence
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => confirmDelete(selectedRows, `${selectedRows.length} prospects`)} className="h-8 text-[12px] text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedRows([])} className="h-8 text-[12px]">Clear</Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 ml-auto">
                  <Button size="sm" variant="outline" onClick={() => setUploadDialogOpen(true)} className="h-8 text-[12px]">
                    <Upload className="h-3.5 w-3.5 mr-1" /> Upload CSV
                  </Button>
                  <Button size="sm" onClick={() => setAddDialogOpen(true)} className="h-8 text-[12px]">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Prospect
                  </Button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-background z-10">
                  <tr>
                    <th className="px-4 py-2.5 border-b border-border w-10">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === filteredProspects.length && filteredProspects.length > 0}
                        onChange={toggleAll}
                        className="h-3.5 w-3.5 rounded accent-[hsl(100,78%,44%)]"
                      />
                    </th>
                    <Th>Contact</Th>
                    <Th>Score</Th>
                    {!compact && <Th>Company</Th>}
                    {!compact && <Th>Email</Th>}
                    {!compact && <Th>Title</Th>}
                    {!compact && <Th>Status</Th>}
                    {!compact && <Th>Sequence</Th>}
                    {!compact && <Th>Last Activity</Th>}
                    <Th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={compact ? 4 : 10} className="text-center py-12 text-[13px] text-muted-foreground">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredProspects.length === 0 ? (
                    <tr>
                      <td colSpan={compact ? 4 : 10} className="text-center py-12">
                        <p className="text-[13px] text-muted-foreground mb-3">No prospects found</p>
                        <Button size="sm" onClick={() => setAddDialogOpen(true)} className="text-[12px] h-8">
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add prospect
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    filteredProspects.map((p) => {
                      const isSelected = selectedProspect?.id === p.id
                      const isChecked = selectedRows.includes(p.id)

                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedProspect(isSelected ? null : p)}
                          className={cn(
                            'border-b border-border/60 cursor-pointer transition-colors group',
                            isSelected ? 'bg-accent/5' : 'hover:bg-muted/30'
                          )}
                        >
                          {/* Checkbox */}
                          <td className="px-4 py-2.5 w-10" onClick={(e) => { e.stopPropagation(); toggleRow(p.id) }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleRow(p.id)}
                              className="h-3.5 w-3.5 rounded accent-[hsl(100,78%,44%)]"
                            />
                          </td>

                          {/* Contact */}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={p.name} />
                              <span className="text-[13px] font-medium text-foreground whitespace-nowrap">{p.name}</span>
                            </div>
                          </td>

                          {/* Score */}
                          <td className="px-4 py-2.5">
                            <ScoreCell status={p.status} />
                          </td>

                          {/* Full columns — hidden in compact mode */}
                          {!compact && (
                            <td className="px-4 py-2.5 text-[13px] text-foreground/80 whitespace-nowrap">
                              {p.company || '—'}
                            </td>
                          )}
                          {!compact && (
                            <td className="px-4 py-2.5 text-[13px] text-foreground/70 whitespace-nowrap">
                              {p.email}
                            </td>
                          )}
                          {!compact && (
                            <td className="px-4 py-2.5 text-[13px] text-foreground/70 whitespace-nowrap">
                              {p.title || '—'}
                            </td>
                          )}
                          {!compact && (
                            <td className="px-4 py-2.5">
                              <StatusBadge status={p.status} />
                            </td>
                          )}
                          {!compact && (
                            <td className="px-4 py-2.5 text-[13px] text-foreground/70 whitespace-nowrap max-w-[160px] truncate">
                              {p.sequence || '—'}
                            </td>
                          )}
                          {!compact && (
                            <td className="px-4 py-2.5 text-[13px] text-muted-foreground whitespace-nowrap">
                              {p.lastActivity ? formatDistanceToNow(new Date(p.lastActivity), { addSuffix: true }) : '—'}
                            </td>
                          )}

                          {/* Row actions */}
                          <td className="px-2 py-2.5 w-10" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setEditingProspect(p); setEditDialogOpen(true) }}>
                                  <Pencil className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setCallingProspect(p); setCallDialogOpen(true) }}>
                                  <Phone className="h-4 w-4 mr-2" /> Call
                                </DropdownMenuItem>
                                {p.linkedin && (
                                  <DropdownMenuItem onClick={() => window.open(p.linkedin!, '_blank')}>
                                    <Linkedin className="h-4 w-4 mr-2" /> LinkedIn
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => confirmDelete([p.id], p.name)} className="text-destructive focus:text-destructive">
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
              {prospects.length < totalCount && (
                <div className="flex justify-center py-4 border-t border-border">
                  <button
                    onClick={() => loadProspects(page + 1, true)}
                    className="text-[12px] text-muted-foreground hover:text-foreground underline"
                  >
                    Load more ({prospects.length} of {totalCount})
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Detail panel ──────────────────────────────────────────────── */}
          {selectedProspect && (
            <div className="flex-1 overflow-hidden">
              <ProspectDetail
                prospect={selectedProspect}
                onClose={() => setSelectedProspect(null)}
                onEdit={(p) => { setEditingProspect(p); setEditDialogOpen(true) }}
                onCall={(p) => { setCallingProspect(p); setCallDialogOpen(true) }}
                onDelete={(p) => confirmDelete([p.id], p.name)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <UploadProspectsDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} onUploadComplete={loadProspects} />
      <AddProspectDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onProspectAdded={loadProspects} />
      <EditProspectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        prospect={editingProspect}
        onProspectUpdated={() => { loadProspects(); if (editingProspect && selectedProspect?.id === editingProspect.id) setSelectedProspect(null) }}
      />
      <CallProspectDialog open={callDialogOpen} onOpenChange={setCallDialogOpen} prospect={callingProspect} onCallCompleted={loadProspects} />
      <AddToSequenceDialog
        open={sequenceDialogOpen}
        onOpenChange={setSequenceDialogOpen}
        prospectIds={selectedRows}
        prospectName={selectedRows.length === 1 ? prospects.find((p) => p.id === selectedRows[0])?.name || 'Prospect' : `${selectedRows.length} prospects`}
        onSequenceAdded={() => { setSelectedRows([]); loadProspects() }}
      />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.ids.length === 1 ? 'prospect' : 'prospects'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.label}? This will also remove their calls, emails, and sequence data. This can&apos;t be undone.
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
