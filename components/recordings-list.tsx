"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Phone, Search, User, Building2, Calendar, Clock, Download, Play, FileText } from "lucide-react"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { CallTranscript } from "@/components/call-transcript"
import { cn } from "@/lib/utils"

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

  useEffect(() => {
    loadRecordings()
  }, [])

  const loadRecordings = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/calls?hasRecording=true")
      if (!response.ok) throw new Error("Failed to load recordings")
      const data = await response.json()
      setRecordings(data.calls || [])
      // Auto-select first recording if available
      if (data.calls?.length > 0 && !selectedRecording) {
        setSelectedRecording(data.calls[0])
      }
    } catch (error) {
      console.error("Error loading recordings:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRecordings = recordings.filter((recording) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      recording.to.toLowerCase().includes(searchLower) ||
      recording.prospect?.name.toLowerCase().includes(searchLower) ||
      recording.prospect?.company?.toLowerCase().includes(searchLower)
    )
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
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, company, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Main Card with Split Pane */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Call Recordings ({filteredRecordings.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRecordings.length === 0 ? (
            <div className="py-12 text-center">
              <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-1">No recordings found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm
                  ? "Try adjusting your search"
                  : "Call recordings will appear here automatically"}
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
                              <span>{formatDuration(recording.recordingDuration)}</span>
                            </div>
                            {recording.transcriptionStatus === "completed" && (
                              <FileText className="h-3 w-3 text-green-500" />
                            )}
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
                            <span>{formatDuration(selectedRecording.recordingDuration)}</span>
                          </div>
                          {selectedRecording.outcome && getOutcomeBadge(selectedRecording.outcome)}
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
                          onTranscriptionComplete={loadRecordings}
                        />
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">Select a recording to view details</p>
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
