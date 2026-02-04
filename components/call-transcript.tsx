"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, FileText, RefreshCw, User, Users } from "lucide-react"

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
  const [pollCount, setPollCount] = useState(0)

  // Load existing transcription on mount
  useEffect(() => {
    if (initialStatus === "completed") {
      fetchTranscription()
    }
  }, [callId, initialStatus])

  // Poll for status when processing
  useEffect(() => {
    if (status === "queued" || status === "processing") {
      const interval = setInterval(() => {
        fetchTranscription()
        setPollCount((c) => c + 1)
      }, 3000) // Poll every 3 seconds

      // Stop polling after 5 minutes (100 polls)
      if (pollCount > 100) {
        clearInterval(interval)
        setError("Transcription timed out. Please try again.")
        setStatus("error")
      }

      return () => clearInterval(interval)
    }
  }, [status, pollCount])

  const fetchTranscription = async () => {
    try {
      const response = await fetch(`/api/calls/${callId}/transcribe`)
      const data = await response.json()

      if (data.status === "completed" && data.transcript) {
        setTranscript(data.transcript)
        setStatus("completed")
        onTranscriptionComplete?.()
      } else if (data.status === "error") {
        setError(data.error || "Transcription failed")
        setStatus("error")
      } else {
        setStatus(data.status)
      }
    } catch (err) {
      console.error("Error fetching transcription:", err)
    }
  }

  const startTranscription = async () => {
    setIsLoading(true)
    setError(null)
    setPollCount(0)

    try {
      const response = await fetch(`/api/calls/${callId}/transcribe`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to start transcription")
        return
      }

      setStatus(data.status || "queued")
    } catch (err: any) {
      setError(err.message || "Failed to start transcription")
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

  return (
    <div className="space-y-4">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium">Transcript</span>
          {status !== "none" && status !== "completed" && (
            <Badge variant="secondary" className="text-xs">
              {status === "queued" && "Queued"}
              {status === "processing" && "Processing..."}
              {status === "error" && "Error"}
            </Badge>
          )}
        </div>

        {status === "none" && (
          <Button
            size="sm"
            onClick={startTranscription}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Transcribe
          </Button>
        )}

        {(status === "queued" || status === "processing") && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Transcribing...</span>
          </div>
        )}

        {status === "error" && (
          <Button
            size="sm"
            variant="outline"
            onClick={startTranscription}
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

      {/* Transcript content */}
      {status === "completed" && transcript && (
        <ScrollArea className="h-[400px] rounded-md border p-4">
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
              // Plain text fallback
              <p className="text-sm whitespace-pre-wrap">{transcript.fullText}</p>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Processing placeholder */}
      {(status === "queued" || status === "processing") && (
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
