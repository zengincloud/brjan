"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

// Upcoming tasks
const upcomingTasks = [
  { task: "Call Sarah Kim (Acme Corp)", time: "in 15 min", priority: "high" },
  { task: "Send proposal to TechStart", time: "in 1 hour", priority: "medium" },
  { task: "Review CloudFlow deal", time: "in 2 hours", priority: "low" },
]

export function DashboardOverview() {
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

      {/* Main Overview Grid */}
      <Card className="border-border bg-card overflow-hidden">
        {/* Window Controls Bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-muted-foreground ml-2">Activity Overview</span>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="bg-accent/20 text-accent border-0 gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Live
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[300px]">
          {/* Active Sequences Panel */}
          <div className="border-r border-border p-4 bg-secondary/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                Active Sequences
              </h3>
              <span className="text-xs text-accent font-medium">{activeSequences.length} running</span>
            </div>
            <div className="space-y-3">
              {activeSequences.map((seq) => (
                <div
                  key={seq.name}
                  className="p-3 rounded-lg bg-secondary/30 border border-border hover:border-accent/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground truncate">{seq.name}</span>
                    <span className="w-2 h-2 rounded-full bg-accent" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {seq.prospects}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-accent" /> {seq.replies} replies
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hot Leads Panel */}
          <div className="border-r border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" />
                Hot Leads
              </h3>
              <span className="text-xs text-accent font-medium">AI Scored</span>
            </div>
            <div className="space-y-3">
              {hotLeads.map((lead) => (
                <div
                  key={lead.name}
                  className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20 hover:bg-accent/10 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {lead.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.company}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-accent">{lead.score}</span>
                    <p className="text-xs text-muted-foreground">{lead.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Tasks Panel */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-medium text-foreground">Upcoming Tasks</h3>
            </div>
            <div className="space-y-2">
              {upcomingTasks.map((task, i) => (
                <div
                  key={task.task}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg transition-all",
                    i === 0 ? "bg-accent/10 border border-accent/30" : "bg-secondary/30"
                  )}
                >
                  {i === 0 ? (
                    <ArrowRight className="w-4 h-4 text-accent flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground block truncate">{task.task}</span>
                  </div>
                  <span
                    className={cn(
                      "text-xs",
                      i === 0 ? "text-accent font-medium" : "text-muted-foreground"
                    )}
                  >
                    {task.time}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-colors text-sm font-medium">
                  <Phone className="w-4 h-4" />
                  Start Dialer
                </button>
                <button className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors text-sm font-medium">
                  <Mail className="w-4 h-4" />
                  Send Emails
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
