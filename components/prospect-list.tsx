"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Mail, MoreHorizontal, Phone, Filter, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

const prospects = [
  {
    id: 1,
    name: "John Doe",
    email: "john@company.com",
    title: "CEO",
    company: "Tech Corp",
    status: "In Sequence",
    sequence: "Enterprise Outreach",
    sequenceStep: "Step 2: Follow-up Email",
    lastActivity: "2 days ago",
  },
  {
    id: 2,
    name: "Sarah Smith",
    email: "sarah@startup.com",
    title: "CTO",
    company: "Startup Inc",
    status: "New Lead",
    sequence: "SMB Follow-up",
    sequenceStep: "Step 1: Introduction Email",
    lastActivity: "1 day ago",
  },
  {
    id: 3,
    name: "Michael Johnson",
    email: "michael@enterprise.com",
    title: "Sales Director",
    company: "Enterprise Co",
    status: "Contacted",
    sequence: "Sales Leaders",
    sequenceStep: "Step 3: Demo Request",
    lastActivity: "5 hours ago",
  },
  {
    id: 4,
    name: "Emily Brown",
    email: "emily@innovate.com",
    title: "VP Marketing",
    company: "Innovate LLC",
    status: "Meeting Scheduled",
    sequence: "Product Demo Request",
    sequenceStep: "Step 4: Meeting Confirmation",
    lastActivity: "Just now",
  },
  {
    id: 5,
    name: "David Wilson",
    email: "david@global.com",
    title: "Operations Manager",
    company: "Global Industries",
    status: "In Sequence",
    sequence: "New Lead Welcome",
    sequenceStep: "Step 2: Follow-up Call",
    lastActivity: "3 days ago",
  },
]

// Available sequences
const sequences = [
  { id: "enterprise-outreach", name: "Enterprise Outreach" },
  { id: "smb-follow-up", name: "SMB Follow-up" },
  { id: "sales-leaders", name: "Sales Leaders" },
  { id: "product-demo", name: "Product Demo Request" },
  { id: "new-lead", name: "New Lead Welcome" },
]

export function ProspectList() {
  const { toast } = useToast()
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSequence, setSelectedSequence] = useState<string>("")

  const toggleRow = (id: number) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    setSelectedRows((prev) => (prev.length === prospects.length ? [] : prospects.map((p) => p.id)))
  }

  const filteredProspects = prospects.filter(
    (prospect) =>
      (prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prospect.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prospect.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedSequence === "" || prospect.sequence === sequences.find((s) => s.id === selectedSequence)?.name),
  )

  const handleAction = (action: string, name: string) => {
    toast({
      title: action,
      description: `${action} for ${name}...`,
    })
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
          <Button>Add to Sequence</Button>
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
            <TableRow key={prospect.id}>
              <TableCell>
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
              <TableCell>{prospect.title}</TableCell>
              <TableCell>{prospect.company}</TableCell>
              <TableCell>
                <Badge variant="outline">{prospect.status}</Badge>
              </TableCell>
              <TableCell>
                <Select defaultValue={prospect.sequence}>
                  <SelectTrigger className="h-8 w-[180px]">
                    <SelectValue>{prospect.sequence}</SelectValue>
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
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="whitespace-nowrap">
                    {prospect.sequenceStep}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>{prospect.lastActivity}</TableCell>
              <TableCell>
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
    </div>
  )
}
