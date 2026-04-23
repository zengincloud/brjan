"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Phone, Search, User, Building2, CalendarIcon, Clock, Download, Play, FileText, X, Mic, PhoneOutgoing, TrendingUp, UserCheck, MessageSquare, Mail, Loader2 } from "lucide-react"
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { CallTranscript } from "@/components/call-transcript"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DateRange } from "react-day-picker"

type CallRecording = {
  id: string
  from: string
  to: string
  status: string
  outcome: string | null
  duration: number | null
  notes: string | null
  recordingUrl: string | null
  recordingDuration: number | null
  transcription: string | null
  transcriptionStatus: string | null
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  prospect: {
    id: string
    name: string
    email: string
    company: string | null
    title: string | null
  } | null
}

export function RecordingsList() {
  const [recordings, setRecordings] = useState<CallRecording[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRecording, setSelectedRecording] = useState<CallRecording | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [filter, setFilter] = useState<"all" | "recordings">("all")
  const [metricFilter, setMetricFilter] = useState<"none" | "calls_this_week" | "connected" | "conversations" | "intros_booked">("none")
  const [draftingEmail, setDraftingEmail] = useState(false)

  const draftEmailFromCall = async (recording: CallRecording) => {
    if (!recording.prospect?.email) return
    setDraftingEmail(true)
    try {
      const res = await fetch(`/api/calls/${recording.id}/draft-email`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        const to = encodeURIComponent(data.prospectEmail || recording.prospect.email)
        const su = encodeURIComponent(data.emailSubject)
        const body = encodeURIComponent(data.emailBody)
        window.open(`https://mail.google.com/mail/?view=cm&to=${to}&su=${su}&body=${body}`, "_blank")
      }
    } catch (err) {
      console.error("Error drafting email:", err)
    } finally {
      setDraftingEmail(false)
    }
  }

  useEffect(() => {
    loadRecordings(dateRange)
  }, [dateRange])

  const loadRecordings = async (range?: DateRange) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ pageSize: "500" })
      if (range?.from) params.set("from", range.from.toISOString())
      if (range?.to) params.set("to", range.to.toISOString())
      const response = await fetch(`/api/calls?${params}`)
      if (!response.ok) throw new Error("Failed to load calls")
      const data = await response.json()
      setRecordings(data.calls || [])
      if (data.calls?.length > 0 && !selectedRecording) {
        setSelectedRecording(data.calls[0])
      }
    } catch (error) {
      console.error("Error loading calls:", error)
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const callsThisWeek = recordings.filter(r => new Date(r.createdAt) >= startOfWeek)
  const connectedCalls = callsThisWeek.filter(r => r.outcome?.startsWith("connected"))
  const conversations = callsThisWeek.filter(r => (r.recordingDuration || r.duration || 0) > 60)
  const introsBooked = callsThisWeek.filter(r => r.outcome === "connected_intro_booked")
  const connectRate = callsThisWeek.length > 0 ? Math.round((connectedCalls.length / callsThisWeek.length) * 100) : 0
  const conversationRate = callsThisWeek.length > 0 ? Math.round((conversations.length / callsThisWeek.length) * 100) : 0

  const filteredRecordings = recordings.filter((recording) => {
    if (filter === "recordings" && !recording.recordingUrl) return false

    if (metricFilter !== "none") {
      const recordingDate = new Date(recording.createdAt)
      const isThisWeek = recordingDate >= startOfWeek
      if (!isThisWeek) return false

      switch (metricFilter) {
        case "calls_this_week":
          break
        case "connected":
          if (!recording.outcome?.startsWith("connected")) return false
          break
        case "conversations":
          if ((recording.recordingDuration || recording.duration || 0) <= 60) return false
          break
        case "intros_booked":
          if (recording.outcome !== "connected_intro_booked") return false
          break
      }
    }

    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      recording.to.toLowerCase().includes(searchLower) ||
      recording.prospect?.name.toLowerCase().includes(searchLower) ||
      recording.prospect?.company?.toLowerCase().includes(searchLower)

    let matchesDateRange = true
    if (dateRange?.from) {
      const recordingDate = new Date(recording.createdAt)
      const start = startOfDay(dateRange.from)
      const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from)
      matchesDateRange = isWithinInterval(recordingDate, { start, end })
    }

    return matchesSearch && matchesDateRange
  })

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getOutcomePill = (outcome: string | null) => {
    if (!outcome) return null

    const configs: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
      connected:               { bg: "bg-[hsl(100,78%,44%,0.1)]",  text: "text-[hsl(100,78%,44%)]",  border: "border-[hsl(100,78%,44%,0.2)]",  dot: "bg-[hsl(100,78%,44%)]",  label: "Connected" },
      connected_intro_booked:  { bg: "bg-[hsl(100,78%,44%,0.1)]",  text: "text-[hsl(100,78%,44%)]",  border: "border-[hsl(100,78%,44%,0.2)]",  dot: "bg-[hsl(100,78%,44%)]",  label: "Intro Booked" },
      connected_referral:      { bg: "bg-[hsl(100,78%,44%,0.1)]",  text: "text-[hsl(100,78%,44%)]",  border: "border-[hsl(100,78%,44%,0.2)]",  dot: "bg-[hsl(100,78%,44%)]",  label: "Referral" },
      connected_not_interested:{ bg: "bg-secondary/40",             text: "text-muted-foreground",    border: "border-border",                  dot: "bg-muted-foreground/50", label: "Not Interested" },
      connected_info_gathered: { bg: "bg-blue-500/10",              text: "text-blue-400",            border: "border-blue-500/20",             dot: "bg-blue-400",            label: "Info Gathered" },
      callback:                { bg: "bg-yellow-500/10",            text: "text-yellow-500",          border: "border-yellow-500/20",           dot: "bg-yellow-500",          label: "Call Back" },
      voicemail:               { bg: "bg-secondary/40",             text: "text-muted-foreground",    border: "border-border",                  dot: "bg-muted-foreground/50", label: "Voicemail" },
      no_answer:               { bg: "bg-secondary/40",             text: "text-muted-foreground",    border: "border-border",                  dot: "bg-muted-foreground/30", label: "No Answer" },
      busy:                    { bg: "bg-secondary/40",             text: "text-muted-foreground",    border: "border-border",                  dot: "bg-muted-foreground/30", label: "Busy" },
      failed:                  { bg: "bg-red-500/10",               text: "text-red-400",             border: "border-red-500/20",              dot: "bg-red-400",             label: "Failed" },
      gatekeeper:              { bg: "bg-purple-500/10",            text: "text-purple-400",          border: "border-purple-500/20",           dot: "bg-purple-400",          label: "Gatekeeper" },
    }

    const c = configs[outcome] || { bg: "bg-secondary/40", text: "text-muted-foreground", border: "border-border", dot: "bg-muted-foreground/40", label: outcome.replace(/_/g, " ") }

    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border", c.bg, c.text, c.border)}>
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", c.dot)} />
        {c.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 divide-x divide-border border border-border rounded-lg overflow-hidden bg-card">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-1.5 px-4 py-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-card">
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div
        className="grid grid-cols-4 divide-x divide-border border border-border rounded-lg overflow-hidden bg-card"
      >
        {[
          {
            key: "calls_this_week" as const,
            label: "Calls This Week",
            value: callsThisWeek.length,
            dot: "bg-muted-foreground/40",
          },
          {
            key: "connected" as const,
            label: "Connect Rate",
            value: `${connectRate}%`,
            sub: `${connectedCalls.length} connected`,
            dot: "bg-[hsl(100,78%,44%)]",
          },
          {
            key: "conversations" as const,
            label: "Conversation Rate",
            value: `${conversationRate}%`,
            sub: `${conversations.length} calls > 1 min`,
            dot: "bg-blue-400",
          },
          {
            key: "intros_booked" as const,
            label: "Intros Booked",
            value: introsBooked.length,
            dot: "bg-[hsl(100,78%,44%)]",
          },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setMetricFilter(metricFilter === s.key ? "none" : s.key)}
            className={cn(
              "flex flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/20",
              metricFilter === s.key && "bg-muted/30"
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} />
              <span className="text-[11px] text-muted-foreground truncate">{s.label}</span>
            </div>
            <span className="text-xl font-semibold text-foreground leading-none">{s.value}</span>
            {s.sub && <span className="text-[11px] text-muted-foreground">{s.sub}</span>}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {/* Filter toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg border border-border bg-card">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
              filter === "all"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <PhoneOutgoing className="h-3 w-3" />
            All Calls
          </button>
          <button
            onClick={() => setFilter("recordings")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
              filter === "recordings"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Mic className="h-3 w-3" />
            Recordings
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-[12px]"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-[12px] font-normal gap-1.5",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>{format(dateRange.from, "MMM d")} – {format(dateRange.to, "MMM d, yyyy")}</>
                ) : (
                  format(dateRange.from, "MMM d, yyyy")
                )
              ) : (
                "Filter by date"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {dateRange && (
          <Button variant="ghost" size="icon" onClick={() => setDateRange(undefined)} className="h-8 w-8">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}

        {metricFilter !== "none" && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground border border-border">
            {metricFilter === "calls_this_week" ? "All calls this week" : metricFilter === "connected" ? "Connected calls" : metricFilter === "conversations" ? "Conversations > 1 min" : "Intros booked"}
            <button onClick={() => setMetricFilter("none")} className="hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        <span className="ml-auto text-[11px] text-muted-foreground">
          {filteredRecordings.length} {filter === "all" ? "calls" : "recordings"}
        </span>
      </div>

      {/* Main panel */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {filteredRecordings.length === 0 ? (
          <div className="py-16 text-center">
            <Phone className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-[13px] font-medium text-foreground mb-1">No calls found</p>
            <p className="text-[12px] text-muted-foreground">
              {searchTerm || dateRange
                ? "Try adjusting your search or date range"
                : "Your call history will appear here"}
            </p>
          </div>
        ) : (
          <div className="flex h-[600px]">
            {/* Left — Call list */}
            <div className="w-[280px] border-r border-border flex flex-col">
              {/* List header */}
              <div className="border-b border-border bg-background px-4 py-2.5">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {filter === "all" ? "Call History" : "Recordings"}
                </span>
              </div>
              <ScrollArea className="flex-1">
                <div className="py-1">
                  {filteredRecordings.map((recording) => {
                    const isSelected = selectedRecording?.id === recording.id
                    return (
                      <button
                        key={recording.id}
                        onClick={() => setSelectedRecording(recording)}
                        className={cn(
                          "w-full text-left px-4 py-3 border-l-2 transition-colors",
                          "border-b border-border/60 last:border-b-0",
                          isSelected
                            ? "border-l-[hsl(100,78%,44%)] bg-[hsl(100,78%,44%,0.05)]"
                            : "border-l-transparent hover:bg-muted/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium truncate text-foreground">
                              {recording.prospect?.name ?? "Unknown Contact"}
                            </p>
                            {recording.prospect?.company && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {recording.prospect.company}
                              </p>
                            )}
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {format(new Date(recording.createdAt), "MMM d, h:mm a")}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {recording.outcome && getOutcomePill(recording.outcome)}
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatDuration(recording.recordingDuration || recording.duration)}</span>
                              {recording.recordingUrl && <Mic className="h-3 w-3 text-[hsl(100,78%,44%)]" />}
                              {recording.transcriptionStatus === "completed" && <FileText className="h-3 w-3 text-blue-400" />}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Right — Detail panel */}
            <div className="flex-1 overflow-hidden">
              {selectedRecording ? (
                <ScrollArea className="h-full">
                  <div className="p-5 space-y-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        {selectedRecording.prospect ? (
                          <>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-[15px] font-semibold text-foreground">{selectedRecording.prospect.name}</span>
                            </div>
                            {selectedRecording.prospect.company && (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-[13px] text-muted-foreground">
                                  {selectedRecording.prospect.title && `${selectedRecording.prospect.title} · `}
                                  {selectedRecording.prospect.company}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-[15px] font-semibold text-foreground">Unknown Contact</span>
                        )}

                        <div className="flex items-center gap-3 pt-1">
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground font-mono">
                            <Phone className="h-3.5 w-3.5" />
                            {selectedRecording.to}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(selectedRecording.recordingDuration || selectedRecording.duration)}
                          </span>
                          {selectedRecording.outcome && getOutcomePill(selectedRecording.outcome)}
                          {selectedRecording.recordingUrl && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary/40 text-muted-foreground border border-border">
                              <Mic className="h-3 w-3" /> Recorded
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(selectedRecording.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {selectedRecording.prospect?.email && selectedRecording.transcriptionStatus === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => draftEmailFromCall(selectedRecording)}
                            disabled={draftingEmail}
                            className="h-8 text-[12px]"
                          >
                            {draftingEmail ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Mail className="h-3.5 w-3.5 mr-1.5" />}
                            Draft Email
                          </Button>
                        )}
                        {selectedRecording.recordingUrl && (
                          <Button variant="outline" size="sm" asChild className="h-8 text-[12px]">
                            <a
                              href={`/api/calls/${selectedRecording.id}/recording`}
                              download={`recording-${selectedRecording.id}.mp3`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="h-3.5 w-3.5 mr-1.5" />
                              Download
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Audio player */}
                    {selectedRecording.recordingUrl && (
                      <div className="rounded-lg border border-border bg-secondary/20 px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Play className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[13px] font-medium text-foreground">Recording</span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDuration(selectedRecording.recordingDuration)}
                          </span>
                        </div>
                        <audio
                          controls
                          className="w-full h-8"
                          src={`/api/calls/${selectedRecording.id}/recording`}
                        >
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    )}

                    {/* Notes */}
                    {selectedRecording.notes && (
                      <div className="rounded-lg border border-border px-4 py-3">
                        <p className="text-[13px] font-medium text-foreground mb-1">Notes</p>
                        <p className="text-[13px] text-muted-foreground">{selectedRecording.notes}</p>
                      </div>
                    )}

                    {/* Transcript */}
                    {selectedRecording.recordingUrl && (
                      <CallTranscript
                        callId={selectedRecording.id}
                        hasRecording={!!selectedRecording.recordingUrl}
                        transcriptionStatus={selectedRecording.transcriptionStatus}
                        callOutcome={selectedRecording.outcome}
                      />
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[13px] text-muted-foreground">Select a call to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
