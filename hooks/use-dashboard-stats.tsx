"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

interface QuickStats {
  activeProspects: number
  callsToday: number
  emailsSentToday: number
  meetingsBooked: number
}

interface StatusCounts {
  total: number
  [key: string]: number
}

interface WeeklyProgress {
  emails: number
  calls: number
  leads: number
  linkedin: number
}

interface RecentActivityItem {
  id: string
  type: "call" | "email"
  target: string
  company: string | null
  detail: string
  time: string
}

interface WeeklyTargets {
  emails: number
  calls: number
  leads: number
  linkedin: number
}

export interface DashboardStats {
  quickStats: QuickStats
  prospectStatuses: StatusCounts
  accountStatuses: StatusCounts
  weeklyProgress: WeeklyProgress
  recentActivity: RecentActivityItem[]
  weeklyTargets: WeeklyTargets
}

interface DashboardStatsContextValue {
  stats: DashboardStats | null
  isLoading: boolean
}

const defaultStats: DashboardStats = {
  quickStats: { activeProspects: 0, callsToday: 0, emailsSentToday: 0, meetingsBooked: 0 },
  prospectStatuses: { total: 0, new_lead: 0, in_sequence: 0, contacted: 0, meeting_scheduled: 0, qualified: 0, unqualified: 0 },
  accountStatuses: { total: 0, new_lead: 0, in_sequence: 0, contacted: 0, meeting_scheduled: 0, customer: 0, churned: 0 },
  weeklyProgress: { emails: 0, calls: 0, leads: 0, linkedin: 0 },
  recentActivity: [],
  weeklyTargets: { emails: 40, calls: 500, leads: 50, linkedin: 20 },
}

const DashboardStatsContext = createContext<DashboardStatsContextValue>({
  stats: null,
  isLoading: true,
})

export function DashboardStatsProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    fetch("/api/dashboard/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setStats(data)
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <DashboardStatsContext.Provider value={{ stats, isLoading }}>
      {children}
    </DashboardStatsContext.Provider>
  )
}

export function useDashboardStats() {
  return useContext(DashboardStatsContext)
}
