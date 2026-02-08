"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Plus, Search, Users, Send, ArrowLeft } from "lucide-react"
import { InviteDialog } from "@/components/invite-dialog"
import { toast } from "sonner"
import { format } from "date-fns"
import Link from "next/link"

type Organization = {
  id: string
  name: string
  industry: string | null
  website: string | null
  createdAt: string
  _count: { users: number }
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [newOrgName, setNewOrgName] = useState("")
  const [newOrgIndustry, setNewOrgIndustry] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadOrgs() }, [])

  const loadOrgs = async () => {
    try {
      const res = await fetch("/api/admin/organizations")
      if (res.status === 403) { window.location.href = "/"; return }
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setOrgs(data.organizations || [])
    } catch (error) {
      console.error("Error loading organizations:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newOrgName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName, industry: newOrgIndustry || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to create")
        return
      }
      toast.success("Organization created")
      setNewOrgName("")
      setNewOrgIndustry("")
      setCreateOpen(false)
      loadOrgs()
    } catch {
      toast.error("Failed to create organization")
    } finally {
      setCreating(false)
    }
  }

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.industry?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-10 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
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
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">Manage all organizations on the platform</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {search ? "No organizations match your search" : "No organizations yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{org.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{org.industry || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {org._count.users}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(org.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setSelectedOrg(org); setInviteOpen(true) }}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Invite
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Organization Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input
                placeholder="Acme Corp"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label>Industry (optional)</Label>
              <Input
                placeholder="SaaS, Finance, etc."
                value={newOrgIndustry}
                onChange={(e) => setNewOrgIndustry(e.target.value)}
              />
            </div>
            <Button onClick={handleCreate} disabled={!newOrgName.trim() || creating} className="w-full">
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        organizationId={selectedOrg?.id}
        organizationName={selectedOrg?.name}
        onInviteSent={loadOrgs}
      />
    </div>
  )
}
