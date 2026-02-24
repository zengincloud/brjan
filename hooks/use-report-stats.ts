"use client"

import { useState, useEffect } from "react"
import type { DateRange } from "react-day-picker"

export interface ReportStats {
  overview: {
    totalCalls: number
    totalEmailsSent: number
    connectRate: number
    meetingsBooked: number
    prevTotalCalls: number
    prevTotalEmailsSent: number
    prevConnectRate: number
    prevMeetingsBooked: number
  }
  activityByDay: {
    date: string
    label: string
    calls: number
    emailsSent: number
  }[]
  activityByType: {
    calls: { total: number; byOutcome: Record<string, number> }
    emails: { total: number; byType: Record<string, number> }
    tasks: { total: number; byType: Record<string, number> }
  }
  recentActivity: {
    id: string
    type: "call" | "email"
    target: string
    company: string | null
    detail: string
    time: string
    duration: number | null
  }[]
  callPerformance: {
    timeline: {
      period: string
      label: string
      totalCalls: number
      connected: number
      voicemail: number
      noAnswer: number
      avgDuration: number
    }[]
    summary: {
      totalCalls: number
      totalConnected: number
      totalVoicemail: number
      totalNoAnswer: number
      avgDuration: number
      connectRate: number
    }
    outcomeBreakdown: Record<string, number>
  }
  emailEngagement: {
    sent: number
    opened: number
    clicked: number
    bounced: number
    openRate: number
    clickRate: number
    bounceRate: number
  }
  pipeline: {
    prospectsByStatus: { status: string; label: string; count: number }[]
    prospectCreationTimeline: { period: string; label: string; newProspects: number }[]
    accountsByStatus: { status: string; label: string; count: number }[]
  }
  conversion: {
    funnel: { stage: string; label: string; count: number; fill: string }[]
    connectRateTrend: { period: string; label: string; connectRate: number; meetingRate: number }[]
  }
  sequences: {
    total: number
    active: number
    completed: number
    failed: number
    paused: number
    completionRate: number
  }
  tasks: {
    total: number
    byStatus: Record<string, number>
    byType: Record<string, number>
  }
}

export function useReportStats(date: DateRange | undefined) {
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (date?.from) params.set("from", date.from.toISOString())
        if (date?.to) params.set("to", date.to.toISOString())

        const res = await fetch(`/api/reports/stats?${params}`)
        if (!res.ok) throw new Error("Failed to fetch report stats")

        const data = await res.json()
        setStats(data)
      } catch (err: any) {
        console.error("Error fetching report stats:", err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [date?.from?.toISOString(), date?.to?.toISOString()])

  return { stats, isLoading, error }
}
