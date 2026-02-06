"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { RichTextEditor } from "@/components/rich-text-editor"
import {
  Mail,
  Send,
  Trash2,
  Clock,
  Building2,
  Loader2,
  Edit2,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

type DraftEmail = {
  id: string
  to: string
  from: string
  subject: string
  bodyText: string
  bodyHtml: string | null
  createdAt: string
  metadata: {
    prospectName?: string
    queuedAt?: string
    source?: string
  } | null
}

export function DraftEmailList({
  onDraftCountChange
}: {
  onDraftCountChange?: (count: number) => void
}) {
  const [drafts, setDrafts] = useState<DraftEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDraft, setSelectedDraft] = useState<DraftEmail | null>(null)
  const [editedSubject, setEditedSubject] = useState("")
  const [editedBodyHtml, setEditedBodyHtml] = useState("")
  const [editedBodyText, setEditedBodyText] = useState("")
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadDrafts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/emails/queue")
      if (response.ok) {
        const data = await response.json()
        setDrafts(data.emails || [])
        onDraftCountChange?.(data.emails?.length || 0)
      }
    } catch (error) {
      console.error("Error loading drafts:", error)
      toast.error("Failed to load draft emails")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDrafts()
  }, [])

  const selectDraft = (draft: DraftEmail) => {
    setSelectedDraft(draft)
    setEditedSubject(draft.subject)
    // Use existing HTML if available, otherwise convert plain text to HTML
    if (draft.bodyHtml) {
      setEditedBodyHtml(draft.bodyHtml)
    } else {
      setEditedBodyHtml(`<p>${draft.bodyText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`)
    }
    setEditedBodyText(draft.bodyText)
  }

  const handleSend = async () => {
    if (!selectedDraft) return

    setSending(true)
    try {
      const response = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedDraft.to,
          subject: editedSubject,
          bodyText: editedBodyText,
          bodyHtml: editedBodyHtml,
          emailType: "one_off",
          draftId: selectedDraft.id, // Include draft ID to mark as sent
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to send email")
      }

      // Delete the draft after sending
      await fetch(`/api/emails/${selectedDraft.id}`, {
        method: "DELETE",
      })

      toast.success(`Email sent to ${selectedDraft.metadata?.prospectName || selectedDraft.to}`)
      setSelectedDraft(null)
      loadDrafts()
    } catch (error: any) {
      console.error("Error sending email:", error)
      toast.error(error.message || "Failed to send email")
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (draftId: string) => {
    setDeleting(draftId)
    try {
      const response = await fetch(`/api/emails/${draftId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete draft")
      }

      toast.success("Draft deleted")
      if (selectedDraft?.id === draftId) {
        setSelectedDraft(null)
      }
      loadDrafts()
    } catch (error: any) {
      console.error("Error deleting draft:", error)
      toast.error(error.message || "Failed to delete draft")
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (drafts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No draft emails</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            When you click "Save for Later" on an email from the dialer, it will appear here for you to edit and send.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Draft List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          {drafts.length} draft{drafts.length !== 1 ? "s" : ""} to send
        </h3>
        {drafts.map((draft) => (
          <Card
            key={draft.id}
            className={cn(
              "cursor-pointer transition-colors hover:bg-muted/50",
              selectedDraft?.id === draft.id && "border-primary bg-primary/5"
            )}
            onClick={() => selectDraft(draft)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback>
                      {(draft.metadata?.prospectName || draft.to)
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">
                        {draft.metadata?.prospectName || draft.to}
                      </span>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Draft
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{draft.to}</p>
                    <p className="text-sm font-medium mt-1 truncate">{draft.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {draft.bodyText.substring(0, 100)}...
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Saved {format(new Date(draft.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(draft.id)
                  }}
                  disabled={deleting === draft.id}
                >
                  {deleting === draft.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Email Editor */}
      <div>
        {selectedDraft ? (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Edit2 className="h-4 w-4" />
                Edit & Send
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recipient */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {(selectedDraft.metadata?.prospectName || selectedDraft.to)
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">
                    {selectedDraft.metadata?.prospectName || selectedDraft.to}
                  </div>
                  <div className="text-sm text-muted-foreground">{selectedDraft.to}</div>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  placeholder="Email subject..."
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label>Message</Label>
                <RichTextEditor
                  content={editedBodyHtml}
                  onChange={setEditedBodyHtml}
                  onTextChange={setEditedBodyText}
                  placeholder="Write your message..."
                  minHeight="250px"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedDraft(null)}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sending || !editedSubject.trim() || !editedBodyText.trim()}
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Select a draft to edit and send
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
