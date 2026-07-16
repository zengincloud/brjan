"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ChevronsDownUp,
  ArrowLeft,
  Plus,
  Users,
  Trash2,
  MoreHorizontal,
  Zap,
  Share2,
  Star,
  Save,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { SequenceStepCard, type SequenceStep, type StepType } from "@/components/sequence-step-card"
import { SequenceEmptyState, AddStepMenu, STEP_TYPE_OPTIONS } from "@/components/sequence-empty-state"

type Prospect = {
  id: string
  name: string
  email: string
  company?: string
  title?: string
  phone?: string | null
}

type Sequence = {
  id: string
  name: string
  description?: string
  status: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  steps: SequenceStep[]
  prospectSequences: {
    id: string
    status: string
    currentStep: number
    startedAt: string
    nextActionAt?: string
    prospect: Prospect
  }[]
}

export default function SequenceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const sequenceId = params.id as string

  const [sequence, setSequence] = useState<Sequence | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("editor")

  const [name, setName] = useState("")
  const [editingName, setEditingName] = useState(false)
  const [description, setDescription] = useState("")
  const [steps, setSteps] = useState<SequenceStep[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [collapsedIndexes, setCollapsedIndexes] = useState<Set<number>>(new Set())

  const [templates, setTemplates] = useState<{ id: string; name: string; subject: string; body: string }[]>([])
  const [allProspects, setAllProspects] = useState<Prospect[]>([])

  const [addProspectsOpen, setAddProspectsOpen] = useState(false)
  const [selectedProspects, setSelectedProspects] = useState<string[]>([])
  const [prospectSearch, setProspectSearch] = useState("")
  const [adding, setAdding] = useState(false)

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [prospectToRemove, setProspectToRemove] = useState<{ id: string; name: string } | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadSequence = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const response = await fetch(`/api/sequences/${sequenceId}`)
      if (!response.ok) throw new Error("Failed to load sequence")
      const data = await response.json()
      setSequence(data.sequence)
      setName(data.sequence.name)
      setDescription(data.sequence.description || "")
      setSteps(data.sequence.steps || [])
      setDirty(false)
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to load sequence", variant: "destructive" })
      router.push("/sequences")
    } finally {
      setLoading(false)
    }
  }, [sequenceId, router, toast])

  useEffect(() => {
    if (sequenceId) loadSequence()
  }, [sequenceId, loadSequence])

  useEffect(() => {
    fetch("/api/email-templates")
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((d) => setTemplates(d.templates || []))
      .catch(() => {})
  }, [])

  const loadProspects = async () => {
    try {
      const response = await fetch("/api/prospects")
      if (!response.ok) throw new Error("Failed to load prospects")
      const data = await response.json()
      setAllProspects(data.prospects || [])
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    loadProspects()
  }, [])

  const markDirty = () => setDirty(true)

  const updateStep = (index: number, patch: Partial<SequenceStep>) => {
    setSteps((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...patch }
      return updated
    })
    markDirty()
  }

  const addStep = (type: StepType, afterIndex?: number) => {
    setSteps((prev) => {
      const newStep: SequenceStep = {
        type,
        name: STEP_TYPE_OPTIONS.find((o) => o.type === type)?.label || type,
        order: 0,
        delayDays: prev.length === 0 ? 0 : 1,
        delayHours: 0,
        priority: "medium",
      }
      const insertAt = afterIndex === undefined ? prev.length : afterIndex + 1
      const updated = [...prev.slice(0, insertAt), newStep, ...prev.slice(insertAt)]
      return updated.map((s, i) => ({ ...s, order: i }))
    })
    markDirty()
  }

  const deleteStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })))
    markDirty()
  }

  const moveStep = (index: number, direction: "up" | "down") => {
    setSteps((prev) => {
      if ((direction === "up" && index === 0) || (direction === "down" && index === prev.length - 1)) return prev
      const updated = [...prev]
      const target = direction === "up" ? index - 1 : index + 1
      ;[updated[index], updated[target]] = [updated[target], updated[index]]
      return updated.map((s, i) => ({ ...s, order: i }))
    })
    markDirty()
  }

  const toggleCollapse = (index: number) => {
    setCollapsedIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const collapseAll = () => setCollapsedIndexes(new Set(steps.map((_, i) => i)))
  const expandAll = () => setCollapsedIndexes(new Set())
  const allCollapsed = steps.length > 0 && collapsedIndexes.size === steps.length

  const saveSequence = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/sequences/${sequenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, steps }),
      })
      if (!response.ok) throw new Error("Failed to save")
      toast({ title: "Saved", description: "Sequence updated successfully" })
      await loadSequence({ silent: true })
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to save sequence", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const saveName = async () => {
    setEditingName(false)
    if (!sequence || name === sequence.name) return
    try {
      const response = await fetch(`/api/sequences/${sequenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) throw new Error("Failed to rename")
      setSequence((s) => (s ? { ...s, name } : s))
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to rename sequence", variant: "destructive" })
      setName(sequence.name)
    }
  }

  const toggleSequenceStatus = async () => {
    if (!sequence) return
    const newStatus = sequence.status === "active" ? "paused" : "active"
    try {
      const response = await fetch(`/api/sequences/${sequenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, isActive: newStatus === "active" }),
      })
      if (!response.ok) throw new Error("Failed to update sequence")
      setSequence((s) => (s ? { ...s, status: newStatus, isActive: newStatus === "active" } : s))
      toast({ title: newStatus === "active" ? "Activated" : "Paused" })
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to update sequence status", variant: "destructive" })
    }
  }

  const addProspectsToSequence = async () => {
    if (selectedProspects.length === 0) {
      toast({ title: "Error", description: "Please select at least one prospect", variant: "destructive" })
      return
    }
    try {
      setAdding(true)
      const response = await fetch(`/api/sequences/${sequenceId}/prospects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectIds: selectedProspects }),
      })
      if (!response.ok) throw new Error("Failed to add prospects")
      const data = await response.json()
      toast({ title: "Success", description: `Added ${data.added} prospect(s) to sequence` })
      setAddProspectsOpen(false)
      setSelectedProspects([])
      loadSequence({ silent: true })
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to add prospects to sequence", variant: "destructive" })
    } finally {
      setAdding(false)
    }
  }

  const removeProspectFromSequence = async () => {
    if (!prospectToRemove || !sequence) return
    const prospectId = prospectToRemove.id
    setSequence({
      ...sequence,
      prospectSequences: sequence.prospectSequences.filter((ps) => ps.prospect.id !== prospectId),
    })
    setRemoveDialogOpen(false)
    setProspectToRemove(null)
    try {
      const response = await fetch(`/api/sequences/${sequenceId}/prospects/${prospectId}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to remove prospect")
      toast({ title: "Removed" })
    } catch (error) {
      console.error(error)
      loadSequence({ silent: true })
      toast({ title: "Error", description: "Failed to remove prospect", variant: "destructive" })
    }
  }

  const deleteSequence = async () => {
    try {
      setDeleting(true)
      const response = await fetch(`/api/sequences/${sequenceId}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete")
      toast({ title: "Deleted", description: `"${sequence?.name}" has been deleted` })
      router.push("/sequences")
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to delete sequence", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  const filteredProspects = allProspects.filter(
    (p) =>
      !sequence?.prospectSequences?.some((ps) => ps.prospect?.id === p.id) &&
      (p.name.toLowerCase().includes(prospectSearch.toLowerCase()) ||
        p.email?.toLowerCase().includes(prospectSearch.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!sequence) {
    return <div>Sequence not found</div>
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/sequences" className="hover:text-foreground">Sequences</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{sequence.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.push("/sequences")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {editingName ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="text-xl font-semibold h-10 max-w-sm"
          />
        ) : (
          <h1
            className="text-xl font-semibold cursor-text hover:opacity-80"
            onClick={() => setEditingName(true)}
            title="Click to rename"
          >
            {sequence.name}
          </h1>
        )}
        <button
          className="text-muted-foreground hover:text-yellow-500"
          onClick={() => toast({ title: "Coming soon", description: "Favoriting sequences isn't wired up yet." })}
        >
          <Star className="h-4 w-4" />
        </button>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast({ title: "Coming soon" })}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Zap className="h-3.5 w-3.5" />
                Workflows 0
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast({ title: "Coming soon", description: "Workflows aren't wired up yet." })}>
                Manage workflows
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add Contacts
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setAddProspectsOpen(true)}>
                Add existing contacts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ title: "Coming soon", description: "CSV import isn't wired up yet." })}>
                Import from CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-2 pl-1">
            <span className="text-sm text-muted-foreground">{sequence.status === "active" ? "Active" : "Paused"}</span>
            <Switch checked={sequence.status === "active"} onCheckedChange={toggleSequenceStatus} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete sequence
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto bg-transparent p-0 border-b border-border rounded-none w-full justify-start gap-6 overflow-x-auto">
          {["editor", "contacts", "activity", "report", "settings"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent px-0 pb-3 capitalize data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Editor */}
        <TabsContent value="editor" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="gap-1 font-normal">
              {steps.length} step{steps.length === 1 ? "" : "s"}
              <ChevronRight className="h-3 w-3" />
            </Badge>
            <div className="flex items-center gap-2">
              {steps.length > 0 && (
                <Button variant="outline" size="sm" onClick={allCollapsed ? expandAll : collapseAll}>
                  {allCollapsed ? <ChevronsUpDown className="h-4 w-4 mr-2" /> : <ChevronsDownUp className="h-4 w-4 mr-2" />}
                  {allCollapsed ? "Expand" : "Collapse"} steps
                </Button>
              )}
              <Button onClick={saveSequence} disabled={saving || !dirty}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>

          {steps.length === 0 ? (
            <SequenceEmptyState onAddStep={addStep} />
          ) : (
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={step.id || `new-${index}`}>
                  <SequenceStepCard
                    step={step}
                    index={index}
                    totalSteps={steps.length}
                    templates={templates}
                    collapsed={collapsedIndexes.has(index)}
                    onToggleCollapse={() => toggleCollapse(index)}
                    onUpdate={(patch) => updateStep(index, patch)}
                    onDelete={() => deleteStep(index)}
                    onMove={(dir) => moveStep(index, dir)}
                  />
                  {index < steps.length - 1 && (
                    <div className="flex justify-center py-2">
                      <AddStepMenu onAddStep={(type) => addStep(type, index)} compact />
                    </div>
                  )}
                </div>
              ))}
              <div className="w-px h-3 border-l border-dotted border-border mx-auto" />
              <AddStepMenu onAddStep={addStep} />
            </div>
          )}
        </TabsContent>

        {/* Contacts */}
        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contacts in Sequence</CardTitle>
              <Button onClick={() => setAddProspectsOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Contacts
              </Button>
            </CardHeader>
            <CardContent>
              {sequence.prospectSequences.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>No contacts in this sequence yet</p>
                  <Button onClick={() => setAddProspectsOpen(true)} className="mt-4">
                    Add Contacts
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sequence.prospectSequences.map((ps) => (
                    <div key={ps.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50">
                      <div className="flex-1 cursor-pointer" onClick={() => router.push(`/prospects/${ps.prospect.id}`)}>
                        <div className="font-medium">{ps.prospect.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {ps.prospect.title && <span>{ps.prospect.title}</span>}
                          {ps.prospect.title && ps.prospect.company && <span> at </span>}
                          {ps.prospect.company && <span>{ps.prospect.company}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{ps.prospect.email}</div>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            ps.status === "active"
                              ? "bg-accent/20 text-accent"
                              : ps.status === "completed"
                                ? "bg-green-500/20 text-green-600"
                                : "bg-yellow-500/20 text-yellow-600"
                          }
                        >
                          {ps.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          Step {ps.currentStep + 1} of {sequence.steps.length}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/prospects/${ps.prospect.id}`)}>
                            View Prospect
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setProspectToRemove({ id: ps.prospect.id, name: ps.prospect.name })
                              setRemoveDialogOpen(true)
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove from Sequence
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <p>Activity view isn't wired up yet.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report */}
        <TabsContent value="report" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">{sequence.prospectSequences.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold text-accent">
                  {sequence.prospectSequences.filter((ps) => ps.status === "active").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">
                  {sequence.prospectSequences.filter((ps) => ps.status === "completed").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">{sequence.steps.length}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="mt-4">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Sequence Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seq-name">Name</Label>
                <Input id="seq-name" value={name} onChange={(e) => { setName(e.target.value); markDirty() }} />
              </div>
              <div>
                <Label htmlFor="seq-desc">Description</Label>
                <Textarea
                  id="seq-desc"
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); markDirty() }}
                  rows={3}
                  placeholder="What is this sequence for?"
                />
              </div>
              <Button onClick={saveSequence} disabled={saving || !dirty}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <div className="pt-4 border-t border-border">
                <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete sequence
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Contacts Dialog */}
      <Dialog open={addProspectsOpen} onOpenChange={setAddProspectsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Contacts to Sequence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search Contacts</Label>
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={prospectSearch}
                onChange={(e) => setProspectSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredProspects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No contacts available</div>
              ) : (
                filteredProspects.map((prospect) => (
                  <div key={prospect.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50">
                    <Checkbox
                      checked={selectedProspects.includes(prospect.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedProspects([...selectedProspects, prospect.id])
                        else setSelectedProspects(selectedProspects.filter((id) => id !== prospect.id))
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{prospect.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {prospect.title && <span>{prospect.title}</span>}
                        {prospect.title && prospect.company && <span> at </span>}
                        {prospect.company && <span>{prospect.company}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{prospect.email}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="text-sm text-muted-foreground">{selectedProspects.length} contact(s) selected</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProspectsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addProspectsToSequence} disabled={adding}>
              {adding ? "Adding..." : `Add ${selectedProspects.length} Contact(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Prospect Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Sequence</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {prospectToRemove?.name} from this sequence? They will no longer receive any steps from this sequence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeProspectFromSequence} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Sequence Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sequence</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sequence.name}"? This will remove the sequence and all its steps. Contacts already in this sequence will be unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSequence} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
