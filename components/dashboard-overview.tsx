"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  Phone,
  Mail,
  Users,
  TrendingUp,
  Calendar,
} from "lucide-react"
import { useUserRole } from "@/hooks/use-user-role"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"

// Demo quick stats for super admin
const demoQuickStats = [
  { label: "Active Prospects", value: "247", change: "+12%", icon: Users, trend: "up" },
  { label: "Calls Today", value: "34", change: "+8", icon: Phone, trend: "up" },
  { label: "Emails Sent", value: "156", change: "+23%", icon: Mail, trend: "up" },
  { label: "Meetings Booked", value: "8", change: "+3", icon: Calendar, trend: "up" },
]

export function DashboardOverview() {
  const { isSuperAdmin } = useUserRole()
  const { stats } = useDashboardStats()

  // Build quick stats from real data or demo data
  const quickStats = isSuperAdmin
    ? demoQuickStats
    : [
        { label: "Active Prospects", value: String(stats?.quickStats.activeProspects ?? 0), change: "--", icon: Users, trend: "up" },
        { label: "Calls Today", value: String(stats?.quickStats.callsToday ?? 0), change: "--", icon: Phone, trend: "up" },
        { label: "Emails Sent", value: String(stats?.quickStats.emailsSentToday ?? 0), change: "--", icon: Mail, trend: "up" },
        { label: "Meetings Booked", value: String(stats?.quickStats.meetingsBooked ?? 0), change: "--", icon: Calendar, trend: "up" },
      ]

  return (
    <div className="space-y-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-semibold mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-accent" />
                    <span className="text-[11px] text-accent">{stat.change}</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <stat.icon className="w-4 h-4 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  )
}
