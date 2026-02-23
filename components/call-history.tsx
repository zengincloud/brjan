"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone } from "lucide-react"

type Call = {
  id: string
  outcome: string | null
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Call History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalCalls === 0 ? (
          <p className="text-sm text-muted-foreground">No calls yet</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Called {totalCalls} time{totalCalls !== 1 ? "s" : ""}, answered {answeredCalls} time{answeredCalls !== 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
