"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Phone, Search, User, Building2, CalendarIcon, Clock, Download, Play, FileText, X, Mic, PhoneOutgoing, TrendingUp, UserCheck, MessageSquare } from "lucide-react"
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

  useEffect(() => {
    loadRecordings()
  }, [])

  const loadRecordings = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/calls")
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

  // Compute stats from recordings (before filtering so metric cards always show totals)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const callsThisWeek = recordings.filter(r => new Date(r.createdAt) >= startOfWeek)
  const connectedCalls = callsThisWeek.filter(r => r.outcome?.startsWith("connected"))
  const conversations = callsThisWeek.filter(r => (r.duration || 0) > 60) // > 1 minute
  const introsBooked = callsThisWeek.filter(r => r.outcome === "connected_intro_booked")
  const connectRate = callsThisWeek.length > 0 ? Math.round((connectedCalls.length / callsThisWeek.length) * 100) : 0
  const conversationRate = callsThisWeek.length > 0 ? Math.round((conversations.length / callsThisWeek.length) * 100) : 0

  const filteredRecordings = recordings.filter((recording) => {
    // Recording filter
    if (filter === "recordings" && !recording.recordingUrl) return false

    // Metric card filter
    if (metricFilter !== "none") {
      const recordingDate = new Date(recording.createdAt)
      const isThisWeek = recordingDate >= startOfWeek
      if (!isThisWeek) return false

      switch (metricFilter) {
        case "calls_this_week":
          break // All calls this week pass
        case "connected":
          if (!recording.outcome?.startsWith("connected")) return false
          break
        case "conversations":
          if ((recording.duration || 0) <= 60) return false
          break
        case "intros_booked":
          if (recording.outcome !== "connected_intro_booked") return false
          break
      }
    }

    // Text search filter
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      recording.to.toLowerCase().includes(searchLower) ||
      recording.prospect?.name.toLowerCase().includes(searchLower) ||
      recording.prospect?.company?.toLowerCase().includes(searchLower)

    // Date range filter
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

  const getOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null

    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      connected: { variant: "default", label: "Connected" },
      connected_intro_booked: { variant: "default", label: "Intro Booked" },
      connected_referral: { variant: "default", label: "Referral" },
      connected_not_interested: { variant: "secondary", label: "Not Interested" },
      connected_info_gathered: { variant: "default", label: "Info Gathered" },
      callback: { variant: "secondary", label: "Call Back Later" },
      voicemail: { variant: "secondary", label: "Voicemail" },
      no_answer: { variant: "outline", label: "No Answer" },
      busy: { variant: "outline", label: "Busy" },
      failed: { variant: "destructive", label: "Failed" },
      gatekeeper: { variant: "secondary", label: "Gatekeeper" },
    }

    const config = variants[outcome] || { variant: "outline" as const, label: outcome.replace(/_/g, " ") }

    return (
      <Badge variant={config.variant} className="text-xs capitalize">
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Call Recordings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Call Stats - Clickable to filter call list */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card
          className={cn("border-border cursor-pointer transition-all hover:border-primary/50", metricFilter === "calls_this_week" && "border-primary ring-1 ring-primary/20")}
          onClick={() => setMetricFilter(metricFilter === "calls_this_week" ? "none" : "calls_this_week")}
        >
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Calls This Week</p>
                <p className="text-2xl font-bold">{callsThisWeek.length}</p>
              </div>
              <Phone className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn("border-border cursor-pointer transition-all hover:border-primary/50", metricFilter === "connected" && "border-primary ring-1 ring-primary/20")}
          onClick={() => setMetricFilter(metricFilter === "connected" ? "none" : "connected")}
        >
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Connect Rate</p>
                <p className="text-2xl font-bold">{connectRate}%</p>
              </div>
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{connectedCalls.length} connected</p>
          </CardContent>
        </Card>
        <Card
          className={cn("border-border cursor-pointer transition-all hover:border-primary/50", metricFilter === "conversations" && "border-primary ring-1 ring-primary/20")}
          onClick={() => setMetricFilter(metricFilter === "conversations" ? "none" : "conversations")}
        >
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Conversation Rate</p>
                <p className="text-2xl font-bold">{conversationRate}%</p>
              </div>
              <MessageSquare className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{conversations.length} calls &gt; 1 min</p>
          </CardContent>
        </Card>
        <Card
          className={cn("border-border cursor-pointer transition-all hover:border-primary/50", metricFilter === "intros_booked" && "border-primary ring-1 ring-primary/20")}
          onClick={() => setMetricFilter(metricFilter === "intros_booked" ? "none" : "intros_booked")}
        >
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Intros Booked</p>
                <p className="text-2xl font-bold text-primary">{introsBooked.length}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active metric filter indicator */}
      {metricFilter !== "none" && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            Showing: {metricFilter === "calls_this_week" ? "All calls this week" : metricFilter === "connected" ? "Connected calls" : metricFilter === "conversations" ? "Conversations (> 1 min)" : "Intros booked"}
            <button onClick={() => setMetricFilter("none")} className="ml-1 hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Filter Tabs, Search, and Date Range */}
      <div className="flex items-center gap-3">
        <div className="flex items-center border rounded-lg p-0.5">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="h-7 text-xs"
          >
            <PhoneOutgoing className="h-3 w-3 mr-1" />
            All Calls
          </Button>
          <Button
            variant={filter === "recordings" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("recordings")}
            className="h-7 text-xs"
          >
            <Mic className="h-3 w-3 mr-1" />
            Recordings
          </Button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal min-w-[240px]",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                  </>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDateRange(undefined)}
            className="h-9 w-9"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Main Card with Split Pane */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4" />
            {filter === "all" ? "Call History" : "Call Recordings"} ({filteredRecordings.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRecordings.length === 0 ? (
            <div className="py-12 text-center">
              <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-1">No calls found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm || dateRange
                  ? "Try adjusting your search or date range"
                  : "Your call history will appear here"}
              </p>
            </div>
          ) : (
            <div className="flex h-[600px]">
              {/* Left side - Recording list */}
              <div className="w-[300px] border-r">
                <ScrollArea className="h-full">
                  <div className="p-2 space-y-1">
                    {filteredRecordings.map((recording) => (
                      <button
                        key={recording.id}
                        onClick={() => setSelectedRecording(recording)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg transition-colors",
                          "hover:bg-muted/50",
                          selectedRecording?.id === recording.id
                            ? "bg-muted border border-border"
                            : "border border-transparent"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {recording.prospect ? (
                              <p className="text-sm font-medium truncate">
                                {recording.prospect.name}
                              </p>
                            ) : (
                              <p className="text-sm font-medium truncate">
                                Unknown Contact
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              {recording.to}
                            </p>
                            {recording.prospect?.company && (
                              <p className="text-xs text-muted-foreground truncate">
                                {recording.prospect.company}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(recording.createdAt), "MMM d, h:mm a")}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {recording.outcome && getOutcomeBadge(recording.outcome)}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatDuration(recording.recordingDuration || recording.duration)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {recording.recordingUrl && (
                                <Mic className="h-3 w-3 text-primary" />
                              )}
                              {recording.transcriptionStatus === "completed" && (
                                <FileText className="h-3 w-3 text-green-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Right side - Recording details and transcript */}
              <div className="flex-1 overflow-hidden">
                {selectedRecording ? (
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                      {/* Recording header */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            {selectedRecording.prospect ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{selectedRecording.prospect.name}</span>
                                </div>
                                {selectedRecording.prospect.company && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                      {selectedRecording.prospect.title && `${selectedRecording.prospect.title} at `}
                                      {selectedRecording.prospect.company}
                                    </span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="font-medium">Unknown Contact</span>
                            )}
                          </div>

                          {selectedRecording.recordingUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a
                                href={`/api/calls/${selectedRecording.id}/recording`}
                                download={`recording-${selectedRecording.id}.mp3`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">{selectedRecording.to}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDuration(selectedRecording.recordingDuration || selectedRecording.duration)}</span>
                          </div>
                          {selectedRecording.outcome && getOutcomeBadge(selectedRecording.outcome)}
                          {selectedRecording.recordingUrl && (
                            <Badge variant="outline" className="text-xs">
                              <Mic className="h-3 w-3 mr-1" />
                              Recorded
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {format(new Date(selectedRecording.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>

                      {/* Recording player */}
                      {selectedRecording.recordingUrl && (
                        <div className="p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Play className="h-4 w-4" />
                            <span className="text-sm font-medium">Recording</span>
                            <span className="text-xs text-muted-foreground">
                              ({formatDuration(selectedRecording.recordingDuration)})
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
                        <div className="p-3 rounded-lg border">
                          <p className="text-sm font-medium mb-1">Notes</p>
                          <p className="text-sm text-muted-foreground">{selectedRecording.notes}</p>
                        </div>
                      )}

                      {/* Transcript */}
                      {selectedRecording.recordingUrl && (
                        <CallTranscript
                          callId={selectedRecording.id}
                          hasRecording={!!selectedRecording.recordingUrl}
                          transcriptionStatus={selectedRecording.transcriptionStatus}
                        />
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">Select a call to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
