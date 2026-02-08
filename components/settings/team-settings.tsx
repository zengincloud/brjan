"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { UserPlus, Phone, Mail, Users, Trash2 } from "lucide-react"
import { InviteDialog } from "@/components/invite-dialog"
import { toast } from "sonner"
import { format } from "date-fns"

type TeamMember = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  role: string
  createdAt: string
  _count: {
    calls: number
    emails: number
    prospects: number
  }
}

type Invitation = {
  id: string
  email: string
  role: string
  status: string
  createdAt: string
  invitedBy: { firstName: string | null; email: string }
}

export function TeamSettings() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [teamRes, invitesRes, userRes] = await Promise.all([
        fetch("/api/team"),
        fetch("/api/invitations"),
        fetch("/api/auth/user"),
      ])

      if (teamRes.ok) {
        const teamData = await teamRes.json()
        setMembers(teamData.members || [])
      }
      if (invitesRes.ok) {
        const inviteData = await invitesRes.json()
        setInvitations(inviteData.invitations?.filter((i: Invitation) => i.status === "pending") || [])
      }
      if (userRes.ok) {
        const userData = await userRes.json()
        setCurrentUser(userData.user)
      }
    } catch (error) {
      console.error("Error loading team data:", error)
    } finally {
      setLoading(false)
    }
  }

  const canManage = currentUser?.role === "owner" || currentUser?.role === "manager" || currentUser?.role === "super_admin"

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/team/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to update role")
        return
      }
      toast.success("Role updated")
      loadData()
    } catch {
      toast.error("Failed to update role")
    }
  }

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return
    try {
      const res = await fetch(`/api/team/${userId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to remove member")
        return
      }
      toast.success("Member removed")
      loadData()
    } catch {
      toast.error("Failed to remove member")
    }
  }

  const getInitials = (member: TeamMember) => {
    if (member.firstName && member.lastName) return `${member.firstName[0]}${member.lastName[0]}`
    if (member.firstName) return member.firstName[0]
    return member.email[0].toUpperCase()
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      super_admin: "default",
      owner: "default",
      manager: "secondary",
      member: "outline",
    }
    return (
      <Badge variant={variants[role] || "outline"} className="capitalize text-xs">
        {role.replace("_", " ")}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members ({members.length})
            </CardTitle>
            <CardDescription>Manage your organization&apos;s team</CardDescription>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Joined</TableHead>
                {canManage && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getInitials(member)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.firstName} {member.lastName}
                          {member.id === currentUser?.id && (
                            <span className="text-muted-foreground ml-1">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canManage && member.id !== currentUser?.id && member.role !== "super_admin" ? (
                      <Select
                        value={member.role}
                        onValueChange={(val) => handleRoleChange(member.id, val)}
                      >
                        <SelectTrigger className="w-[120px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      getRoleBadge(member.role)
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {member._count.calls}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member._count.emails}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(member.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      {member.id !== currentUser?.id && member.role !== "super_admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id, member.firstName || member.email)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {canManage && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Invitations ({invitations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitations.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited {format(new Date(invite.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">{invite.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInviteSent={loadData}
      />
    </div>
  )
}
