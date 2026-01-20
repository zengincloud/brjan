"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Filter, ChevronDown, Users, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

const accounts = [
  {
    id: 1,
    name: "Tech Corp",
    industry: "Technology",
    location: "San Francisco, CA",
    website: "techcorp.com",
    employees: 250,
    status: "In Sequence",
    sequence: "Enterprise Outreach",
    sequenceStep: "Step 2: Follow-up Email",
    lastActivity: "2 days ago",
    contacts: 12,
  },
  {
    id: 2,
    name: "Startup Inc",
    industry: "Software",
    location: "New York, NY",
    website: "startupinc.com",
    employees: 85,
    status: "New Lead",
    sequence: "SMB Follow-up",
    sequenceStep: "Step 1: Introduction Email",
    lastActivity: "1 day ago",
    contacts: 8,
  },
  {
    id: 3,
    name: "Enterprise Co",
    industry: "Finance",
    location: "Chicago, IL",
    website: "enterpriseco.com",
    employees: 1200,
    status: "Contacted",
    sequence: "Sales Leaders",
    sequenceStep: "Step 3: Demo Request",
    lastActivity: "5 hours ago",
    contacts: 15,
  },
  {
    id: 4,
    name: "Innovate LLC",
    industry: "Healthcare",
    location: "Boston, MA",
    website: "innovatellc.com",
    employees: 320,
    status: "Meeting Scheduled",
    sequence: "Product Demo Request",
    sequenceStep: "Step 4: Meeting Confirmation",
    lastActivity: "Just now",
    contacts: 9,
  },
  {
    id: 5,
    name: "Global Industries",
    industry: "Manufacturing",
    location: "Detroit, MI",
    website: "globalindustries.com",
    employees: 750,
    status: "In Sequence",
    sequence: "New Lead Welcome",
    sequenceStep: "Step 2: Follow-up Call",
    lastActivity: "3 days ago",
    contacts: 18,
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

export function AccountList() {
  const { toast } = useToast()
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSequence, setSelectedSequence] = useState<string>("")

  const toggleRow = (id: number) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    setSelectedRows((prev) => (prev.length === accounts.length ? [] : accounts.map((a) => a.id)))
  }

  const filteredAccounts = accounts.filter(
    (account) =>
      (account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.location.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedSequence === "" || account.sequence === sequences.find((s) => s.id === selectedSequence)?.name),
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
            placeholder="Search accounts..."
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
              <Checkbox checked={selectedRows.length === accounts.length} onCheckedChange={toggleAll} />
            </TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Employees</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sequence</TableHead>
            <TableHead>Sequence Step</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAccounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell>
                <Checkbox checked={selectedRows.includes(account.id)} onCheckedChange={() => toggleRow(account.id)} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 bg-primary/10">
                    <AvatarFallback className="text-primary">
                      {account.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{account.name}</span>
                    <span className="text-sm text-muted-foreground">{account.website}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>{account.industry}</TableCell>
              <TableCell>{account.location}</TableCell>
              <TableCell>{account.employees.toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant="outline">{account.status}</Badge>
              </TableCell>
              <TableCell>
                <Select defaultValue={account.sequence}>
                  <SelectTrigger className="h-8 w-[180px]">
                    <SelectValue>{account.sequence}</SelectValue>
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
                    {account.sequenceStep}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>{account.lastActivity}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleAction("View Contacts", account.name)}>
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleAction("Visit Website", account.name)}>
                    <Globe className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleAction("More Options", account.name)}>
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
