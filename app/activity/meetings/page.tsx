"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BRLoader } from "@/components/ui/br-loader"
import { Video, Clock, Users, ChevronRight, FileText, CheckSquare2, Mail, Copy, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Attendee {
  name?: string
  email?: string
}

interface Meeting {
  id: string
  title: string | null
  startedAt: string | null
  endedAt: string | null
  duration: number | null
  summary: string | null
  actionItems: string[] | null
  attendees: Attendee[] | null
  meetingUrl: string | null
  prospect: { id: string; name: string; email: string } | null
  account: { id: string; name: string } | null
}

interface TranscriptSegment {
  speaker?: string
  text?: string
  words?: { text: string }[]
}

interface MeetingDetail extends Meeting {
  transcript: TranscriptSegment[] | null
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--"
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function formatDate(iso: string | null): string {
  if (!iso) return "--"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function AttendeeChips({ attendees }: { attendees: Attendee[] | null }) {
  if (!attendees?.length) return <span className="text-muted-foreground text-xs">No attendees</span>
  const shown = attendees.slice(0, 3)
  const extra = attendees.length - 3
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((a, i) => (
        <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground">
          {a.name || a.email || "Unknown"}
        </span>
      ))}
      {extra > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground">
          +{extra} more
        </span>
      )}
    </div>
  )
}

function MeetingCard({
  meeting,
  selected,
  onClick,
}: {
  meeting: Meeting
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-lg border transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:bg-accent/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="font-medium text-sm truncate">
              {meeting.title || "Untitled Meeting"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{formatDate(meeting.startedAt)}</p>
          <AttendeeChips attendees={meeting.attendees} />
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(meeting.duration)}
          </div>
          {meeting.summary && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              Summary
            </Badge>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
      {meeting.summary && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{meeting.summary}</p>
      )}
    </button>
  )
}

function MeetingDetailPanel({ meeting }: { meeting: MeetingDetail }) {
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string } | null>(null)

  const transcriptText =
    meeting.transcript
      ?.map((s) => {
        const text = s.text ?? s.words?.map((w) => w.text).join(" ") ?? ""
        return s.speaker ? `${s.speaker}: ${text}` : text
      })
      .filter(Boolean) || []

  async function handleGenerateEmail() {
    setGeneratingEmail(true)
    setEmailDraft(null)
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/draft-followup`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed")
      setEmailDraft({ subject: data.emailSubject, body: data.emailBody })
    } catch (err: any) {
      toast.error(err.message || "Failed to generate email")
    } finally {
      setGeneratingEmail(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{meeting.title || "Untitled Meeting"}</h2>
        <p className="text-sm text-muted-foreground">{formatDate(meeting.startedAt)}</p>
        {(meeting.prospect || meeting.account) && (
          <div className="flex gap-2 mt-1">
            {meeting.prospect && (
              <Badge variant="outline" className="text-xs">
                {meeting.prospect.name}
              </Badge>
            )}
            {meeting.account && (
              <Badge variant="outline" className="text-xs">
                {meeting.account.name}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-6 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
          <p className="font-medium">{formatDuration(meeting.duration)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Attendees</p>
          <p className="font-medium">{meeting.attendees?.length ?? 0}</p>
        </div>
      </div>

      {meeting.attendees && meeting.attendees.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-sm font-medium">
            <Users className="h-4 w-4 text-muted-foreground" />
            Attendees
          </div>
          <div className="space-y-1">
            {meeting.attendees.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium shrink-0">
                  {(a.name || a.email || "?")[0].toUpperCase()}
                </div>
                <div>
                  {a.name && <span className="font-medium">{a.name}</span>}
                  {a.email && (
                    <span className={cn("text-muted-foreground", a.name && " ml-1 text-xs")}>
                      {a.email}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {meeting.summary && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Summary
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{meeting.summary}</p>
        </div>
      )}

      {meeting.actionItems && (meeting.actionItems as string[]).length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-sm font-medium">
            <CheckSquare2 className="h-4 w-4 text-muted-foreground" />
            Action Items
          </div>
          <ul className="space-y-1">
            {(meeting.actionItems as string[]).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {meeting.summary && (
        <div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateEmail}
            disabled={generatingEmail}
            className="w-full"
          >
            {generatingEmail ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5 mr-1.5" />
            )}
            {generatingEmail ? "Generating..." : "Generate Follow-up Email"}
          </Button>

          {emailDraft && (
            <div className="mt-3 space-y-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Subject</p>
                <div className="relative">
                  <textarea
                    readOnly
                    value={emailDraft.subject}
                    rows={1}
                    className="w-full resize-none rounded-md border border-border bg-muted/40 px-3 py-2 text-sm outline-none pr-8"
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(emailDraft.subject); toast.success("Copied") }}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Body</p>
                <div className="relative">
                  <textarea
                    readOnly
                    value={emailDraft.body}
                    rows={6}
                    className="w-full resize-none rounded-md border border-border bg-muted/40 px-3 py-2 text-sm outline-none pr-8"
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(emailDraft.body); toast.success("Copied") }}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {transcriptText.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Transcript
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {transcriptText.map((line, i) => {
              const colonIdx = line.indexOf(": ")
              if (colonIdx > 0) {
                const speaker = line.slice(0, colonIdx)
                const text = line.slice(colonIdx + 2)
                return (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-foreground">{speaker}: </span>
                    <span className="text-muted-foreground">{text}</span>
                  </div>
                )
              }
              return (
                <p key={i} className="text-sm text-muted-foreground">{line}</p>
              )
            })}
          </div>
        </div>
      )}

      {!meeting.summary && transcriptText.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Video className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>Processing transcript...</p>
          <p className="text-xs mt-1">Summary will appear here once transcription is complete.</p>
        </div>
      )}
    </div>
  )
}

export default function MeetingRecordingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<MeetingDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const loadMeetings = (initial = false) => {
    return fetch("/api/meetings")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list: Meeting[] = Array.isArray(data) ? data : []
        setMeetings(list)
        if (initial && list.length > 0) handleSelect(list[0].id)
        return list
      })
      .catch(() => [] as Meeting[])
  }

  useEffect(() => {
    loadMeetings(true).finally(() => setLoading(false))
    // Silently reconcile on load so missed webhooks self-heal
    fetch("/api/meetings/reconcile", { method: "POST" }).catch(() => {})
  }, [])

  // Poll every 30s while any recent meeting is still processing (no summary yet)
  useEffect(() => {
    const interval = setInterval(async () => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000 // last 24h
      const hasProcessing = meetings.some(
        (m) => !m.summary && m.startedAt && new Date(m.startedAt).getTime() > cutoff
      )
      if (!hasProcessing) return
      const updated = await loadMeetings()
      // Refresh detail panel if the selected meeting just got a summary
      if (selectedId) {
        const prev = meetings.find((m) => m.id === selectedId)
        const next = updated.find((m) => m.id === selectedId)
        if (!prev?.summary && next?.summary) handleSelect(selectedId)
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [meetings, selectedId])

  function handleSelect(id: string) {
    setSelectedId(id)
    setLoadingDetail(true)
    fetch(`/api/meetings/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setDetail(data))
      .catch(console.error)
      .finally(() => setLoadingDetail(false))
  }

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch("/api/meetings/reconcile", { method: "POST" })
      const updated = await loadMeetings()
      if (selectedId) {
        const prev = meetings.find((m) => m.id === selectedId)
        const next = updated.find((m) => m.id === selectedId)
        if (!prev?.summary && next?.summary) handleSelect(selectedId)
      }
      toast.success("Synced with Recall")
    } catch {
      toast.error("Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <BRLoader />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Video className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Meeting Recordings</h1>
        {meetings.length > 0 && (
          <Badge variant="secondary">{meetings.length}</Badge>
        )}
        <div className="ml-auto">
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync"}
          </Button>
        </div>
      </div>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="py-20 flex flex-col items-center text-center">
            <Video className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium">No recordings yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Meetings recorded by your notetaker bot will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-5 gap-4 items-start">
          <div className="col-span-2 space-y-2">
            {meetings.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                selected={selectedId === m.id}
                onClick={() => handleSelect(m.id)}
              />
            ))}
          </div>

          <Card className="col-span-3 sticky top-4">
            <CardContent className="p-6">
              {loadingDetail ? (
                <div className="flex justify-center py-12">
                  <BRLoader />
                </div>
              ) : detail ? (
                <MeetingDetailPanel meeting={detail} />
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Select a recording to view details
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
