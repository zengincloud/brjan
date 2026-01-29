"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Phone, Search, User, Building2, Calendar, Clock, Download } from "lucide-react"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

type CallRecording = {
  id: string
  from: string
  to: string
  status: string
  outcome: string | null
  duration: number | null
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
    company: string | null
  } | null
}

export function RecordingsList() {
  const [recordings, setRecordings] = useState<CallRecording[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [playingId, setPlayingId] = useState<string | null>(null)

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
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

      {/* Recordings List */}
      {filteredRecordings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-1">No recordings found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search"
                : "Call recordings will appear here automatically"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRecordings.map((recording) => (
            <Card key={recording.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {recording.prospect && (
                        <>
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{recording.prospect.name}</span>
                        </>
                      )}
                      {!recording.prospect && (
                        <span className="font-semibold">{recording.to}</span>
                      )}
                      {recording.outcome && (
                        <Badge variant="outline" className="capitalize">
                          {recording.outcome.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                    {recording.prospect?.company && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {recording.prospect.company}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {recording.startedAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(recording.startedAt), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      )}
                      {recording.recordingDuration && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(recording.recordingDuration)}
                        </div>
                      )}
                    </div>
                  </div>
                  {recording.recordingUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={recording.recordingUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Audio Player */}
                {recording.recordingUrl && (
                  <div>
                    <p className="text-sm font-medium mb-2">Recording</p>
                    <audio
                      controls
                      className="w-full"
                      onPlay={() => setPlayingId(recording.id)}
                      onPause={() => setPlayingId(null)}
                    >
                      <source src={recording.recordingUrl} type="audio/mpeg" />
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}

                {/* Transcription */}
                {recording.transcription ? (
                  <div>
                    <p className="text-sm font-medium mb-2">Transcription</p>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{recording.transcription}</p>
                    </div>
                  </div>
                ) : recording.transcriptionStatus === "in-progress" ? (
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground italic">
                      Transcription in progress...
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground italic">
                      No transcription available
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
