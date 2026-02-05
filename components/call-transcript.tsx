"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, FileText, RefreshCw, User, Users, TrendingUp, TrendingDown, Minus, Target, Lightbulb, ArrowRight } from "lucide-react"

interface CallAnalysis {
  sentiment: "positive" | "neutral" | "negative" | "mixed"
  sentimentScore: number
  outcome: "interested" | "not_interested" | "follow_up" | "meeting_booked" | "voicemail" | "gatekeeper" | "unknown"
  summary: string
  keyPoints: string[]
  nextSteps: string | null
}

interface TranscriptSegment {
  speaker: string
  text: string
  startTime: number
  endTime: number
}

interface FormattedTranscript {
  fullText: string
  segments: TranscriptSegment[]
  duration: number
  analysis?: CallAnalysis
}

interface CallTranscriptProps {
  callId: string
  hasRecording: boolean
  transcriptionStatus?: string | null
  onTranscriptionComplete?: () => void
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const sentimentConfig = {
  positive: {
    label: "Positive",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: TrendingUp,
  },
  neutral: {
    label: "Neutral",
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    icon: Minus,
  },
  negative: {
    label: "Negative",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: TrendingDown,
  },
  mixed: {
    label: "Mixed",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    icon: Minus,
  },
}

const outcomeConfig: Record<string, { label: string; color: string }> = {
  interested: { label: "Interested", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  not_interested: { label: "Not Interested", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  follow_up: { label: "Follow Up Needed", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  meeting_booked: { label: "Meeting Booked", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  voicemail: { label: "Voicemail", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  gatekeeper: { label: "Gatekeeper", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  unknown: { label: "Unknown", color: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
}

export function CallTranscript({
  callId,
  hasRecording,
  transcriptionStatus: initialStatus,
  onTranscriptionComplete,
}: CallTranscriptProps) {
  const [status, setStatus] = useState<string>(initialStatus || "none")
  const [transcript, setTranscript] = useState<FormattedTranscript | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentCallIdRef = useRef<string | null>(null)

  // Initialize: check current status only (do NOT auto-start transcription)
  useEffect(() => {
    // Reset state when callId changes
    if (currentCallIdRef.current !== callId) {
      currentCallIdRef.current = callId
      setStatus(initialStatus || "none")
      setTranscript(null)
      setError(null)
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    const checkStatus = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Only fetch current status from API - do NOT start transcription
        const response = await fetch(`/api/calls/${callId}/transcribe`)
        const data = await response.json()

        if (data.status === "completed" && data.transcript) {
          setTranscript(data.transcript)
          setStatus("completed")
          onTranscriptionComplete?.()
        } else if (data.status === "queued" || data.status === "processing") {
          setStatus(data.status)
          // Polling will start via the other useEffect
        } else if (data.status === "error") {
          setError(data.error || "Transcription failed")
          setStatus("error")
        } else {
          // Status is "none" - just show the button, don't auto-start
          setStatus("none")
        }
      } catch (err: any) {
        setError(err.message || "Failed to load transcription status")
        setStatus("error")
      } finally {
        setIsLoading(false)
      }
    }

    checkStatus()

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [callId])

  // Poll for status when processing
  useEffect(() => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    if (status === "queued" || status === "processing") {
      let pollCount = 0

      pollIntervalRef.current = setInterval(async () => {
        pollCount++

        // Stop polling after 5 minutes (100 polls at 3s each)
        if (pollCount > 100) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setError("Transcription timed out. Please try again.")
          setStatus("error")
          return
        }

        try {
          const response = await fetch(`/api/calls/${callId}/transcribe`)
          const data = await response.json()

          if (data.status === "completed" && data.transcript) {
            setTranscript(data.transcript)
            setStatus("completed")
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            onTranscriptionComplete?.()
          } else if (data.status === "error") {
            setError(data.error || "Transcription failed")
            setStatus("error")
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          } else {
            setStatus(data.status)
          }
        } catch (err) {
          console.error("Error polling transcription:", err)
        }
      }, 3000)
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [status, callId])

  const retryTranscription = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/calls/${callId}/transcribe`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to start transcription")
        setStatus("error")
        return
      }

      setStatus(data.status || "queued")
    } catch (err: any) {
      setError(err.message || "Failed to start transcription")
      setStatus("error")
    } finally {
      setIsLoading(false)
    }
  }

  if (!hasRecording) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No recording available for transcription
      </div>
    )
  }

  const analysis = transcript?.analysis
  const sentimentInfo = analysis ? sentimentConfig[analysis.sentiment] : null
  const outcomeInfo = analysis ? outcomeConfig[analysis.outcome] : null

  return (
    <div className="space-y-4">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium">Transcript</span>
          {status !== "completed" && status !== "none" && (
            <Badge variant="secondary" className="text-xs">
              {isLoading && "Loading..."}
              {status === "queued" && !isLoading && "Queued"}
              {status === "processing" && !isLoading && "Processing..."}
              {status === "error" && !isLoading && "Error"}
            </Badge>
          )}
        </div>

        {(status === "queued" || status === "processing") && !isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Transcribing...</span>
          </div>
        )}

        {status === "error" && !isLoading && (
          <Button
            size="sm"
            variant="outline"
            onClick={retryTranscription}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Analysis boxes - Sentiment & Call Outcome */}
      {status === "completed" && analysis && (
        <div className="grid grid-cols-2 gap-3">
          {/* Sentiment Analysis Box */}
          <div className={`rounded-lg border p-4 ${sentimentInfo?.color || ""}`}>
            <div className="flex items-center gap-2 mb-2">
              {sentimentInfo && <sentimentInfo.icon className="h-4 w-4" />}
              <span className="text-xs font-medium uppercase tracking-wide">Sentiment Analysis</span>
            </div>
            <p className="text-lg font-semibold">{sentimentInfo?.label || "Unknown"}</p>
            {analysis.sentimentScore !== undefined && (
              <p className="text-xs mt-1 opacity-70">
                Score: {(analysis.sentimentScore * 100).toFixed(0)}%
              </p>
            )}
          </div>

          {/* Call Outcome Box */}
          <div className={`rounded-lg border p-4 ${outcomeInfo?.color || ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Call Outcome</span>
            </div>
            <p className="text-lg font-semibold">{outcomeInfo?.label || "Unknown"}</p>
          </div>
        </div>
      )}

      {/* Summary & Key Points */}
      {status === "completed" && analysis && (analysis.summary || analysis.keyPoints.length > 0) && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          {analysis.summary && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Summary</p>
              <p className="text-sm">{analysis.summary}</p>
            </div>
          )}

          {analysis.keyPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Key Points
              </p>
              <ul className="space-y-1">
                {analysis.keyPoints.map((point, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.nextSteps && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Next Steps
              </p>
              <p className="text-sm">{analysis.nextSteps}</p>
            </div>
          )}
        </div>
      )}

      {/* Transcript content */}
      {status === "completed" && transcript && (
        <ScrollArea className="h-[300px] rounded-md border p-4">
          <div className="space-y-4">
            {transcript.segments.length > 0 ? (
              // Speaker-diarized view
              transcript.segments.map((segment, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={segment.speaker === "You" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {segment.speaker === "You" ? (
                        <User className="h-3 w-3 mr-1" />
                      ) : (
                        <Users className="h-3 w-3 mr-1" />
                      )}
                      {segment.speaker}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(segment.startTime)}
                    </span>
                  </div>
                  <p className="text-sm pl-2 border-l-2 border-muted ml-2">
                    {segment.text}
                  </p>
                </div>
              ))
            ) : (
              // Plain text fallback when speaker detection unavailable
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  Speaker detection unavailable for this recording
                </div>
                <p className="text-sm whitespace-pre-wrap">{transcript.fullText}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Not started - show transcribe button */}
      {status === "none" && !isLoading && (
        <div className="h-[200px] rounded-md border flex items-center justify-center">
          <div className="text-center space-y-3">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Transcription not started yet
            </p>
            <Button onClick={retryTranscription} disabled={isLoading}>
              <FileText className="h-4 w-4 mr-2" />
              Start Transcription
            </Button>
          </div>
        </div>
      )}

      {/* Processing placeholder */}
      {(status === "queued" || status === "processing" || isLoading) && status !== "completed" && (
        <div className="h-[200px] rounded-md border flex items-center justify-center">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Transcribing your call with speaker detection...
            </p>
            <p className="text-xs text-muted-foreground">
              This usually takes 1-2 minutes
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
