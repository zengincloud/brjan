"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Building2, Phone, Mail, ArrowLeft, Users, Eye, MoreVertical, Trash2 } from "lucide-react"
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
import { toast } from "sonner"
import { format } from "date-fns"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BRLoader } from "@/components/ui/br-loader"

type AdminUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  tier: string
  creditsUsed: number
  createdAt: string
  organization: { id: string; name: string } | null
  _count: { calls: number; emails: number; prospects: number }
}

const TIER_CREDITS: Record<string, number> = {
  trial: 25,
  starter: 100,
  pro: 500,
  pro_max: 1000,
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const router = useRouter()

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (res.status === 403) { window.location.href = "/"; return }
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to update role")
        return
      }
      toast.success("Role updated")
      loadUsers()
    } catch {
      toast.error("Failed to update role")
    }
  }

  const handleImpersonate = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to impersonate")
        return
      }
      toast.success("Now viewing as this user")
      window.location.href = "/"
    } catch {
      toast.error("Failed to impersonate")
    }
  }

  const handleTierChange = async (userId: string, newTier: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier: newTier }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to update tier")
        return
      }
      toast.success("Tier updated — credits reset")
      loadUsers()
    } catch {
      toast.error("Failed to update tier")
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/users?userId=${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to delete user")
        return
      }
      toast.success("User permanently deleted")
      setDeleteTarget(null)
      loadUsers()
    } catch {
      toast.error("Failed to delete user")
    }
  }

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      u.organization?.name.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const getInitials = (u: AdminUser) => {
    if (u.firstName && u.lastName) return `${u.firstName[0]}${u.lastName[0]}`
    if (u.firstName) return u.firstName[0]
    return u.email[0].toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 4rem)' }}>
        <BRLoader />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-muted-foreground">Manage all platform users</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or org..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="member">Member</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No users match your search
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{getInitials(u)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.organization ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {u.organization.name}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No org</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(val) => handleRoleChange(u.id, val)}
                      >
                        <SelectTrigger className="w-[130px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {u.role === "super_admin" ? (
                        <Badge variant="outline" className="text-xs">Unlimited</Badge>
                      ) : (
                        <Select
                          value={u.tier}
                          onValueChange={(val) => handleTierChange(u.id, val)}
                        >
                          <SelectTrigger className="w-[110px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="pro_max">Pro Max</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.role === "super_admin" ? (
                        <span className="text-xs text-muted-foreground">&infin;</span>
                      ) : (
                        <Badge variant="outline" className="text-xs font-mono">
                          {u.creditsUsed}/{TIER_CREDITS[u.tier] || 0}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />{u._count.calls}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />{u._count.emails}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />{u._count.prospects}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(u.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {u.role !== "super_admin" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleImpersonate(u.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Impersonate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.firstName || deleteTarget?.email}</strong> and all their data (prospects, calls, emails, tasks, sequences). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
