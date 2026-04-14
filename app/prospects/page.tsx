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
  wizaData?: any
}

type SequenceOption = { id: string; name: string }

// ── Score helpers ──────────────────────────────────────────────────────────────

function getScore(status: string): 'high' | 'medium' | 'low' {
  if (['qualified', 'meeting_scheduled'].includes(status)) return 'high'
  if (['contacted', 'in_sequence'].includes(status)) return 'medium'
  return 'low'
}

function ScoreBars({ score }: { score: 'high' | 'medium' | 'low' }) {
  const bars = [
    { active: true },
    { active: score === 'medium' || score === 'high' },
    { active: score === 'high' },
  ]
  return (
    <div className="flex items-end gap-[3px]">
      {bars.map((bar, i) => (
        <div
          key={i}
          className={cn(
            'w-[3px] rounded-sm',
            bar.active
              ? score === 'high'
                ? 'bg-[hsl(100,78%,44%)]'
                : score === 'medium'
                ? 'bg-yellow-400'
                : 'bg-muted-foreground/40'
              : 'bg-muted-foreground/20'
          )}
          style={{ height: `${8 + i * 4}px` }}
        />
      ))}
    </div>
  )
}

// ── Avatar helpers ─────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-cyan-600', 'bg-emerald-600',
  'bg-amber-500', 'bg-rose-500', 'bg-violet-600', 'bg-pink-600',
]

function getInitials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-[11px]'
  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold text-white shrink-0', getAvatarColor(name), cls)}>
      {getInitials(name)}
    </div>
  )
}

// ── Status label ───────────────────────────────────────────────────────────────

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

  let povParsed: any = null
  try { povParsed = typeof prospect.povData === 'string' ? JSON.parse(prospect.povData) : prospect.povData } catch {}

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Avatar name={prospect.name} size="lg" />
          <div>
            <h2 className="text-[14px] font-semibold text-foreground leading-tight">{prospect.name}</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {[prospect.title, prospect.company].filter(Boolean).join(' · ') || prospect.email}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Action buttons */}
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
      <div className="flex gap-0 px-5 border-b border-border shrink-0">
        {(['overview', 'activity'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-0 mr-5 py-2.5 text-[12px] font-medium capitalize border-b-2 transition-colors',
              tab === t ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {tab === 'overview' && (
          <>
            {/* Details grid */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2.5">Details</p>
              <div className="space-y-0 rounded-lg border border-border overflow-hidden">
                {detailRows.map(({ label, value }) => (
                  <div key={label} className="flex items-center px-3 py-2 border-b border-border last:border-0">
                    <span className="text-[12px] text-muted-foreground w-24 shrink-0">{label}</span>
                    <span className="text-[12px] text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Research */}
            {povParsed && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2.5">AI Research</p>
                <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                  {Object.entries(povParsed).slice(0, 6).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[11px] font-medium text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</p>
                      <p className="text-[12px] text-foreground">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'activity' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-[12px] text-muted-foreground">No activity recorded yet.</p>
          </div>
        )}
      </div>
    </div>
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
      if (!res.ok) throw new Error('Failed to load prospects')
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

  useEffect(() => {
    loadProspects()
    loadSequences()
  }, [loadProspects, loadSequences])

  const filteredProspects = prospects.filter((p) => {
    const q = searchTerm.toLowerCase()
    return (
      !q ||
      (p.name?.toLowerCase() ?? '').includes(q) ||
      (p.company?.toLowerCase() ?? '').includes(q) ||
      (p.email?.toLowerCase() ?? '').includes(q)
    )
  })

  const handleEditProspect = (p: Prospect) => {
    setEditingProspect(p)
    setEditDialogOpen(true)
  }

  const handleCallProspect = (p: Prospect) => {
    setCallingProspect(p)
    setCallDialogOpen(true)
  }

  const confirmDelete = (ids: string[], label: string) => {
    setDeleteTarget({ ids, label })
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      const results = await Promise.all(
        deleteTarget.ids.map((id) => fetch(`/api/prospects/${id}`, { method: 'DELETE' }))
      )
      const failed = results.filter((r) => !r.ok).length
      if (failed > 0) {
        toast({ title: 'Error', description: `Failed to delete ${failed} prospect${failed > 1 ? 's' : ''}`, variant: 'destructive' })
      } else {
        toast({ title: 'Deleted', description: `${deleteTarget.ids.length === 1 ? deleteTarget.label : `${deleteTarget.ids.length} prospects`} deleted` })
        if (selectedProspect && deleteTarget.ids.includes(selectedProspect.id)) {
          setSelectedProspect(null)
        }
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

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id])
  }

  const toggleAll = () => {
    setSelectedRows((prev) => prev.length === filteredProspects.length ? [] : filteredProspects.map((p) => p.id))
  }

  return (
    <>
      {/* Break out of shell padding, fill viewport */}
      <div className="-m-5 flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>

        {/* Trial banner */}
        {user?.tier === 'trial' && (
          <div className="px-5 pt-4 shrink-0">
            <TrialLimitBanner current={totalCount} limit={TRIAL_LIMITS.prospects} resourceLabel="prospects" />
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* ── Left panel ──────────────────────────────────────────────── */}
          <div
            className={cn(
              'flex flex-col border-r border-border overflow-hidden shrink-0 transition-all duration-200',
              selectedProspect ? 'w-[360px]' : 'flex-1'
            )}
          >
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search prospects..."
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => confirmDelete(selectedRows, `${selectedRows.length} prospects`)}
                    className="h-8 text-[12px] text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedRows([])} className="h-8 text-[12px]">Clear</Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setUploadDialogOpen(true)} className="h-8 text-[12px]">
                    <Upload className="h-3.5 w-3.5 mr-1" /> CSV
                  </Button>
                  <Button size="sm" onClick={() => setAddDialogOpen(true)} className="h-8 text-[12px]">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
              )}
            </div>

            {/* Column headers */}
            <div className="flex items-center px-3 py-2 border-b border-border shrink-0">
              <div className="w-7 mr-3 shrink-0">
                <input
                  type="checkbox"
                  checked={selectedRows.length === filteredProspects.length && filteredProspects.length > 0}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded accent-[hsl(100,78%,44%)]"
                />
              </div>
              <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Contact</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mr-1">Score</span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-[13px] text-muted-foreground">Loading...</p>
                </div>
              ) : filteredProspects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-[13px] text-muted-foreground">No prospects found</p>
                  <Button size="sm" onClick={() => setAddDialogOpen(true)} className="text-[12px] h-8">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add prospect
                  </Button>
                </div>
              ) : (
                <>
                  {filteredProspects.map((p) => {
                    const score = getScore(p.status)
                    const isSelected = selectedProspect?.id === p.id
                    const isChecked = selectedRows.includes(p.id)

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProspect(isSelected ? null : p)}
                        className={cn(
                          'flex items-center px-3 py-2.5 border-b border-border/60 cursor-pointer transition-colors group',
                          isSelected ? 'bg-accent/10' : 'hover:bg-muted/40'
                        )}
                      >
                        {/* Checkbox */}
                        <div
                          className="w-7 mr-3 shrink-0"
                          onClick={(e) => { e.stopPropagation(); toggleRow(p.id) }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRow(p.id)}
                            className="h-3.5 w-3.5 rounded accent-[hsl(100,78%,44%)]"
                          />
                        </div>

                        {/* Avatar */}
                        <div className="mr-2.5 shrink-0">
                          <Avatar name={p.name} />
                        </div>

                        {/* Name + subtitle */}
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-[13px] font-medium truncate leading-tight', isSelected ? 'text-foreground' : 'text-foreground/90')}>
                            {p.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {[p.title, p.company].filter(Boolean).join(' · ') || p.email}
                          </p>
                        </div>

                        {/* Score bars */}
                        <div className="ml-3 shrink-0">
                          <ScoreBars score={score} />
                        </div>
                      </div>
                    )
                  })}

                  {/* Load more */}
                  {prospects.length < totalCount && (
                    <div className="flex justify-center py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); loadProspects(page + 1, true) }}
                        className="text-[12px] text-muted-foreground hover:text-foreground underline"
                      >
                        Load more ({prospects.length} of {totalCount})
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Right panel ─────────────────────────────────────────────── */}
          {selectedProspect && (
            <div className="flex-1 overflow-hidden">
              <ProspectDetail
                prospect={selectedProspect}
                onClose={() => setSelectedProspect(null)}
                onEdit={(p) => { setSelectedProspect(p); handleEditProspect(p) }}
                onCall={handleCallProspect}
                onDelete={(p) => confirmDelete([p.id], p.name)}
              />
            </div>
          )}

          {/* Empty right panel state */}
          {!selectedProspect && (
            <div className="hidden" />
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
        onProspectUpdated={() => {
          loadProspects()
          if (editingProspect && selectedProspect?.id === editingProspect.id) {
            setSelectedProspect(null)
          }
        }}
      />
      <CallProspectDialog
        open={callDialogOpen}
        onOpenChange={setCallDialogOpen}
        prospect={callingProspect}
        onCallCompleted={loadProspects}
      />
      <AddToSequenceDialog
        open={sequenceDialogOpen}
        onOpenChange={setSequenceDialogOpen}
        prospectIds={selectedRows}
        prospectName={
          selectedRows.length === 1
            ? prospects.find((p) => p.id === selectedRows[0])?.name || 'Prospect'
            : `${selectedRows.length} prospects`
        }
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
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
