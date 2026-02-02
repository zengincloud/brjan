"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Loader2, Mail, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

type Prospect = {
  id: string
  name: string
  email: string
  phone?: string | null
  title?: string | null
  company?: string | null
}

export function SendEmailDialog({
  open,
  onOpenChange,
  prospect,
  onEmailSent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  prospect: Prospect | null
  onEmailSent?: () => void
}) {
  const [sending, setSending] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null)
  const [senderEmail, setSenderEmail] = useState<string>("")

  // Check Gmail connection status on mount
  useEffect(() => {
    const checkGmailStatus = async () => {
      try {
        const response = await fetch("/api/integrations/gmail/status")
        if (response.ok) {
          const data = await response.json()
          setGmailConnected(data.connected && data.integration?.isActive)
          if (data.integration?.email) {
            setSenderEmail(data.integration.email)
          }
        }
      } catch (error) {
        console.error("Failed to check Gmail status:", error)
      }
    }

    if (open) {
      checkGmailStatus()
    }
  }, [open])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSubject("")
        setBody("")
      }, 300)
    }
  }, [open])

  const handleSend = async () => {
    if (!prospect?.email) {
      toast.error("No email address available for this prospect")
      return
    }

    if (!subject.trim()) {
      toast.error("Please enter a subject")
      return
    }

    if (!body.trim()) {
      toast.error("Please enter a message")
      return
    }

    setSending(true)

    try {
      const response = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: prospect.email,
          subject,
          bodyText: body,
          bodyHtml: `<p>${body.replace(/\n/g, "<br>")}</p>`,
          prospectId: prospect.id,
          emailType: "one_off",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to send email")
      }

      toast.success(`Email sent to ${prospect.name}`, {
        description: data.sentVia === "gmail" ? "Sent from your Gmail" : "Sent via shared sender",
      })

      onEmailSent?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error sending email:", error)
      toast.error(error.message || "Failed to send email")
    } finally {
      setSending(false)
    }
  }

  if (!prospect) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {prospect.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold">{prospect.name}</div>
              <div className="text-sm text-muted-foreground">{prospect.email}</div>
            </div>
            {gmailConnected !== null && (
              <Badge
                variant={gmailConnected ? "default" : "secondary"}
                className={gmailConnected ? "bg-green-500/10 text-green-600 border-green-500/30" : ""}
              >
                {gmailConnected ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    From: {senderEmail}
                  </>
                ) : (
                  "Shared sender"
                )}
              </Badge>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              placeholder="Write your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
