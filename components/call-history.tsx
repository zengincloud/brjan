"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, Clock, Mic, Play, FileText, Sparkles } from "lucide-react"
import { format } from "date-fns"

type CallAnalysis = {
  summary?: string
  keyPoints?: string[]
  nextSteps?: string | null
  sentiment?: string
  outcome?: string
}

type Call = {
  id: string
  outcome: string | null
  duration: number | null
  notes: string | null
  transcription: string | null
  recordingUrl: string | null
  recordingDuration: number | null
  transcriptionStatus: string | null
  startedAt: string | null
  createdAt: string
}

function getCallAnalysis(call: Call): CallAnalysis | null {
  if (!call.transcription) return null
  try {
    const parsed = JSON.parse(call.transcription)
    return parsed.analysis || null
  } catch {
    return null
  }
}

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const getOutcomeLabel = (outcome: string | null) => {
  if (!outcome) return "Unknown"
  const labels: Record<string, string> = {
    connected: "Connected",
    connected_intro_booked: "Intro Booked",
    connected_referral: "Referral",
    connected_not_interested: "Not Interested",
    connected_info_gathered: "Info Gathered",
    callback: "Call Back Later",
    voicemail: "Voicemail",
    no_answer: "No Answer",
    busy: "Busy",
    failed: "Failed",
    gatekeeper: "Gatekeeper",
  }
  return labels[outcome] || outcome.replace(/_/g, " ")
}

const getOutcomeVariant = (outcome: string | null): "default" | "secondary" | "destructive" | "outline" => {
  if (!outcome) return "outline"
  if (outcome.startsWith("connected")) return "default"
  if (outcome === "voicemail" || outcome === "gatekeeper") return "secondary"
  if (outcome === "failed") return "destructive"
  return "outline"
}

export function CallHistory({ prospectId, limit }: { prospectId?: string; limit?: number }) {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [playingId, setPlayingId] = useState<string | null>(null)

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

      if (response.ok && Array.isArray(data.calls)) {
        setCalls(data.calls)
      }
    } catch (error) {
      console.error("Error loading calls:", error)
    } finally {
      setLoading(false)
    }
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

  const totalCalls = calls.length
  const answeredCalls = calls.filter(c => c.outcome?.startsWith("connected")).length
  const recordedCalls = calls.filter(c => c.recordingUrl).length

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Call History
          </CardTitle>
          <div className="flex items-center gap-2">
            {totalCalls > 0 && (
              <span className="text-xs text-muted-foreground">
                {totalCalls} call{totalCalls !== 1 ? "s" : ""}, {answeredCalls} connected
              </span>
            )}
            {recordedCalls > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Mic className="h-3 w-3" />
                {recordedCalls}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {totalCalls === 0 ? (
          <p className="text-sm text-muted-foreground">No calls yet</p>
        ) : (
          <div className="space-y-2">
            {calls.map((call) => (
              <div key={call.id} className="flex flex-col gap-1.5 p-2.5 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getOutcomeVariant(call.outcome)} className="text-xs">
                      {getOutcomeLabel(call.outcome)}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(call.recordingDuration || call.duration)}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(call.startedAt || call.createdAt), "MMM d, h:mm a")}
                  </span>
                </div>

                {(() => {
                  const analysis = getCallAnalysis(call)
                  if (!analysis?.summary) return null
                  return (
                    <div className="flex items-start gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <p className="text-xs text-primary/80">{analysis.summary}</p>
                        {analysis.keyPoints && analysis.keyPoints.length > 0 && (
                          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                            {analysis.keyPoints.map((point, i) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {call.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{call.notes}</p>
                )}

                {/* Recording player */}
                {call.recordingUrl && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1.5">
                      <Mic className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium">Recording</span>
                      {call.transcriptionStatus === "completed" && (
                        <FileText className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <audio
                      controls
                      className="h-7 flex-1"
                      src={`/api/calls/${call.id}/recording`}
                      onPlay={() => setPlayingId(call.id)}
                      onPause={() => setPlayingId(null)}
                      onEnded={() => setPlayingId(null)}
                    >
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
