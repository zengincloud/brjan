"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import {
  Phone,
  Mail,
  Users,
  Zap,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Target,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

// Quick stats for the dashboard
const quickStats = [
  {
    label: "Active Prospects",
    value: "247",
    change: "+12%",
    icon: Users,
    trend: "up",
  },
  {
    label: "Calls Today",
    value: "34",
    change: "+8",
    icon: Phone,
    trend: "up",
  },
  {
    label: "Emails Sent",
    value: "156",
    change: "+23%",
    icon: Mail,
    trend: "up",
  },
  {
    label: "Meetings Booked",
    value: "8",
    change: "+3",
    icon: Calendar,
    trend: "up",
  },
]

// Active sequences summary
const activeSequences = [
  { name: "Enterprise Cold Outreach", prospects: 45, replies: 12, status: "active" },
  { name: "Sales Leaders", prospects: 78, replies: 18, status: "active" },
  { name: "SMB Prospecting", prospects: 120, replies: 34, status: "active" },
]

// Hot leads requiring attention
const hotLeads = [
  { name: "Sarah Kim", company: "Acme Corp", score: 98, action: "Follow-up call" },
  { name: "Michael Chen", company: "TechStart", score: 94, action: "Send proposal" },
  { name: "Emily Davis", company: "CloudFlow", score: 89, action: "Demo scheduled" },
]

type ApiTask = {
  id: string
  title: string
  description: string
  type: string
  status: string
  priority: string
  dueDate: string | null
  createdAt: string
  contact?: unknown
  company?: unknown
}

type UpcomingTask = {
  task: string
  time: string
  priority: string
}

const formatDueTime = (dueDate: string | null) => {
  if (!dueDate) return "unscheduled"
  return formatDistanceToNow(new Date(dueDate), { addSuffix: true })
}

export function DashboardOverview() {
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([])
  const [upcomingLoading, setUpcomingLoading] = useState(true)
  const [upcomingError, setUpcomingError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadUpcomingTasks = async () => {
      try {
        setUpcomingLoading(true)
        setUpcomingError(null)
        const response = await fetch("/api/tasks?view=upcoming")
        if (!response.ok) {
          throw new Error("Failed to load upcoming tasks")
        }
        const data = (await response.json()) as { tasks: ApiTask[] }
        const nextTasks = data.tasks.slice(0, 3).map((task) => ({
          task: task.title,
          time: formatDueTime(task.dueDate),
          priority: task.priority,
        }))
        if (isMounted) {
          setUpcomingTasks(nextTasks)
        }
      } catch (error) {
        console.error(error)
        if (isMounted) {
          setUpcomingError("Failed to load tasks")
        }
      } finally {
        if (isMounted) {
          setUpcomingLoading(false)
        }
      }
    }

    loadUpcomingTasks()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-accent" />
                    <span className="text-xs text-accent">{stat.change}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  )
}
