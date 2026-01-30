"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Filter, ChevronDown, ChevronUp, Users, Globe, Upload, Plus, Sparkles, TrendingUp, DollarSign, Wrench, Briefcase, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"
import { UploadAccountsDialog } from "./upload-accounts-dialog"
import { AddAccountDialog } from "./add-account-dialog"

type Account = {
  id: string
  name: string
  industry?: string | null
  location?: string | null
  website?: string | null
  employees?: number | null
  status: string
  sequence?: string | null
  sequenceStep?: string | null
  lastActivity: string
  contacts: number
}

type CompanyInsights = {
  growth: string | null
  funding: string | null
  techStack: string | null
  hiring: string | null
}

// Available sequences
const sequences = [
  { id: "enterprise-outreach", name: "Enterprise Outreach" },
  { id: "smb-follow-up", name: "SMB Follow-up" },
  { id: "sales-leaders", name: "Sales Leaders" },
  { id: "product-demo", name: "Product Demo Request" },
  { id: "new-lead", name: "New Lead Welcome" },
]

export function AccountList() {
  const router = useRouter()
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSequence, setSelectedSequence] = useState<string>("")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [insights, setInsights] = useState<Record<string, CompanyInsights>>({})
  const [loadingInsights, setLoadingInsights] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/accounts")
      if (!response.ok) {
        throw new Error("Failed to load accounts")
      }
      const data = await response.json()
      setAccounts(data.accounts)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to load accounts",
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
    setSelectedRows((prev) => (prev.length === accounts.length ? [] : accounts.map((a) => a.id)))
  }

  const filteredAccounts = accounts.filter(
    (account) =>
      (account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (account.industry?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (account.location?.toLowerCase() || "").includes(searchTerm.toLowerCase())) &&
      (selectedSequence === "" || account.sequence === sequences.find((s) => s.id === selectedSequence)?.name),
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

  const toggleExpanded = async (accountId: string) => {
    const newExpandedRows = new Set(expandedRows)

    if (newExpandedRows.has(accountId)) {
      newExpandedRows.delete(accountId)
    } else {
      newExpandedRows.add(accountId)
      // Fetch insights if not already loaded
      if (!insights[accountId]) {
        await fetchInsights(accountId)
      }
    }

    setExpandedRows(newExpandedRows)
  }

  const fetchInsights = async (accountId: string, force: boolean = false) => {
    try {
      setLoadingInsights(prev => new Set(prev).add(accountId))

      const url = force
        ? `/api/accounts/${accountId}/insights?force=true`
        : `/api/accounts/${accountId}/insights`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch insights')
      }

      const data = await response.json()

      setInsights(prev => ({
        ...prev,
        [accountId]: data.insights,
      }))
    } catch (error) {
      console.error('Error fetching insights:', error)
      toast({
        title: "Error",
        description: "Failed to load company insights",
        variant: "destructive",
      })
    } finally {
      setLoadingInsights(prev => {
        const newSet = new Set(prev)
        newSet.delete(accountId)
        return newSet
      })
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading accounts...</div>
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
          <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload CSV
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Button>
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
            <>
              <TableRow key={account.id}>
                <TableCell>
                  <Checkbox checked={selectedRows.includes(account.id)} onCheckedChange={() => toggleRow(account.id)} />
                </TableCell>
                <TableCell>
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => router.push(`/accounts/${account.id}`)}
                  >
                    <Avatar className="h-8 w-8 bg-primary/10">
                      <AvatarFallback className="text-primary">
                        {account.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium hover:text-primary">{account.name}</span>
                      <span className="text-sm text-muted-foreground">{account.website}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{account.industry || "—"}</TableCell>
                <TableCell>{account.location || "—"}</TableCell>
                <TableCell>{account.employees?.toLocaleString() || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{account.status.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell>
                  <Select defaultValue={account.sequence || ""}>
                    <SelectTrigger className="h-8 w-[180px]">
                      <SelectValue>{account.sequence || "No sequence"}</SelectValue>
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
                      {account.sequenceStep || "Not started"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleExpanded(account.id)}
                    >
                      {expandedRows.has(account.id) ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{formatLastActivity(account.lastActivity)}</TableCell>
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

              {/* Expanded Insights Row */}
              {expandedRows.has(account.id) && (
                <TableRow key={`${account.id}-insights`}>
                  <TableCell colSpan={10} className="bg-muted/30 p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">Company Insights</h3>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchInsights(account.id, true)}
                          disabled={loadingInsights.has(account.id)}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${loadingInsights.has(account.id) ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>

                      {loadingInsights.has(account.id) ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Fetching latest company insights...</span>
                          </div>
                        </div>
                      ) : insights[account.id] ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {insights[account.id].growth && (
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                              <div>
                                <div className="font-medium mb-1">Growth signals</div>
                                <div className="text-sm text-muted-foreground">
                                  {insights[account.id].growth}
                                </div>
                              </div>
                            </div>
                          )}

                          {insights[account.id].funding && (
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                              <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                              <div>
                                <div className="font-medium mb-1">Funding</div>
                                <div className="text-sm text-muted-foreground">
                                  {insights[account.id].funding}
                                </div>
                              </div>
                            </div>
                          )}

                          {insights[account.id].techStack && (
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                              <Wrench className="h-5 w-5 text-primary mt-0.5" />
                              <div>
                                <div className="font-medium mb-1">Tech stack</div>
                                <div className="text-sm text-muted-foreground">
                                  {insights[account.id].techStack}
                                </div>
                              </div>
                            </div>
                          )}

                          {insights[account.id].hiring && (
                            <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                              <Briefcase className="h-5 w-5 text-primary mt-0.5" />
                              <div>
                                <div className="font-medium mb-1">Hiring</div>
                                <div className="text-sm text-muted-foreground">
                                  {insights[account.id].hiring}
                                </div>
                              </div>
                            </div>
                          )}

                          {!insights[account.id].growth &&
                            !insights[account.id].funding &&
                            !insights[account.id].techStack &&
                            !insights[account.id].hiring && (
                              <div className="col-span-2 text-center py-8 text-muted-foreground">
                                No recent insights found for this company
                              </div>
                            )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Click to load company insights
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
      <UploadAccountsDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={loadAccounts}
      />
      <AddAccountDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAccountAdded={loadAccounts}
      />
    </div>
  )
}
