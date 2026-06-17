"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Pencil, Trash2, Plus, Loader2, Video, Lock, Bold, Italic } from "lucide-react"
import { toast } from "sonner"

// ── Highlight [[variables]] in preview ────────────────────────────────────────

function highlightVariables(text: string) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g)
  return parts.map((part, i) =>
    /^\[\[.+\]\]$/.test(part) ? (
      <strong key={i} className="font-semibold text-primary">{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

// ── Rich template body editor ──────────────────────────────────────────────────

const VARIABLES = ["[[name]]", "[[company]]", "[[title]]", "[[date]]", "[[time]]"]

function TemplateEditor({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  function insertAtCursor(insert: string) {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = value.slice(0, start) + insert + value.slice(end)
    onChange(next)
    // Restore cursor after the inserted text
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + insert.length
      el.focus()
    })
  }

  function wrapSelection(before: string, after: string) {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)
    const wrapped = before + (selected || "text") + after
    const next = value.slice(0, start) + wrapped + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      if (selected) {
        el.selectionStart = start
        el.selectionEnd = start + wrapped.length
      } else {
        el.selectionStart = start + before.length
        el.selectionEnd = start + before.length + 4
      }
      el.focus()
    })
  }

  return (
    <div className="border rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-ring">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-secondary/30 flex-wrap">
        <button
          type="button"
          title="Bold"
          onMouseDown={(e) => { e.preventDefault(); wrapSelection("**", "**") }}
          className="p-1.5 rounded hover:bg-secondary transition-colors"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Italic"
          onMouseDown={(e) => { e.preventDefault(); wrapSelection("_", "_") }}
          className="p-1.5 rounded hover:bg-secondary transition-colors italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        {VARIABLES.map((v) => (
          <button
            key={v}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); insertAtCursor(v) }}
            className="text-[11px] font-mono font-semibold text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 hover:bg-primary/20 transition-colors"
          >
            {v}
          </button>
        ))}
      </div>
      {/* Textarea */}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2.5 text-sm bg-transparent resize-none outline-none placeholder:text-muted-foreground/50"
      />
    </div>
  )
}

// ── Meeting Templates ──────────────────────────────────────────────────────────

interface MeetingTemplate {
  id: string
  name: string
  description: string
  createdAt: string
}

function TemplatesView() {
  const [templates, setTemplates] = useState<MeetingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const res = await fetch("/api/meeting-templates")
      if (res.ok) setTemplates(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/meeting-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc }),
      })
      if (!res.ok) throw new Error()
      toast.success("Template created")
      setNewName(""); setNewDesc(""); setShowForm(false)
      load()
    } catch {
      toast.error("Failed to create template")
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (t: MeetingTemplate) => {
    setEditingId(t.id); setEditName(t.name); setEditDesc(t.description)
  }

  const handleSave = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/meeting-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDesc }),
      })
      if (!res.ok) throw new Error()
      toast.success("Template saved")
      setEditingId(null)
      load()
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/meeting-templates/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Template deleted")
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch {
      toast.error("Failed to delete")
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Meeting Templates</CardTitle>
              <CardDescription>Pre-written agendas — use <strong>[[variables]]</strong> and formatting to personalise</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4 mr-1.5" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <div className="border rounded-lg p-4 space-y-3 bg-secondary/30">
              <div className="space-y-1.5">
                <Label>Template Name</Label>
                <Input
                  placeholder="e.g. Discovery Call, Internal Sync..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description / Agenda</Label>
                <TemplateEditor
                  value={newDesc}
                  onChange={setNewDesc}
                  placeholder="Write your agenda here. Click variables above to insert them."
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setNewName(""); setNewDesc("") }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
                  {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Create
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Loading templates...</div>
          ) : templates.length === 0 && !showForm ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No templates yet. Create one to quickly pre-fill meeting descriptions.
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) =>
                editingId === t.id ? (
                  <div key={t.id} className="border rounded-lg p-4 space-y-3 bg-secondary/30">
                    <div className="space-y-1.5">
                      <Label>Template Name</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Description / Agenda</Label>
                      <TemplateEditor value={editDesc} onChange={setEditDesc} rows={4} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button size="sm" onClick={() => handleSave(t.id)} disabled={saving || !editName.trim()}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div key={t.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg group">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{t.name}</p>
                      {t.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{highlightVariables(t.description)}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Notetaker Settings ─────────────────────────────────────────────────────────

type NotetakerSettings = {
  autoJoin: boolean
  generateSummary: boolean
  externalOnly: boolean
  botName: string
}

const DEFAULTS: NotetakerSettings = {
  autoJoin: true,
  generateSummary: true,
  externalOnly: false,
  botName: "Boiler Room Notes",
}

function NotetakerView({ userTier }: { userTier?: string }) {
  const isPro = userTier === "pro_max" || userTier === "super_admin"
  const [settings, setSettings] = useState<NotetakerSettings>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isPro) return
    fetch("/api/auth/user")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.user?.notetakerSettings) {
          setSettings({ ...DEFAULTS, ...d.user.notetakerSettings })
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [isPro])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/auth/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notetakerSettings: settings }),
      })
      if (!res.ok) throw new Error()
      toast.success("Notetaker settings saved")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof NotetakerSettings, value: boolean | string) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  if (!isPro) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            AI Meeting Notetaker
          </CardTitle>
          <CardDescription>Automatically joins your meetings and generates AI summaries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <Video className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">Pro Max feature</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Upgrade to Pro Max to get an AI bot that joins your Google Meet calls, transcribes everything, and generates a summary after.
            </p>
            <Button asChild className="mt-2">
              <a href="/upgrade">Upgrade to Pro Max</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            AI Meeting Notetaker
          </CardTitle>
          <CardDescription>Automatically joins your meetings and generates AI summaries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-sm font-medium text-primary">Active on your account</p>
          </div>

          {!loaded ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-join Google Meet calls</p>
                    <p className="text-xs text-muted-foreground">Bot joins 1 minute before start time</p>
                  </div>
                  <Switch checked={settings.autoJoin} onCheckedChange={(v) => set("autoJoin", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Generate AI summary after call</p>
                    <p className="text-xs text-muted-foreground">Key points, action items, and next steps</p>
                  </div>
                  <Switch checked={settings.generateSummary} onCheckedChange={(v) => set("generateSummary", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Only record external meetings</p>
                    <p className="text-xs text-muted-foreground">Skip meetings with only internal attendees</p>
                  </div>
                  <Switch checked={settings.externalOnly} onCheckedChange={(v) => set("externalOnly", v)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Bot display name</Label>
                <Input
                  value={settings.botName}
                  onChange={(e) => set("botName", e.target.value)}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">Name shown to other participants in the call</p>
              </div>

              <div className="pt-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Save Settings
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground list-none">
            {[
              "Bot syncs with your Google Calendar every time you visit the Scheduler",
              "For each upcoming Google Meet link found, a bot is queued to join 1 min before start",
              "After the meeting ends, the bot generates a transcript and AI summary",
              "View summaries in the Meetings tab or in the prospect's activity timeline",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary text-foreground text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Export ─────────────────────────────────────────────────────────────────────

interface MeetingSettingsProps {
  tab: "templates" | "notetaker"
  userTier?: string
}

export function MeetingSettings({ tab, userTier }: MeetingSettingsProps) {
  if (tab === "templates") return <TemplatesView />
  return <NotetakerView userTier={userTier} />
}
