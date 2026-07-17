"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RichTextEditor } from "@/components/rich-text-editor"
import { useToast } from "@/components/ui/use-toast"
import { Send, Trash2, Zap, Loader2, X } from "lucide-react"

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

export function EmailDetailPanel({
  email,
  onClose,
  onSent,
  onDeleted,
}: {
  email: ReviewEmail
  onClose: () => void
  onSent: () => void
  onDeleted: () => void
}) {
  const { toast } = useToast()
  const [subject, setSubject] = useState(email.subject || "")
  const [body, setBody] = useState(email.bodyHtml || email.bodyText || "")
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setSubject(email.subject || "")
    setBody(email.bodyHtml || email.bodyText || "")
  }, [email.id])

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
      onDeleted()
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to delete draft", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col h-full border-l border-border">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">{isSent ? "Sent email" : "Review draft"}</p>
          {isSequenceEmail && (
            <Badge variant="secondary" className="gap-1 font-normal mt-1.5">
              <Zap className="h-3 w-3" />
              {meta.sequenceName || "Sequence"} · {meta.stepName || "Email step"}
            </Badge>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
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
            <RichTextEditor content={body} onChange={setBody} minHeight="260px" />
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

      {/* Footer */}
      {isEditable && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0">
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleting || sending}>
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? "Deleting..." : "Delete draft"}
          </Button>
          <Button onClick={handleSend} disabled={sending || deleting}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      )}
    </div>
  )
}
