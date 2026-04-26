"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Send, Loader2, Mail, CheckCircle2, FileText, Clock, Braces } from "lucide-react"
import { toast } from "sonner"
import { replaceEmailVariables, TEMPLATE_VARIABLES } from "@/lib/template-variables"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Prospect = {
  id: string
  name: string
  email: string
  phone?: string | null
  title?: string | null
  company?: string | null
}

type EmailTemplate = {
  id: string
  name: string
  subject: string
  body: string
  category: string
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
  const [saving, setSaving] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null)
  const [senderEmail, setSenderEmail] = useState<string>("")
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Check Gmail connection status and load templates on mount
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

    const loadTemplates = async () => {
      setLoadingTemplates(true)
      try {
        const response = await fetch("/api/email-templates")
        if (response.ok) {
          const data = await response.json()
          setTemplates(data.templates || [])
        }
      } catch (error) {
        console.error("Failed to load templates:", error)
      } finally {
        setLoadingTemplates(false)
      }
    }

    if (open) {
      checkGmailStatus()
      loadTemplates()
    }
  }, [open])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSubject("")
        setBody("")
        setSelectedTemplate("")
      }, 300)
    }
  }, [open])

  // Replace template variables with prospect data
  const replaceVariables = (text: string): string => {
    if (!prospect) return text
    return replaceEmailVariables(text, prospect)
  }

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)

    if (templateId === "blank") {
      setSubject("")
      setBody("")
      return
    }

    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setSubject(replaceVariables(template.subject))
      setBody(replaceVariables(template.body))
    }
  }

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
      // Replace any remaining template variables before sending
      const finalSubject = replaceVariables(subject)
      const finalBody = replaceVariables(body)

      const response = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: prospect.email,
          subject: finalSubject,
          bodyText: finalBody,
          bodyHtml: `<p>${finalBody.replace(/\n/g, "<br>")}</p>`,
          prospectId: prospect.id,
          emailType: "one_off",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to send email")
      }

      toast.success(`Email sent to ${prospect.name}`, {
        description: "Sent from your Gmail",
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

  const handleSaveForLater = async () => {
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

    setSaving(true)

    try {
      // Create a queued email task
      const response = await fetch("/api/emails/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: prospect.email,
          subject: replaceVariables(subject),
          bodyText: replaceVariables(body),
          bodyHtml: `<p>${replaceVariables(body).replace(/\n/g, "<br>")}</p>`,
          prospectId: prospect.id,
          prospectName: prospect.name,
          status: "queued",
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save email")
      }

      toast.success("Task created", {
        description: "Email queued in emailer",
      })

      onOpenChange(false)
    } catch (error: any) {
      console.error("Error saving email:", error)
      toast.error(error.message || "Failed to save email for later")
    } finally {
      setSaving(false)
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

          {/* Template Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Template
            </Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder={loadingTemplates ? "Loading templates..." : "Select a template (optional)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Blank email</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Use {"{{firstName}}"}, {"{{company}}"}, {"{{title}}"} etc. to auto-fill prospect data
            </p>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject">Subject</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground">
                    <Braces className="h-3 w-3 mr-1" />
                    Insert Variable
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <DropdownMenuItem
                      key={v.variable}
                      onClick={() => setSubject(prev => prev + v.variable)}
                    >
                      <span className="font-mono text-xs text-muted-foreground mr-2">{v.variable}</span>
                      {v.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Input
              id="subject"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Message</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground">
                    <Braces className="h-3 w-3 mr-1" />
                    Insert Variable
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <DropdownMenuItem
                      key={v.variable}
                      onClick={() => setBody(prev => prev + v.variable)}
                    >
                      <span className="font-mono text-xs text-muted-foreground mr-2">{v.variable}</span>
                      {v.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending || saving}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveForLater}
            disabled={sending || saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Save for Later
              </>
            )}
          </Button>
          <Button onClick={handleSend} disabled={sending || saving}>
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
