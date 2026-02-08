"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Send } from "lucide-react"
import { toast } from "sonner"

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId?: string
  organizationName?: string
  onInviteSent?: () => void
}

export function InviteDialog({ open, onOpenChange, organizationId, organizationName, onInviteSent }: InviteDialogProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!email.trim()) return

    setSending(true)
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          role,
          ...(organizationId ? { organizationId } : {}),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to send invitation")
        return
      }

      toast.success(`Invitation sent to ${email}`)
      setEmail("")
      setRole("member")
      onOpenChange(false)
      onInviteSent?.()
    } catch (error) {
      toast.error("Failed to send invitation")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join{organizationName ? ` ${organizationName}` : " your team"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSend} disabled={!email.trim() || sending} className="w-full">
            {sending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
