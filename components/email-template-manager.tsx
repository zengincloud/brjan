"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { FileText, Plus, Edit, Trash2, Save } from "lucide-react"

type EmailTemplate = {
  id: string
  name: string
  subject: string
  body: string
  description?: string
  category: string
  createdAt: string
  updatedAt: string
}

export function EmailTemplateManager() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    description: "",
    category: "general",
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/email-templates")
      if (!response.ok) throw new Error("Failed to load templates")
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error("Error loading templates:", error)
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingTemplate(null)
    setFormData({
      name: "",
      subject: "",
      body: "",
      description: "",
      category: "general",
    })
    setDialogOpen(true)
  }

  const openEditDialog = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      description: template.description || "",
      category: template.category,
    })
    setDialogOpen(true)
  }

  const saveTemplate = async () => {
    if (!formData.name || !formData.subject || !formData.body) {
      toast({
        title: "Error",
        description: "Name, subject, and body are required",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const url = editingTemplate
        ? `/api/email-templates/${editingTemplate.id}`
        : "/api/email-templates"
      const method = editingTemplate ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to save template")

      toast({
        title: "Success",
        description: `Template ${editingTemplate ? "updated" : "created"} successfully`,
      })

      setDialogOpen(false)
      loadTemplates()
    } catch (error) {
      console.error("Error saving template:", error)
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return

    try {
      const response = await fetch(`/api/email-templates/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete template")

      toast({
        title: "Success",
        description: "Template deleted successfully",
      })

      loadTemplates()
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="py-8 text-center">Loading templates...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Email Templates</h2>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No templates yet</p>
            <p className="text-sm">Create your first email template to use in sequences</p>
            <Button onClick={openCreateDialog} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:border-accent/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {template.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Subject:</p>
                  <p className="text-sm line-clamp-2">{template.subject}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Body:</p>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {template.body}
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(template)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTemplate(template.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Cold Outreach - Enterprise"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., cold_outreach, follow_up"
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template"
              />
            </div>

            <div>
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Subject line"
              />
            </div>

            <div>
              <Label htmlFor="body">Email Body</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Email content..."
                rows={10}
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can use variables like {"{"}name{"}"}, {"{"}company{"}"}, etc.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTemplate} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
