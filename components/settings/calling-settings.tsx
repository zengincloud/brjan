"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GetNumberDialog } from "@/components/get-number-dialog"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Info,
  Loader2,
  Mic,
  MoreHorizontal,
  Phone,
  Play,
  Plus,
  Search,
  Settings2,
  Shield,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"

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
function OverviewView() {
  return (
    <div className="space-y-4">
      {/* Alert */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-muted/30 text-[13px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0" />
          <span>Monitor your number health to keep connection rates high. Numbers flagged as spam can significantly reduce pickup rates.</span>
        </div>
        <X className="h-4 w-4 cursor-pointer shrink-0 ml-3" />
      </div>

      {/* Number pool selector */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <p className="text-[13px] font-semibold">Number performance</p>
        <p className="text-[12px] text-muted-foreground">Select a number to view its specific performance metrics below.</p>
        <div className="flex items-center gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-48 h-8 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[13px]">All numbers</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Manage numbers
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          title="Connection rate"
          value="0 %"
          subtitle="From last month"
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Call performance</p>
              <p className="text-[12px] text-muted-foreground">Learn how to improve connection rates <span className="underline cursor-pointer">here</span>.</p>
            </div>
          }
        >
          <StatRow icon={TrendingUp} label="0 Connected" />
          <StatRow icon={TrendingDown} label="0 No answer" />
        </StatCard>

        <StatCard
          title="Avg talk time"
          value="0:00"
          subtitle="From last month"
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Engagement quality</p>
              <p className="text-[12px] text-muted-foreground">Understand what drives longer conversations <span className="underline cursor-pointer">here</span>.</p>
            </div>
          }
        >
          <StatRow icon={Phone} label="0 Total calls made" />
          <StatRow icon={TrendingUp} label="0 Conversations" />
        </StatCard>

        <StatCard
          title="Voicemail drop rate"
          value="0 %"
          subtitle="From last month"
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Voicemail activity</p>
              <p className="text-[12px] text-muted-foreground">Learn when to use voicemail drops <span className="underline cursor-pointer">here</span>.</p>
            </div>
          }
        >
          <StatRow icon={Mic} label="0 Voicemails left" />
          <StatRow icon={TrendingUp} label="0 Callbacks received" />
        </StatCard>
      </div>

      {/* Chart + Recommendations */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">Call Activity and Connection Rate</p>
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
            {["Activity", "Connection Rate"].map((t, i) => (
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

/* ─── NUMBERS ─── */
interface PhoneNumberRecord {
  id: string
  number: string
  friendlyName: string
  areaCode: string
  createdAt: string
}


function NumbersView() {
  const [numbers, setNumbers] = useState<PhoneNumberRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [releasing, setReleasing] = useState<string | null>(null)

  const fetchNumbers = useCallback(async () => {
    try {
      const res = await fetch("/api/calling/numbers")
      if (res.ok) {
        const data = await res.json()
        setNumbers(data.numbers || [])
      }
    } catch (e) {
      console.error("Failed to fetch numbers:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchNumbers() }, [fetchNumbers])

  const handleRelease = async (id: string, friendlyName: string) => {
    if (!confirm(`Release ${friendlyName}? This cannot be undone.`)) return
    setReleasing(id)
    try {
      const res = await fetch(`/api/calling/numbers/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to release")
      toast.success(`${friendlyName} released`)
      setNumbers((prev) => prev.filter((n) => n.id !== id))
    } catch (err: any) {
      toast.error(err.message || "Failed to release number")
    } finally {
      setReleasing(null)
    }
  }


  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Numbers in good standing"
          value={`${numbers.length} of ${numbers.length}`}
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Number health</p>
              <p className="text-[12px] text-muted-foreground">Numbers flag as spam after high call volumes.</p>
            </div>
          }
        >
          <StatRow icon={CheckCircle2} label={`${numbers.length} Clean`} />
          <StatRow icon={AlertTriangle} label="0 Flagged as spam" />
        </StatCard>

        <StatCard
          title="Local presence area codes"
          value={`${new Set(numbers.map((n) => n.areaCode)).size} active`}
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Local presence coverage</p>
              <p className="text-[12px] text-muted-foreground">Local numbers improve answer rates by up to 4x.</p>
            </div>
          }
        >
          {numbers.length === 0
            ? <p className="text-[12px] text-muted-foreground">Add numbers to enable local presence dialing.</p>
            : [...new Set(numbers.map((n) => n.areaCode))].map((ac) => (
                <StatRow key={ac} icon={Phone} label={`Area code ${ac}`} />
              ))
          }
        </StatCard>
      </div>

      {/* Numbers table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-semibold">Phone Numbers</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-[12px] bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-medium gap-1"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add number
            </Button>
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border">
              {["Number", "Friendly Name", "Area code", "Added", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : numbers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                  No numbers yet. Click &quot;Add number&quot; to provision one.
                </td>
              </tr>
            ) : (
              numbers.map((n) => (
                <tr key={n.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono">{n.number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{n.friendlyName}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[11px]">{n.areaCode}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRelease(n.id, n.friendlyName)}
                      disabled={releasing === n.id}
                    >
                      {releasing === n.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <GetNumberDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        existingCount={numbers.length}
        onNumberAdded={() => fetchNumbers()}
      />
    </div>
  )
}

/* ─── VOICEMAIL ─── */
function VoicemailView() {
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Voicemail clips ready"
          value="0 of 0"
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Clip library</p>
              <p className="text-[12px] text-muted-foreground">Learn how to craft an effective voicemail <span className="underline cursor-pointer">here</span>.</p>
            </div>
          }
        >
          <StatRow icon={CheckCircle2} label="0 Active" />
          <StatRow icon={Info} label="0 Draft" />
        </StatCard>

        <StatCard
          title="Avg callback rate from voicemails"
          value="0 %"
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Voicemail performance</p>
              <p className="text-[12px] text-muted-foreground">Understand callback patterns <span className="underline cursor-pointer">here</span>.</p>
            </div>
          }
        >
          <p className="text-[12px] text-muted-foreground">No voicemails dropped yet</p>
        </StatCard>
      </div>

      {/* Voicemail clips table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-semibold">Voicemail Clips</span>
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
            <Input placeholder="Search clips..." className="h-7 pl-7 text-[12px] w-48" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-[12px] bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-medium gap-1"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload clip
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[12px] gap-1.5 text-muted-foreground">
              <Mic className="h-3.5 w-3.5" />
              Record new
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[12px] gap-1.5 text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Sort
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
              {["Clip name", "Duration", "Status", "Default", "Times used", "Callback rate", "Last used", "Actions"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 whitespace-nowrap">
                  {h === "Callback rate" ? (
                    <span className="flex items-center gap-1">{h} <Info className="h-3 w-3" /></span>
                  ) : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                No voicemail clips. Upload an audio file or record a new clip to get started.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Default voicemail per sequence */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <p className="text-[13px] font-semibold">Default voicemail</p>
        <p className="text-[12px] text-muted-foreground">Select which clip plays by default when you trigger a voicemail drop. Sequences can override this with their own clip.</p>
        <Select defaultValue="none">
          <SelectTrigger className="w-64 h-8 text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-[13px]">No default set</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

/* ─── COMPLIANCE ─── */
function ComplianceView() {
  return (
    <div className="space-y-4">
      {/* Alert */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-muted/30 text-[13px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 shrink-0" />
          <span>Staying compliant protects your business. Review your DNC list regularly and ensure recording consent settings meet your region&apos;s requirements.</span>
        </div>
        <X className="h-4 w-4 cursor-pointer shrink-0 ml-3" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          title="DNC list entries"
          value="0"
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Do Not Call</p>
              <p className="text-[12px] text-muted-foreground">Manage numbers you should never call <span className="underline cursor-pointer">here</span>.</p>
            </div>
          }
        >
          <StatRow icon={Phone} label="0 Individual numbers" />
          <StatRow icon={Info} label="0 Domain-level blocks" />
        </StatCard>

        <StatCard
          title="Calls blocked by DNC"
          value="0"
          subtitle="From last month"
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Protection active</p>
              <p className="text-[12px] text-muted-foreground">DNC checks run before every dial.</p>
            </div>
          }
        >
          <StatRow icon={CheckCircle2} label="0 Auto-blocked this month" />
        </StatCard>

        <StatCard
          title="Recording compliance"
          value="Active"
          footer={
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Consent settings</p>
              <p className="text-[12px] text-muted-foreground">Review your recording disclosure settings <span className="underline cursor-pointer">here</span>.</p>
            </div>
          }
        >
          <StatRow icon={CheckCircle2} label="Recording announcement enabled" />
        </StatCard>
      </div>

      {/* Recording consent */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-[13px] font-semibold">Recording Consent</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium">Play recording announcement</p>
              <p className="text-[12px] text-muted-foreground">Automatically play a disclosure message at the start of every recorded call</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="space-y-2">
            <p className="text-[13px] font-medium">Announcement message</p>
            <p className="text-[12px] text-muted-foreground">Customize the disclosure text read at call start. Leave blank to use the default.</p>
            <textarea
              className="w-full h-16 px-3 py-2 text-[12px] border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="This call may be recorded for quality and training purposes."
            />
          </div>
          <div className="space-y-2">
            <p className="text-[13px] font-medium">Recording jurisdiction</p>
            <p className="text-[12px] text-muted-foreground">Select the consent law that applies to most of your calls. This affects whether one-party or two-party consent disclosure plays.</p>
            <Select defaultValue="one-party">
              <SelectTrigger className="w-72 h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one-party" className="text-[13px]">One-party consent (most US states)</SelectItem>
                <SelectItem value="two-party" className="text-[13px]">Two-party / all-party consent (CA, IL, etc.)</SelectItem>
                <SelectItem value="gdpr" className="text-[13px]">GDPR (EU / UK)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* DNC List */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-semibold">Do Not Call List</span>
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
            <Input placeholder="Search DNC list..." className="h-7 pl-7 text-[12px] w-48" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-[12px] bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-medium gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add number
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[12px] gap-1.5 text-muted-foreground">
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[12px] gap-1.5 text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Sort
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
              {["Number / Domain", "Type", "Reason", "Added by", "Date added", "Actions"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                Your DNC list is empty. Numbers added here will never be dialed.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* TCPA toggles */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-[13px] font-semibold">TCPA & Calling Rules</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium">Respect federal DNC registry</p>
              <p className="text-[12px] text-muted-foreground">Cross-check prospect numbers against the national Do Not Call registry before dialing</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium">Enforce calling hours</p>
              <p className="text-[12px] text-muted-foreground">Block dials outside 8 AM – 9 PM in the prospect&apos;s local time zone (TCPA safe harbor)</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium">Auto-add opt-outs to DNC list</p>
              <p className="text-[12px] text-muted-foreground">Automatically add prospects who request to not be called to your DNC list</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[13px] font-medium">Max attempts per number per day</p>
              <p className="text-[12px] text-muted-foreground">Limit how many times the same number can be dialed in a single day</p>
            </div>
            <Select defaultValue="3">
              <SelectTrigger className="w-32 h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1" className="text-[13px]">1 attempt</SelectItem>
                <SelectItem value="2" className="text-[13px]">2 attempts</SelectItem>
                <SelectItem value="3" className="text-[13px]">3 attempts</SelectItem>
                <SelectItem value="5" className="text-[13px]">5 attempts</SelectItem>
                <SelectItem value="unlimited" className="text-[13px]">Unlimited</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── MAIN COMPONENT ─── */
export function CallingSettings({ tab }: { tab: "overview" | "numbers" | "voicemail" | "compliance" }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Calling Suite</h2>
      </div>

      {tab === "overview" && <OverviewView />}
      {tab === "numbers" && <NumbersView />}
      {tab === "voicemail" && <VoicemailView />}
      {tab === "compliance" && <ComplianceView />}
    </div>
  )
}
