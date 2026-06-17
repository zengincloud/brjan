"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Pencil, Trash2, Plus, Loader2, Video, Lock } from "lucide-react"
import { toast } from "sonner"

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
      setNewName("")
      setNewDesc("")
      setShowForm(false)
      load()
    } catch {
      toast.error("Failed to create template")
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (t: MeetingTemplate) => {
    setEditingId(t.id)
    setEditName(t.name)
    setEditDesc(t.description)
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
              <CardDescription>Pre-written agendas and descriptions for different meeting types</CardDescription>
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
                <Label>Default Description / Agenda</Label>
                <Textarea
                  placeholder="Agenda, talking points, or any notes to pre-fill..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
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
                      <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} />
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
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(t.id)}
                      >
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

function NotetakerView({ userTier }: { userTier?: string }) {
  const isPro = userTier === "pro_max"

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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-join Google Meet calls</p>
                <p className="text-xs text-muted-foreground">Bot joins 1 minute before start time</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Generate AI summary after call</p>
                <p className="text-xs text-muted-foreground">Key points, action items, and next steps</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Only record external meetings</p>
                <p className="text-xs text-muted-foreground">Skip meetings with only internal attendees</p>
              </div>
              <Switch />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Bot display name</Label>
            <Input defaultValue="Boiler Room Notes" className="max-w-xs" />
            <p className="text-xs text-muted-foreground">Name shown to other participants in the call</p>
          </div>

          <div className="pt-2">
            <Button size="sm">Save Settings</Button>
          </div>
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

interface MeetingSettingsProps {
  tab: "templates" | "notetaker"
  userTier?: string
}

export function MeetingSettings({ tab, userTier }: MeetingSettingsProps) {
  if (tab === "templates") return <TemplatesView />
  return <NotetakerView userTier={userTier} />
}
