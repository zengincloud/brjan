"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Filter, Users, Globe, Upload, Plus, Pencil, Trash2, FolderInput, ExternalLink, Linkedin, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"
import { UploadAccountsDialog } from "./upload-accounts-dialog"
import { AddAccountDialog } from "./add-account-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

type Account = {
  id: string
  name: string
  industry?: string | null
  location?: string | null
  website?: string | null
  linkedin?: string | null
  employees?: number | null
  status: string
  sequence?: string | null
  sequenceStep?: string | null
  lastActivity: string
  contacts: number
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!searchTerm.trim()) {
      loadAccounts(1, false)
      return
    }
    setSearchLoading(true)
    setAccounts([])
    searchTimerRef.current = setTimeout(() => loadAccounts(1, false, searchTerm.trim()), 300)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [searchTerm])

  const loadAccounts = async (loadPage = 1, append = false, search?: string) => {
    try {
      if (!append) setLoading(true)
      const params = new URLSearchParams({ page: String(loadPage), pageSize: String(pageSize) })
      if (search) params.set("search", search)
      const response = await fetch(`/api/accounts?${params}`)
      if (!response.ok) throw new Error("Failed to load accounts")
      const data = await response.json()
      if (append) {
        setAccounts((prev) => [...prev, ...data.accounts])
      } else {
        setAccounts(data.accounts)
      }
      setTotalCount(data.totalCount || 0)
      setPage(loadPage)
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to load accounts", variant: "destructive" })
    } finally {
      setLoading(false)
      setSearchLoading(false)
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
      selectedSequence === "" || account.sequence === sequences.find((s) => s.id === selectedSequence)?.name,
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

  const handleDelete = async () => {
    if (!accountToDelete) return

    try {
      const response = await fetch(`/api/accounts/${accountToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete account')
      }

      toast({
        title: "Account deleted",
        description: `${accountToDelete.name} has been deleted successfully.`,
      })

      // Reload accounts
      await loadAccounts()
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
    }
  }

  const handleChangeStatus = async (accountId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      toast({
        title: "Status updated",
        description: "Account status has been updated successfully.",
      })

      // Reload accounts
      await loadAccounts()
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "Error",
        description: "Failed to update account status",
        variant: "destructive",
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
            <TableHead>Last Activity</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAccounts.map((account) => (
            <>
              <TableRow
                key={account.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/accounts/${account.id}`)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
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
                      <span className="font-medium flex items-center gap-1.5">
                        {account.name}
                        {account.linkedin && (
                          <a
                            href={account.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="View LinkedIn"
                          >
                            <Linkedin className="h-4 w-4 text-[#0A66C2] hover:opacity-80 transition-opacity" />
                          </a>
                        )}
                      </span>
                      {account.website ? (
                        <a
                          href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {account.website}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{account.industry || "—"}</TableCell>
                <TableCell>{account.location || "—"}</TableCell>
                <TableCell>{account.employees?.toLocaleString() || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{account.status.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell>{formatLastActivity(account.lastActivity)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/accounts/${account.id}`)}
                      title="View Details"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/accounts/${account.id}`)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleChangeStatus(account.id, 'qualified')}>
                          <FolderInput className="mr-2 h-4 w-4" />
                          Mark as Qualified
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeStatus(account.id, 'customer')}>
                          <FolderInput className="mr-2 h-4 w-4" />
                          Mark as Customer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setAccountToDelete(account)
                            setDeleteDialogOpen(true)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>

            </>
          ))}
        </TableBody>
      </Table>
      {!searchTerm.trim() && accounts.length < totalCount && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => loadAccounts(page + 1, true)}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Load more ({accounts.length} of {totalCount})
          </button>
        </div>
      )}
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {accountToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
