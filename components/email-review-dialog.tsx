"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RichTextEditor } from "@/components/rich-text-editor"
import { useToast } from "@/components/ui/use-toast"
import { Send, Trash2, Zap, Loader2 } from "lucide-react"

export type ReviewEmail = {
  id: string
  to: string
  subject?: string | null
  bodyHtml?: string | null
  bodyText?: string | null
  status: string
  sentAt?: string | null
  metadata?: any
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

export function EmailReviewDialog({
  email,
  open,
  onOpenChange,
  onSent,
  onDeleted,
}: {
  email: ReviewEmail | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent: () => void
  onDeleted: () => void
}) {
  const { toast } = useToast()
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (email) {
      setSubject(email.subject || "")
      setBody(email.bodyHtml || email.bodyText || "")
    }
  }, [email])

  if (!email) return null

  const meta = email.metadata || {}
  const isSequenceEmail = !!meta.sequenceId
  const isSent = email.status === "sent"
  const isEditable = !isSent

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await fetch(`/api/emails/${email.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, bodyText: stripHtml(body), bodyHtml: body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send")

      if (data.sequenceAdvanced) {
        toast({
          title: "Email sent",
          description: data.sequenceAdvanced.completed
            ? "Sequence completed for this contact."
            : data.sequenceAdvanced.nextStep
              ? `Advanced to "${data.sequenceAdvanced.nextStep.name}".`
              : "Sequence advanced.",
        })
      } else {
        toast({ title: "Email sent" })
      }
      onOpenChange(false)
      onSent()
    } catch (error: any) {
      console.error(error)
      toast({ title: "Error", description: error.message || "Failed to send email", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/emails/${email.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast({ title: "Draft deleted" })
      onOpenChange(false)
      onDeleted()
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to delete draft", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{isSent ? "Sent email" : "Review draft"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {isSequenceEmail && (
            <Badge variant="secondary" className="gap-1 font-normal">
              <Zap className="h-3 w-3" />
              {meta.sequenceName || "Sequence"} · {meta.stepName || "Email step"}
            </Badge>
          )}

          <div>
            <Label>To</Label>
            <Input value={email.to} disabled className="bg-muted/30" />
          </div>

          <div>
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={!isEditable}
              placeholder="Subject line"
            />
          </div>

          <div>
            <Label>Body</Label>
            {isEditable ? (
              <RichTextEditor content={body} onChange={setBody} minHeight="220px" />
            ) : (
              <div
                className="rounded-md border border-border p-3 text-sm prose prose-sm dark:prose-invert max-w-none min-h-[120px]"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            )}
          </div>

          {isSequenceEmail && isEditable && (
            <p className="text-xs text-muted-foreground">
              Sending will advance this contact to the next step in "{meta.sequenceName || "the sequence"}".
            </p>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          {isEditable ? (
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleting || sending}>
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? "Deleting..." : "Delete draft"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {isEditable && (
              <Button onClick={handleSend} disabled={sending || deleting}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {sending ? "Sending..." : "Send"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
