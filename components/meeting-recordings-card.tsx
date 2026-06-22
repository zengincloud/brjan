"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Video, Clock, ChevronDown, ChevronUp, ExternalLink, CheckSquare2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface MeetingItem {
  id: string
  title: string | null
  startedAt: string | null
  duration: number | null
  summary: string | null
  actionItems: string[] | null
  attendees: { name?: string; email?: string }[] | null
}

interface Props {
  prospectId?: string
  accountId?: string
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--"
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export function MeetingRecordingsCard({ prospectId, accountId }: Props) {
  const [meetings, setMeetings] = useState<MeetingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    const url = accountId
      ? `/api/accounts/${accountId}/meetings`
      : prospectId
      ? `/api/meetings?prospectId=${prospectId}`
      : null
    if (!url) { setLoading(false); return }

    fetch(url)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setMeetings(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [prospectId, accountId])

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Meeting Recordings</CardTitle>
          </div>
          {meetings.length > 0 && (
            <Link
              href="/activity/meetings"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : meetings.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Video className="h-7 w-7 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No recorded meetings yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {meetings.map((m) => {
              const isExpanded = expanded.has(m.id)
              const date = m.startedAt
                ? formatDistanceToNow(new Date(m.startedAt), { addSuffix: true })
                : "--"
              return (
                <div key={m.id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggle(m.id)}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">
                          {m.title || "Untitled Meeting"}
                        </span>
                        {m.summary && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">
                            Summary
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(m.duration)}
                        </span>
                        <span className="text-xs text-muted-foreground">{date}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 border-t bg-muted/20">
                      {m.summary ? (
                        <div className="pt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{m.summary}</p>
                        </div>
                      ) : (
                        <p className="pt-2 text-xs text-muted-foreground italic">
                          Transcript processing...
                        </p>
                      )}
                      {m.actionItems && (m.actionItems as string[]).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                            <CheckSquare2 className="h-3 w-3" />
                            Action Items
                          </p>
                          <ul className="space-y-0.5">
                            {(m.actionItems as string[]).map((item, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-primary mt-0.5">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <Link
                        href="/activity/meetings"
                        className="text-xs text-primary hover:underline flex items-center gap-1 pt-1"
                      >
                        Open full recording
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
