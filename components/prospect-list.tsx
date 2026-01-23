"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Mail, MoreHorizontal, Phone, Filter, ChevronDown, Upload, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"
import { UploadProspectsDialog } from "./upload-prospects-dialog"
import { AddProspectDialog } from "./add-prospect-dialog"

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
                  <div className="flex flex-col">
                    <span className="font-medium">{prospect.name}</span>
                    <span className="text-sm text-muted-foreground">{prospect.email}</span>
                  </div>
                </div>
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
                  <Button variant="ghost" size="icon" onClick={() => handleAction("Calling", prospect.name)}>
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleAction("Composing Email", prospect.name)}>
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleAction("More Options", prospect.name)}>
                    <MoreHorizontal className="h-4 w-4" />
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
    </div>
  )
}
