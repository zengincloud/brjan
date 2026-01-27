"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, Clock, User, Building2 } from "lucide-react"
import { format } from "date-fns"

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
      voicemail: { variant: "secondary", label: "Voicemail" },
      no_answer: { variant: "outline", label: "No Answer" },
      busy: { variant: "outline", label: "Busy" },
      failed: { variant: "destructive", label: "Failed" },
      gatekeeper: { variant: "secondary", label: "Gatekeeper" },
    }

    const config = variants[outcome] || { variant: "outline" as const, label: outcome }

    return (
      <Badge variant={config.variant} className="text-xs">
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
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Call History ({calls.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {calls.map((call) => (
            <div key={call.id} className="p-3 rounded-lg border bg-card space-y-2">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {call.prospect && !prospectId && (
                    <div className="mb-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{call.prospect.name}</span>
                      </div>
                      {call.prospect.company && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{call.prospect.company}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span className="font-mono">{call.to}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {call.outcome && getOutcomeBadge(call.outcome)}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(call.duration)}</span>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="text-xs text-muted-foreground">
                {format(new Date(call.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </div>

              {/* Notes */}
              {call.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">{call.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
