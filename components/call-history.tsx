"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Phone, Clock, User, Building2, Play, FileText, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { CallTranscript } from "@/components/call-transcript"
import { cn } from "@/lib/utils"

type Call = {
  id: string
  from: string
  to: string
  status: string
  outcome: string | null
  duration: number | null
  notes: string | null
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  recordingUrl: string | null
  recordingDuration: number | null
  transcription: string | null
  transcriptionStatus: string | null
  prospect: {
    id: string
    name: string
    email: string
    company: string | null
    title: string | null
  } | null
}

export function CallHistory({ prospectId, limit }: { prospectId?: string; limit?: number }) {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)

  useEffect(() => {
    loadCalls()
  }, [prospectId])

  const loadCalls = async () => {
    try {
      const params = new URLSearchParams()
      if (prospectId) params.append("prospectId", prospectId)
      if (limit) params.append("limit", limit.toString())

      const response = await fetch(`/api/calls?${params}`)
      const data = await response.json()

      if (response.ok) {
        setCalls(data.calls)
        // Auto-select first call if available
        if (data.calls.length > 0 && !selectedCall) {
          setSelectedCall(data.calls[0])
        }
      }
    } catch (error) {
      console.error("Error loading calls:", error)
    } finally {
      setLoading(false)
    }
  }

  const getOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null

    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      connected: { variant: "default", label: "Connected" },
      connected_intro_booked: { variant: "default", label: "Intro Booked" },
      connected_referral: { variant: "default", label: "Referral" },
      connected_not_interested: { variant: "secondary", label: "Not Interested" },
      connected_info_gathered: { variant: "default", label: "Info Gathered" },
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

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Call History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (calls.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Call History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No calls yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Call History ({calls.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex h-[500px]">
          {/* Left side - Call list */}
          <div className="w-[280px] border-r">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {calls.map((call) => (
                  <button
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-colors",
                      "hover:bg-muted/50",
                      selectedCall?.id === call.id
                        ? "bg-muted border border-border"
                        : "border border-transparent"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {call.prospect && !prospectId && (
                          <p className="text-sm font-medium truncate">
                            {call.prospect.name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {call.to}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(call.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {call.outcome && getOutcomeBadge(call.outcome)}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(call.duration)}</span>
                        </div>
                        {call.recordingUrl && (
                          <FileText className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                    </div>
                    {selectedCall?.id === call.id && (
                      <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right side - Call details and transcript */}
          <div className="flex-1 overflow-hidden">
            {selectedCall ? (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {/* Call header */}
                  <div className="space-y-2">
                    {selectedCall.prospect && (
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{selectedCall.prospect.name}</span>
                        </div>
                        {selectedCall.prospect.company && (
                          <div className="flex items-center gap-2 mt-1">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {selectedCall.prospect.title && `${selectedCall.prospect.title} at `}
                              {selectedCall.prospect.company}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">{selectedCall.to}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDuration(selectedCall.duration)}</span>
                      </div>
                      {selectedCall.outcome && getOutcomeBadge(selectedCall.outcome)}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {format(new Date(selectedCall.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>

                  {/* Recording player */}
                  {selectedCall.recordingUrl && (
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Play className="h-4 w-4" />
                        <span className="text-sm font-medium">Recording</span>
                        <span className="text-xs text-muted-foreground">
                          ({formatDuration(selectedCall.recordingDuration)})
                        </span>
                      </div>
                      <audio
                        controls
                        className="w-full h-8"
                        src={`/api/calls/${selectedCall.id}/recording`}
                      >
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedCall.notes && (
                    <div className="p-3 rounded-lg border">
                      <p className="text-sm font-medium mb-1">Notes</p>
                      <p className="text-sm text-muted-foreground">{selectedCall.notes}</p>
                    </div>
                  )}

                  {/* Transcript */}
                  {selectedCall.recordingUrl && (
                    <CallTranscript
                      callId={selectedCall.id}
                      hasRecording={!!selectedCall.recordingUrl}
                      transcriptionStatus={selectedCall.transcriptionStatus}
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
      </CardContent>
    </Card>
  )
}
