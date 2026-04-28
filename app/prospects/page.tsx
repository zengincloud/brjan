'use client'

import { useState, useEffect, useCallback, ElementType } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Phone, Mail, Linkedin, Plus, Upload, X, Pencil, Trash2, Zap, Search, MoreHorizontal, Send, StickyNote, Copy, ChevronDown, ChevronRight, Check, SlidersHorizontal, Settings2, RotateCcw, MapPin, Building2, Briefcase, User, GraduationCap, Sparkles, RefreshCw } from 'lucide-react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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
  wizaData?: any
  accountId?: string | null
}

type SequenceOption = { id: string; name: string }

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

// ── Contact info helpers ───────────────────────────────────────────────────────

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

function EmailRow({
  email,
  isPrimary,
  isEditing,
  onSetPrimary,
}: {
  email: string
  isPrimary: boolean
  isEditing?: boolean
  onSetPrimary: (email: string) => void
}) {
  const [val, setVal] = useState(email)
  return (
    <div className="flex items-center gap-2 group py-1.5">
      <button
        onClick={() => !isPrimary && isEditing && onSetPrimary(email)}
        title={isPrimary ? 'Primary' : isEditing ? 'Set as primary' : ''}
        className={cn('shrink-0 w-2 h-2 rounded-full transition-colors', isPrimary ? 'bg-[hsl(100,78%,44%)]' : isEditing ? 'bg-border hover:bg-muted-foreground/50 cursor-pointer' : 'bg-border')}
      />
      {isEditing ? (
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="text-[13px] text-foreground flex-1 min-w-0 bg-transparent border-b border-border focus:border-accent outline-none"
        />
      ) : (
        <a href={`mailto:${email}`} className="text-[13px] text-foreground hover:underline flex-1 truncate">{email}</a>
      )}
      <button onClick={() => copyToClipboard(isEditing ? val : email)} title="Copy" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  )
}

function PhoneRow({
  number,
  type,
  isPrimary,
  isEditing,
  onSetPrimary,
  onCall,
}: {
  number: string
  type?: string
  isPrimary: boolean
  isEditing?: boolean
  onSetPrimary: (number: string) => void
  onCall: (number: string) => void
}) {
  const [val, setVal] = useState(number)
  return (
    <div className="flex items-center gap-2 group py-1.5">
      <button
        onClick={() => !isPrimary && isEditing && onSetPrimary(number)}
        title={isPrimary ? 'Primary' : isEditing ? 'Set as primary' : ''}
        className={cn('shrink-0 w-2 h-2 rounded-full transition-colors', isPrimary ? 'bg-[hsl(100,78%,44%)]' : isEditing ? 'bg-border hover:bg-muted-foreground/50 cursor-pointer' : 'bg-border')}
      />
      {isEditing ? (
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="text-[13px] text-foreground flex-1 min-w-0 bg-transparent border-b border-border focus:border-accent outline-none"
        />
      ) : (
        <button
          onClick={() => onCall(number)}
          className="text-[13px] text-foreground hover:text-accent hover:underline flex-1 text-left truncate"
          title="Click to call"
        >
          {number}
        </button>
      )}
      {type && <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded capitalize shrink-0">{type}</span>}
      {!isEditing && (
        <button onClick={() => onCall(number)} title="Call" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Phone className="h-3 w-3 text-muted-foreground hover:text-accent" />
        </button>
      )}
      <button onClick={() => copyToClipboard(isEditing ? val : number)} title="Copy" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  )
}

// ── Overview tab (extracted to avoid closure issues with hooks) ────────────────

function OverviewTab({ prospect, pov, loadingPov, onRefreshPov, isEditing, onCall, onRefresh, toast }: {
  prospect: Prospect
  pov: any
  loadingPov: boolean
  onRefreshPov: () => void
  isEditing?: boolean
  onCall: (p: Prospect) => void
  onRefresh: () => void
  toast: any
}) {
  const [emailsExpanded, setEmailsExpanded] = useState(false)
  const [phonesExpanded, setPhonesExpanded] = useState(false)
  const [settingPrimary, setSettingPrimary] = useState(false)

  const wiza = prospect.wizaData || {}

  // Build unified email list
  const allEmails: { email: string; isPrimary: boolean }[] = []
  const seenEmails = new Set<string>()
  if (prospect.email) {
    allEmails.push({ email: prospect.email, isPrimary: true })
    seenEmails.add(prospect.email.toLowerCase())
  }
  if (Array.isArray(wiza.emails)) {
    for (const e of wiza.emails) {
      const addr = typeof e === 'string' ? e : e?.email || ''
      if (addr && !seenEmails.has(addr.toLowerCase())) {
        allEmails.push({ email: addr, isPrimary: false })
        seenEmails.add(addr.toLowerCase())
      }
    }
  }

  // Build unified phone list
  const allPhones: { number: string; type?: string; isPrimary: boolean }[] = []
  const seenPhones = new Set<string>()
  if (prospect.phone) {
    allPhones.push({ number: prospect.phone, isPrimary: true })
    seenPhones.add(prospect.phone.replace(/\D/g, ''))
  }
  if (Array.isArray(wiza.phones)) {
    for (const p of wiza.phones) {
      const num = p?.number || ''
      const normalized = num.replace(/\D/g, '')
      if (normalized && !seenPhones.has(normalized)) {
        allPhones.push({ number: num, type: p?.type, isPrimary: false })
        seenPhones.add(normalized)
      }
    }
  }

  const extraEmails = allEmails.filter(e => !e.isPrimary)
  const extraPhones = allPhones.filter(p => !p.isPrimary)

  const handleSetPrimaryEmail = async (email: string) => {
    setSettingPrimary(true)
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/emails`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) { toast({ title: 'Primary email updated' }); onRefresh() }
    } catch {
      toast({ title: 'Error', description: 'Failed to update primary email', variant: 'destructive' })
    } finally { setSettingPrimary(false) }
  }

  const handleSetPrimaryPhone = async (number: string) => {
    setSettingPrimary(true)
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: prospect.name, email: prospect.email, phone: number }),
      })
      if (res.ok) { toast({ title: 'Primary phone updated' }); onRefresh() }
    } catch {
      toast({ title: 'Error', description: 'Failed to update primary phone', variant: 'destructive' })
    } finally { setSettingPrimary(false) }
  }

  const handleCallNumber = (number: string) => {
    onCall({ ...prospect, phone: number })
  }

  const plainRows = [
    { label: 'Company', value: prospect.company || '—' },
    { label: 'Title', value: prospect.title || '—' },
    { label: 'Status', value: <StatusBadge status={prospect.status} /> },
    { label: 'Sequence', value: prospect.sequence || '—' },
    { label: 'Step', value: prospect.sequenceStep || '—' },
    { label: 'Last activity', value: prospect.lastActivity ? formatDistanceToNow(new Date(prospect.lastActivity), { addSuffix: true }) : '—' },
  ]

  return (
    <>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2.5">Contact Info</p>
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Emails */}
          <div className="px-3 py-1 border-b border-border">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[12px] text-muted-foreground w-20 shrink-0">Email</span>
              <div className="flex-1 min-w-0">
                {allEmails.length === 0 ? (
                  <span className="text-[13px] text-muted-foreground/50 italic">—</span>
                ) : (
                  <EmailRow
                    email={allEmails[0].email}
                    isPrimary={true}
                    isEditing={isEditing}
                    onSetPrimary={handleSetPrimaryEmail}
                  />
                )}
              </div>
            </div>
            {extraEmails.length > 0 && (
              <>
                {!isEditing && (
                  <button
                    onClick={() => setEmailsExpanded(v => !v)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-20 mb-1"
                  >
                    {emailsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {extraEmails.length} more email{extraEmails.length > 1 ? 's' : ''} found
                  </button>
                )}
                {(emailsExpanded || isEditing) && (
                  <div className="ml-20 mb-1 space-y-0 border-t border-border/60 pt-1">
                    {extraEmails.map(e => (
                      <EmailRow
                        key={e.email}
                        email={e.email}
                        isPrimary={false}
                        isEditing={isEditing}
                        onSetPrimary={handleSetPrimaryEmail}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Phones */}
          <div className="px-3 py-1 border-b border-border">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[12px] text-muted-foreground w-20 shrink-0">Phone</span>
              <div className="flex-1 min-w-0">
                {allPhones.length === 0 ? (
                  <span className="text-[13px] text-muted-foreground/50 italic">—</span>
                ) : (
                  <PhoneRow
                    number={allPhones[0].number}
                    type={allPhones[0].type}
                    isPrimary={true}
                    isEditing={isEditing}
                    onSetPrimary={handleSetPrimaryPhone}
                    onCall={handleCallNumber}
                  />
                )}
              </div>
            </div>
            {extraPhones.length > 0 && (
              <>
                {!isEditing && (
                  <button
                    onClick={() => setPhonesExpanded(v => !v)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-20 mb-1"
                  >
                    {phonesExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {extraPhones.length} more number{extraPhones.length > 1 ? 's' : ''} found
                  </button>
                )}
                {(phonesExpanded || isEditing) && (
                  <div className="ml-20 mb-1 border-t border-border/60 pt-1">
                    {extraPhones.map(p => (
                      <PhoneRow
                        key={p.number}
                        number={p.number}
                        type={p.type}
                        isPrimary={false}
                        isEditing={isEditing}
                        onSetPrimary={handleSetPrimaryPhone}
                        onCall={handleCallNumber}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Plain rows */}
          {plainRows.map(({ label, value }) => (
            <div key={label} className="flex items-center px-3 py-2 border-b border-border last:border-0">
              <span className="text-[12px] text-muted-foreground w-24 shrink-0">{label}</span>
              <span className="text-[12px] text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {prospect.accountId && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Point of View</p>
            <button
              onClick={onRefreshPov}
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
              <p className="text-[12px] text-muted-foreground mb-2">Generate an AI-powered briefing for {prospect.company}</p>
              <Button size="sm" variant="outline" className="h-7 text-[12px]" onClick={onRefreshPov}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}

type NoteEntry = {
  id: string
  text: string
  date: string
  initials: string
  userId: string
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
  from?: string | null
  transcription?: string | null
  transcriptionStatus?: string | null
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null
}

// ── Detail panel ───────────────────────────────────────────────────────────────

function ProspectDetail({
  prospect,
  onClose,
  onEdit,
  onCall,
  onDelete,
  onAddToSequence,
  onRefreshProspect,
}: {
  prospect: Prospect
  onClose: () => void
  onEdit: (p: Prospect) => void
  onCall: (p: Prospect) => void
  onDelete: (p: Prospect) => void
  onAddToSequence: (p: Prospect) => void
  onRefreshProspect: () => void
}) {
  const { toast } = useToast()
  const [tab, setTab] = useState<'overview' | 'activity' | 'notes'>('overview')
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [loadingCalls, setLoadingCalls] = useState(false)
  const [notes, setNotes] = useState<NoteEntry[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [removingSequence, setRemovingSequence] = useState(false)
  const [pov, setPov] = useState<any>(null)
  const [loadingPov, setLoadingPov] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: prospect.name, title: prospect.title || '', company: prospect.company || '', status: prospect.status })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name, title: editForm.title, company: editForm.company, status: editForm.status }),
      })
      if (res.ok) {
        toast({ title: 'Saved' })
        setIsEditing(false)
        onRefreshProspect()
      } else {
        toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    setCalls([])
    setLoadingCalls(true)
    fetch(`/api/calls?prospectId=${prospect.id}&limit=20`)
      .then((r) => r.json())
      .then((d) => setCalls(d.calls || []))
      .catch(() => {})
      .finally(() => setLoadingCalls(false))

    setNotes([])
    setLoadingNotes(true)
    fetch(`/api/prospects/${prospect.id}/notes`)
      .then((r) => r.json())
      .then((d) => setNotes(d.notes || []))
      .catch(() => {})
      .finally(() => setLoadingNotes(false))

    setPov(null)
    if (prospect.accountId) {
      setLoadingPov(true)
      fetch(`/api/accounts/${prospect.accountId}/pov`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => d && setPov(d.pov))
        .catch(() => {})
        .finally(() => setLoadingPov(false))
    }
  }, [prospect.id, prospect.accountId])

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setSavingNote(true)
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newNote.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setNotes(data.notes || [])
        setNewNote('')
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save note', variant: 'destructive' })
    } finally {
      setSavingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/notes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      })
      const data = await res.json()
      if (res.ok) setNotes(data.notes || [])
    } catch {
      toast({ title: 'Error', description: 'Failed to delete note', variant: 'destructive' })
    }
  }

  const handleRemoveFromSequence = async () => {
    setRemovingSequence(true)
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: null, sequenceStep: null }),
      })
      if (res.ok) {
        toast({ title: 'Removed from sequence' })
        onRefreshProspect()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to remove from sequence', variant: 'destructive' })
    } finally {
      setRemovingSequence(false)
    }
  }


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
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar name={prospect.name} size="lg" />
          {isEditing ? (
            <div className="flex flex-col gap-1.5 min-w-0 flex-1 pr-2">
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="h-7 text-[13px] font-semibold px-2"
                placeholder="Name"
              />
              <div className="flex gap-1.5">
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="h-6 text-[12px] px-2"
                  placeholder="Title"
                />
                <Input
                  value={editForm.company}
                  onChange={(e) => setEditForm(f => ({ ...f, company: e.target.value }))}
                  className="h-6 text-[12px] px-2"
                  placeholder="Company"
                />
              </div>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                className="h-6 text-[12px] px-2 rounded-md border border-border bg-background text-foreground"
              >
                <option value="new_lead">New Lead</option>
                <option value="contacted">Contacted</option>
                <option value="in_sequence">In Sequence</option>
                <option value="qualified">Qualified</option>
                <option value="customer">Customer</option>
                <option value="not_interested">Not Interested</option>
                <option value="churned">Churned</option>
              </select>
            </div>
          ) : (
            <div>
              <h2 className="text-[14px] font-semibold leading-tight">{prospect.name}</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {[prospect.title, prospect.company].filter(Boolean).join(' · ') || prospect.email}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 -mt-1 -mr-1">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="p-1.5 rounded hover:bg-accent/10 text-accent transition-colors disabled:opacity-50"
                title="Save"
              >
                <Check className="h-4 w-4 stroke-[2.5]" />
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditForm({ name: prospect.name, title: prospect.title || '', company: prospect.company || '', status: prospect.status }) }}
                className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground transition-colors"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setEditForm({ name: prospect.name, title: prospect.title || '', company: prospect.company || '', status: prospect.status }); setIsEditing(true) }}
                className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1.5">
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0 flex-wrap">
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
        {prospect.sequence ? (
          <Button size="sm" variant="outline" onClick={handleRemoveFromSequence} disabled={removingSequence} className="h-7 px-3 text-[12px] gap-1.5 text-muted-foreground">
            <Zap className="h-3.5 w-3.5" /> {removingSequence ? 'Removing...' : `In: ${prospect.sequence}`}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onAddToSequence(prospect)} className="h-7 px-3 text-[12px] gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Add to Sequence
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
              <DropdownMenuItem onClick={() => onDelete(prospect)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-5 border-b border-border shrink-0">
        {(['overview', 'activity', 'notes'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'mr-5 py-2.5 text-[12px] font-medium capitalize border-b-2 -mb-px transition-colors',
              tab === t ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'activity' && calls.length > 0 ? `activity (${calls.length})` :
             t === 'notes' && notes.length > 0 ? `notes (${notes.length})` : t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {tab === 'overview' && (
          <OverviewTab
            prospect={prospect}
            pov={pov}
            loadingPov={loadingPov}
            onRefreshPov={() => {
              if (!prospect.accountId) return
              setLoadingPov(true)
              fetch(`/api/accounts/${prospect.accountId}/pov?force=true`)
                .then((r) => r.ok ? r.json() : null)
                .then((d) => d && setPov(d.pov))
                .catch(() => {})
                .finally(() => setLoadingPov(false))
            }}
            isEditing={isEditing}
            onCall={onCall}
            onRefresh={onRefreshProspect}
            toast={toast}
          />
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
              <div className="space-y-3">
                {calls.map((call) => {
                  const label = call.outcome ? (OUTCOME_LABELS[call.outcome] ?? call.outcome.replace(/_/g, ' ')) : 'Call'
                  const dur = formatDuration(call.recordingDuration || call.duration)
                  const isPositive = call.outcome?.startsWith('connected')
                  const isVM = call.outcome === 'voicemail'
                  const isNoAnswer = ['no_answer', 'busy', 'failed'].includes(call.outcome ?? '')
                  const callDate = new Date(call.startedAt || call.createdAt)
                  const sdrName = call.user
                    ? [call.user.firstName, call.user.lastName].filter(Boolean).join(' ') || call.user.email || 'Unknown'
                    : 'Unknown'

                  return (
                    <div key={call.id} className="rounded-lg border border-border overflow-hidden">
                      {/* Call header */}
                      <div className={cn(
                        'flex items-center justify-between px-3 py-2.5',
                        isPositive ? 'bg-accent/5' : isVM ? 'bg-yellow-500/5' : isNoAnswer ? 'bg-muted/30' : 'bg-muted/20'
                      )}>
                        <div className="flex items-center gap-2">
                          <Phone className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            isPositive ? 'text-accent' : isVM ? 'text-yellow-400' : 'text-muted-foreground'
                          )} />
                          <span className={cn(
                            'text-[13px] font-semibold',
                            isPositive ? 'text-accent' : isVM ? 'text-yellow-400' : 'text-foreground'
                          )}>
                            {label}
                          </span>
                          {dur && (
                            <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {dur}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(callDate, { addSuffix: true })}
                        </span>
                      </div>

                      {/* Call meta */}
                      <div className="px-3 py-2 border-t border-border/60 space-y-1.5">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-[11px] text-muted-foreground">
                            <span className="text-foreground/60">SDR</span>{' '}
                            <span className="font-medium text-foreground">{sdrName}</span>
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            <span className="text-foreground/60">Date</span>{' '}
                            <span className="font-medium text-foreground">
                              {callDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            <span className="text-foreground/60">Time</span>{' '}
                            <span className="font-medium text-foreground">
                              {callDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </span>
                          </span>
                        </div>

                        {call.notes && (
                          <p className="text-[12px] text-foreground/80 leading-relaxed border-t border-border/60 pt-1.5 mt-1.5">
                            {call.notes}
                          </p>
                        )}

                        {call.recordingUrl && (
                          <div className="border-t border-border/60 pt-2 mt-1">
                            <p className="text-[11px] text-muted-foreground mb-1.5">Recording</p>
                            <audio controls className="h-8 w-full" src={`/api/calls/${call.id}/recording`} />
                          </div>
                        )}

                        {call.transcription && (
                          <div className="border-t border-border/60 pt-2 mt-1">
                            <p className="text-[11px] text-muted-foreground mb-1">Transcript</p>
                            <p className="text-[12px] text-foreground/70 leading-relaxed line-clamp-4">{call.transcription}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
        {tab === 'notes' && (
          <>
            {/* Add note */}
            <div className="rounded-lg border border-border overflow-hidden">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote() }}
                placeholder="Add a note... (⌘↵ to save)"
                className="w-full px-3 py-2.5 text-[13px] bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground/50 min-h-[80px]"
              />
              <div className="flex justify-end px-3 py-2 border-t border-border">
                <Button size="sm" onClick={handleAddNote} disabled={savingNote || !newNote.trim()} className="h-7 text-[12px] gap-1.5">
                  <Send className="h-3.5 w-3.5" /> {savingNote ? 'Saving...' : 'Add note'}
                </Button>
              </div>
            </div>

            {/* Notes list */}
            {loadingNotes ? (
              <p className="text-[12px] text-muted-foreground py-4 text-center">Loading...</p>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <StickyNote className="h-7 w-7 text-muted-foreground/20" />
                <p className="text-[12px] text-muted-foreground">No notes yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-lg border border-border p-3 group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-semibold text-accent">
                          {note.initials}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(note.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {' · '}
                          {new Date(note.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{note.text}</p>
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

const PROSPECT_COLS: ColDef[] = [
  { key: 'company',      label: 'Company' },
  { key: 'email',        label: 'Email' },
  { key: 'title',        label: 'Title' },
  { key: 'status',       label: 'Status' },
  { key: 'sequence',     label: 'Sequence' },
  { key: 'lastActivity', label: 'Last Activity' },
  { key: 'phone',        label: 'Phone' },
  { key: 'linkedin',     label: 'LinkedIn' },
]

const DEFAULT_PROSPECT_COLS = new Set(['company', 'email', 'title', 'status', 'sequence', 'lastActivity'])

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

function ProspectColumnSettings({ open, onOpenChange, visibleColumns, onSave }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  visibleColumns: Set<string>
  onSave: (cols: Set<string>) => void
}) {
  const [draft, setDraft] = useState<Set<string>>(new Set(visibleColumns))

  useEffect(() => { if (open) setDraft(new Set(visibleColumns)) }, [open, visibleColumns])

  const toggle = (key: string) =>
    setDraft((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })

  const orderedVisible = PROSPECT_COLS.filter((c) => draft.has(c.key))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <DialogTitle>Contact Column Settings</DialogTitle>
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">Select the columns you want to see.</p>
        </DialogHeader>

        <div className="flex gap-8 pt-2">
          {/* Left: checkboxes */}
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Columns</p>
            <div className="space-y-2.5">
              {PROSPECT_COLS.map((col) => (
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
                <span className="text-[13px] text-muted-foreground flex-1">Contact</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
                <span className="text-[12px] text-muted-foreground w-4 shrink-0">2</span>
                <span className="text-[13px] text-muted-foreground flex-1">Score</span>
              </div>
              {orderedVisible.map((col, i) => (
                <div key={col.key} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border">
                  <span className="text-[12px] text-muted-foreground w-4 shrink-0">{i + 3}</span>
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
          <Button variant="ghost" size="sm" onClick={() => setDraft(new Set(DEFAULT_PROSPECT_COLS))} className="mr-auto gap-1.5">
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

  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ name: '', title: '', location: '', status: '', sequence: '', company: '' })
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(DEFAULT_PROSPECT_COLS))

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
    if (q && !((p.name?.toLowerCase() ?? '').includes(q) || (p.company?.toLowerCase() ?? '').includes(q) || (p.email?.toLowerCase() ?? '').includes(q))) return false
    if (filters.name && !(p.name?.toLowerCase() ?? '').includes(filters.name.toLowerCase())) return false
    if (filters.title && !(p.title?.toLowerCase() ?? '').includes(filters.title.toLowerCase())) return false
    if (filters.company && !(p.company?.toLowerCase() ?? '').includes(filters.company.toLowerCase())) return false
    if (filters.status && p.status !== filters.status) return false
    if (filters.sequence && !(p.sequence?.toLowerCase() ?? '').includes(filters.sequence.toLowerCase())) return false
    return true
  })
  const activeFilterCount = Object.values(filters).filter(Boolean).length

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

          {/* ── Filter sidebar ─────────────────────────────────────────────── */}
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
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2 px-1">Personal Filters</p>
                  <div className="space-y-0.5">
                    <FilterRow icon={User} label="Name" value={filters.name} onSet={(v) => setFilters((f) => ({ ...f, name: v }))} onClear={() => setFilters((f) => ({ ...f, name: '' }))} />
                    <FilterRow icon={Briefcase} label="Job Information" value={filters.title} onSet={(v) => setFilters((f) => ({ ...f, title: v }))} onClear={() => setFilters((f) => ({ ...f, title: '' }))} />
                    <FilterRow icon={MapPin} label="Location" value={filters.location} onSet={(v) => setFilters((f) => ({ ...f, location: v }))} onClear={() => setFilters((f) => ({ ...f, location: '' }))} />
                    <FilterRow icon={Zap} label="Sequence" value={filters.sequence} onSet={(v) => setFilters((f) => ({ ...f, sequence: v }))} onClear={() => setFilters((f) => ({ ...f, sequence: '' }))} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2 px-1">Company Filters</p>
                  <div className="space-y-0.5">
                    <FilterRow icon={Building2} label="Business Name" value={filters.company} onSet={(v) => setFilters((f) => ({ ...f, company: v }))} onClear={() => setFilters((f) => ({ ...f, company: '' }))} />
                  </div>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setFilters({ name: '', title: '', location: '', status: '', sequence: '', company: '' })}
                    className="w-full text-[12px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" /> Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}

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
                      <Cb
                        checked={selectedRows.length === filteredProspects.length && filteredProspects.length > 0}
                        onChange={toggleAll}
                      />
                    </th>
                    <Th>Contact</Th>
                    <Th>Score</Th>
                    {!compact && visibleColumns.has('company') && <Th>Company</Th>}
                    {!compact && visibleColumns.has('email') && <Th>Email</Th>}
                    {!compact && visibleColumns.has('title') && <Th>Title</Th>}
                    {!compact && visibleColumns.has('phone') && <Th>Phone</Th>}
                    {!compact && visibleColumns.has('status') && <Th>Status</Th>}
                    {!compact && visibleColumns.has('sequence') && <Th>Sequence</Th>}
                    {!compact && visibleColumns.has('lastActivity') && <Th>Last Activity</Th>}
                    {!compact && visibleColumns.has('linkedin') && <Th>LinkedIn</Th>}
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
                          <td className="px-4 py-2.5 w-10" onClick={(e) => e.stopPropagation()}>
                            <Cb checked={isChecked} onChange={() => toggleRow(p.id)} />
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

                          {/* Full columns — hidden in compact mode, controlled by visibleColumns */}
                          {!compact && visibleColumns.has('company') && (
                            <td className="px-4 py-2.5 text-[13px] text-foreground/80 whitespace-nowrap">
                              {p.company || '—'}
                            </td>
                          )}
                          {!compact && visibleColumns.has('email') && (
                            <td className="px-4 py-2.5 text-[13px] text-foreground/70 whitespace-nowrap">
                              {p.email}
                            </td>
                          )}
                          {!compact && visibleColumns.has('title') && (
                            <td className="px-4 py-2.5 text-[13px] text-foreground/70 whitespace-nowrap">
                              {p.title || '—'}
                            </td>
                          )}
                          {!compact && visibleColumns.has('phone') && (
                            <td className="px-4 py-2.5 text-[13px] text-foreground/70 whitespace-nowrap">
                              {p.phone || '—'}
                            </td>
                          )}
                          {!compact && visibleColumns.has('status') && (
                            <td className="px-4 py-2.5">
                              <StatusBadge status={p.status} />
                            </td>
                          )}
                          {!compact && visibleColumns.has('sequence') && (
                            <td className="px-4 py-2.5 text-[13px] text-foreground/70 whitespace-nowrap max-w-[160px] truncate">
                              {p.sequence || '—'}
                            </td>
                          )}
                          {!compact && visibleColumns.has('lastActivity') && (
                            <td className="px-4 py-2.5 text-[13px] text-muted-foreground whitespace-nowrap">
                              {p.lastActivity ? formatDistanceToNow(new Date(p.lastActivity), { addSuffix: true }) : '—'}
                            </td>
                          )}
                          {!compact && visibleColumns.has('linkedin') && (
                            <td className="px-4 py-2.5">
                              {p.linkedin ? (
                                <a href={p.linkedin} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                  <Linkedin className="h-3.5 w-3.5 text-[#0A66C2] opacity-70 hover:opacity-100" />
                                </a>
                              ) : '—'}
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
                onAddToSequence={(p) => { setSelectedRows([p.id]); setSequenceDialogOpen(true) }}
                onRefreshProspect={loadProspects}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <UploadProspectsDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} onUploadComplete={loadProspects} />
      <AddProspectDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onProspectAdded={loadProspects} />
      <ProspectColumnSettings
        open={columnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
        visibleColumns={visibleColumns}
        onSave={setVisibleColumns}
      />
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
