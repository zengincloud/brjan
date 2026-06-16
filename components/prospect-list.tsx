"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Mail, Pencil, Phone, Filter, ChevronDown, Upload, Plus, Check, X, Zap, Linkedin, Trash2, MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"
import { UploadProspectsDialog } from "./upload-prospects-dialog"
import { AddProspectDialog } from "./add-prospect-dialog"
import { EditProspectDialog } from "./edit-prospect-dialog"
import { CallProspectDialog } from "./call-prospect-dialog"
import { AddToSequenceDialog } from "./add-to-sequence-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { useUser } from "@/hooks/use-user"
import { TrialLimitBanner } from "@/components/trial-limit-banner"
import { TRIAL_LIMITS } from "@/lib/trial-limits"

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
}

type SequenceOption = {
  id: string
  name: string
}

export function ProspectList() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 50
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [selectedSequence, setSelectedSequence] = useState<string>("")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null)
  const [callDialogOpen, setCallDialogOpen] = useState(false)
  const [callingProspect, setCallingProspect] = useState<Prospect | null>(null)
  const [sequenceDialogOpen, setSequenceDialogOpen] = useState(false)
  const [quickEditId, setQuickEditId] = useState<string | null>(null)
  const [quickEditData, setQuickEditData] = useState({ email: "", phone: "" })
  const [quickEditSaving, setQuickEditSaving] = useState(false)
  const [sequences, setSequences] = useState<SequenceOption[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadProspects()
    loadSequences()
  }, [])

  const loadSequences = async () => {
    try {
      const response = await fetch("/api/sequences")
      if (response.ok) {
        const data = await response.json()
        setSequences((data.sequences || []).map((s: any) => ({ id: s.id, name: s.name })))
      }
    } catch (error) {
      console.error("Error loading sequences:", error)
    }
  }

  // Debounced server-side search — replaces the prospect list with filtered results
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!searchTerm.trim()) {
      loadProspects(1, false)
      return
    }
    setSearchLoading(true)
    setProspects([])
    searchTimerRef.current = setTimeout(() => loadProspects(1, false, searchTerm.trim()), 300)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [searchTerm])

  const loadProspects = async (loadPage = 1, append = false, search?: string) => {
    try {
      if (!append) setLoading(true)
      const params = new URLSearchParams({ page: String(loadPage), pageSize: String(pageSize) })
      if (search) params.set("search", search)
      const response = await fetch(`/api/prospects?${params}`)
      if (!response.ok) throw new Error("Failed to load prospects")
      const data = await response.json()
      if (append) {
        setProspects((prev) => [...prev, ...data.prospects])
      } else {
        setProspects(data.prospects)
      }
      setTotalCount(data.totalCount || 0)
      setPage(loadPage)
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to load prospects", variant: "destructive" })
    } finally {
      setLoading(false)
      setSearchLoading(false)
    }
  }

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    setSelectedRows((prev) => (prev.length === prospects.length ? [] : prospects.map((p) => p.id)))
  }

  const filteredProspects = prospects.filter(
    (prospect) =>
      selectedSequence === "" || selectedSequence === "all" || prospect.sequence === sequences.find((s) => s.id === selectedSequence)?.name,
  )

  const handleAction = (action: string, name: string) => {
    toast({
      title: action,
      description: `${action} for ${name}...`,
    })
  }

  const handleEditProspect = (prospect: Prospect) => {
    setEditingProspect(prospect)
    setEditDialogOpen(true)
  }

  const handleCallProspect = (prospect: Prospect) => {
    setCallingProspect(prospect)
    setCallDialogOpen(true)
  }

  const startQuickEdit = (prospect: Prospect) => {
    setQuickEditId(prospect.id)
    setQuickEditData({
      email: prospect.email,
      phone: prospect.phone || "",
    })
  }

  const cancelQuickEdit = () => {
    setQuickEditId(null)
    setQuickEditData({ email: "", phone: "" })
  }

  const saveQuickEdit = async (prospectId: string) => {
    if (!quickEditData.email.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      })
      return
    }

    try {
      setQuickEditSaving(true)

      // Optimistic update
      const originalProspects = [...prospects]
      setProspects(prospects.map(p =>
        p.id === prospectId
          ? { ...p, email: quickEditData.email, phone: quickEditData.phone || null }
          : p
      ))
      setQuickEditId(null)

      const response = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: quickEditData.email,
          phone: quickEditData.phone || null,
        }),
      })

      if (!response.ok) {
        // Rollback on error
        setProspects(originalProspects)
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update prospect")
      }

      toast({
        title: "Updated",
        description: "Contact info saved",
      })
    } catch (error: any) {
      console.error("Error updating prospect:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update prospect",
        variant: "destructive",
      })
    } finally {
      setQuickEditSaving(false)
      setQuickEditData({ email: "", phone: "" })
    }
  }

  const formatLastActivity = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return "Recently"
    }
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
        deleteTarget.ids.map((id) =>
          fetch(`/api/prospects/${id}`, { method: "DELETE" })
        )
      )

      const failed = results.filter((r) => !r.ok).length
      if (failed > 0) {
        toast({
          title: "Error",
          description: `Failed to delete ${failed} prospect${failed > 1 ? "s" : ""}`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Deleted",
          description: `${deleteTarget.ids.length === 1 ? deleteTarget.label : `${deleteTarget.ids.length} prospects`} deleted`,
        })
      }

      setSelectedRows((prev) => prev.filter((id) => !deleteTarget.ids.includes(id)))
      setProspects((prev) => prev.filter((p) => !deleteTarget.ids.includes(p.id)))
    } catch (error) {
      console.error("Error deleting prospects:", error)
      toast({
        title: "Error",
        description: "Failed to delete prospects",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading prospects...</div>
  }

  return (
    <div className="space-y-4">
      {user?.tier === 'trial' && user?.role !== 'super_admin' && (
        <TrialLimitBanner current={totalCount} limit={TRIAL_LIMITS.prospects} resourceLabel="prospects" />
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Input
            placeholder="Search prospects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            className="max-w-sm pr-8"
          />
          {searchLoading && (
            <Loader2 className="h-3.5 w-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedRows.length > 0 ? (
            <>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {selectedRows.length} selected
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSequenceDialogOpen(true)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Add to Sequence
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => confirmDelete(selectedRows, `${selectedRows.length} prospects`)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedRows([])}
              >
                Clear
              </Button>
            </>
          ) : (
            <>
              <Select value={selectedSequence} onValueChange={setSelectedSequence}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by sequence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sequences</SelectItem>
                  {sequences.map((sequence) => (
                    <SelectItem key={sequence.id} value={sequence.id}>
                      {sequence.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Prospect
              </Button>
            </>
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox checked={selectedRows.length === prospects.length} onCheckedChange={toggleAll} />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sequence</TableHead>
            <TableHead>Sequence Step</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProspects.map((prospect) => (
            <TableRow
              key={prospect.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/prospects/${prospect.id}`)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={selectedRows.includes(prospect.id)} onCheckedChange={() => toggleRow(prospect.id)} />
              </TableCell>
              <TableCell>
                <span className="font-medium">{prospect.name}</span>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Popover open={quickEditId === prospect.id} onOpenChange={(open) => !open && cancelQuickEdit()}>
                  <PopoverTrigger asChild>
                    <button
                      className="flex flex-col text-left hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors group"
                      onClick={() => startQuickEdit(prospect)}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{prospect.email}</span>
                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </div>
                      {prospect.phone && (
                        <span className="text-xs text-muted-foreground">{prospect.phone}</span>
                      )}
                      {!prospect.phone && (
                        <span className="text-xs text-muted-foreground/50 italic">+ Add phone</span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="start">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`email-${prospect.id}`} className="text-xs">Email</Label>
                        <Input
                          id={`email-${prospect.id}`}
                          type="email"
                          value={quickEditData.email}
                          onChange={(e) => setQuickEditData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@company.com"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`phone-${prospect.id}`} className="text-xs">Phone</Label>
                        <Input
                          id={`phone-${prospect.id}`}
                          type="tel"
                          value={quickEditData.phone}
                          onChange={(e) => setQuickEditData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+1 (555) 123-4567"
                          className="h-8"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelQuickEdit}
                          disabled={quickEditSaving}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveQuickEdit(prospect.id)}
                          disabled={quickEditSaving}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {quickEditSaving ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </TableCell>
              <TableCell>{prospect.title || "—"}</TableCell>
              <TableCell>{prospect.company || "—"}</TableCell>
              <TableCell>
                <Badge variant="outline">{prospect.status.replace(/_/g, " ")}</Badge>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Select defaultValue={prospect.sequence || ""}>
                  <SelectTrigger className="h-8 w-[180px]">
                    <SelectValue>{prospect.sequence || "No sequence"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {sequences.map((sequence) => (
                      <SelectItem key={sequence.id} value={sequence.name}>
                        {sequence.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="whitespace-nowrap">
                    {prospect.sequenceStep || "Not started"}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>{formatLastActivity(prospect.lastActivity)}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  {prospect.linkedin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(prospect.linkedin!, '_blank')}
                      title="View LinkedIn"
                    >
                      <Linkedin className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleCallProspect(prospect)} title="Call prospect">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleAction("Composing Email", prospect.name)}>
                    <Mail className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditProspect(prospect)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => confirmDelete([prospect.id], prospect.name)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!searchTerm.trim() && prospects.length < totalCount && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => loadProspects(page + 1, true)}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Load more ({prospects.length} of {totalCount})
          </button>
        </div>
      )}
      <UploadProspectsDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={loadProspects}
      />
      <AddProspectDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onProspectAdded={loadProspects}
      />
      <EditProspectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        prospect={editingProspect}
        onProspectUpdated={loadProspects}
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
        prospectName={selectedRows.length === 1
          ? prospects.find(p => p.id === selectedRows[0])?.name || "Prospect"
          : `${selectedRows.length} prospects`
        }
        onSequenceAdded={() => {
          setSelectedRows([])
          loadProspects()
        }}
      />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.ids.length === 1 ? "prospect" : "prospects"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.label}? This will also remove their calls, emails, and sequence data. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
