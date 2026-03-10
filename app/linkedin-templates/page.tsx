"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Pencil, Trash2, MessageSquareText } from "lucide-react"
import { toast } from "sonner"

interface LinkedinTemplate {
  id: string
  name: string
  body: string
  description: string | null
  category: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const TEMPLATE_VARIABLES = [
  { label: "First Name", variable: "{{firstName}}" },
  { label: "Last Name", variable: "{{lastName}}" },
  { label: "Full Name", variable: "{{name}}" },
  { label: "Company", variable: "{{company}}" },
  { label: "Title", variable: "{{title}}" },
  { label: "Email", variable: "{{email}}" },
  { label: "Phone", variable: "{{phone}}" },
] as const

const CATEGORIES = ["general", "intro", "follow-up", "meeting", "referral"]

export default function LinkedinTemplatesPage() {
  const [templates, setTemplates] = useState<LinkedinTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<LinkedinTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [body, setBody] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("general")
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/linkedin-templates")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTemplates(data.templates)
    } catch {
      toast.error("Failed to load templates")
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingTemplate(null)
    setName("")
    setBody("")
    setDescription("")
    setCategory("general")
    setDialogOpen(true)
  }

  function openEditDialog(template: LinkedinTemplate) {
    setEditingTemplate(template)
    setName(template.name)
    setBody(template.body)
    setDescription(template.description || "")
    setCategory(template.category || "general")
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!name.trim() || !body.trim()) {
      toast.error("Name and body are required")
      return
    }

    setSaving(true)
    try {
      if (editingTemplate) {
        const res = await fetch(`/api/linkedin-templates/${editingTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, body, description, category }),
        })
        if (!res.ok) throw new Error()
        toast.success("Template updated")
      } else {
        const res = await fetch("/api/linkedin-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, body, description, category }),
        })
        if (!res.ok) throw new Error()
        toast.success("Template created")
      }
      setDialogOpen(false)
      fetchTemplates()
    } catch {
      toast.error("Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return
    try {
      const res = await fetch(`/api/linkedin-templates/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Template deleted")
      fetchTemplates()
    } catch {
      toast.error("Failed to delete template")
    }
  }

  function insertVariable(variable: string) {
    const textarea = bodyRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newBody = body.substring(0, start) + variable + body.substring(end)
    setBody(newBody)

    // Restore cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + variable.length
    }, 0)
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LinkedIn Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create DM templates for quick messaging on LinkedIn. Use variables like {"{{firstName}}"} for personalization.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading templates...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquareText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm mb-4">No LinkedIn templates yet</p>
            <Button onClick={openCreateDialog} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create your first template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold truncate">
                      {template.name}
                    </CardTitle>
                    {template.category && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {template.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditDialog(template)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {template.body}
                </p>
                {template.description && (
                  <p className="text-xs text-muted-foreground/60 mt-2 italic truncate">
                    {template.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "New LinkedIn Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Cold Intro"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message Body</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.variable}
                    type="button"
                    className="px-2 py-0.5 text-xs rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors border border-accent/20"
                    onClick={() => insertVariable(v.variable)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <Textarea
                ref={bodyRef}
                id="body"
                placeholder="Hi {{firstName}}, I noticed you work at {{company}}..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Internal note about when to use this template"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingTemplate ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
