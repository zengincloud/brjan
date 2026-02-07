"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Mail, Pencil, Phone, Filter, ChevronDown, Upload, Plus, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"
import { UploadProspectsDialog } from "./upload-prospects-dialog"
import { AddProspectDialog } from "./add-prospect-dialog"
import { EditProspectDialog } from "./edit-prospect-dialog"
import { CallProspectDialog } from "./call-prospect-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"

type Prospect = {
  id: string
  name: string
  email: string
  title?: string | null
  company?: string | null
  phone?: string | null
  status: string
  sequence?: string | null
  sequenceStep?: string | null
  lastActivity: string
}

// Available sequences
const sequences = [
  { id: "enterprise-outreach", name: "Enterprise Outreach" },
  { id: "smb-follow-up", name: "SMB Follow-up" },
  { id: "sales-leaders", name: "Sales Leaders" },
  { id: "product-demo", name: "Product Demo Request" },
  { id: "new-lead", name: "New Lead Welcome" },
]

export function ProspectList() {
  const router = useRouter()
  const { toast } = useToast()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSequence, setSelectedSequence] = useState<string>("")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null)
  const [callDialogOpen, setCallDialogOpen] = useState(false)
  const [callingProspect, setCallingProspect] = useState<Prospect | null>(null)
  const [quickEditId, setQuickEditId] = useState<string | null>(null)
  const [quickEditData, setQuickEditData] = useState({ email: "", phone: "" })
  const [quickEditSaving, setQuickEditSaving] = useState(false)

  useEffect(() => {
    loadProspects()
  }, [])

  const loadProspects = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/prospects")
      if (!response.ok) {
        throw new Error("Failed to load prospects")
      }
      const data = await response.json()
      setProspects(data.prospects)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to load prospects",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
      (prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prospect.company?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        prospect.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedSequence === "" || prospect.sequence === sequences.find((s) => s.id === selectedSequence)?.name),
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

  if (loading) {
    return <div className="text-center py-8">Loading prospects...</div>
  }

  return (
    <div className="space-y-4">
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
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
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
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            More Filters
          </Button>
          <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload CSV
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Prospect
          </Button>
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
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`/placeholder.svg?height=32&width=32`} />
                    <AvatarFallback>
                      {prospect.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{prospect.name}</span>
                </div>
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
                  <Button variant="ghost" size="icon" onClick={() => handleCallProspect(prospect)} title="Call prospect">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleAction("Composing Email", prospect.name)}>
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEditProspect(prospect)} title="Edit all details">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
    </div>
  )
}
