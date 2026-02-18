"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mail, Phone } from "lucide-react"
import { useUserRole } from "@/hooks/use-user-role"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import { formatDistanceToNow } from "date-fns"

const demoActivities = [
  { id: "1", type: "email" as const, user: "John Doe", action: "sent an email to", target: "Sarah Smith", time: "2 hours ago" },
  { id: "2", type: "call" as const, user: "Emily Brown", action: "had a call with", target: "Michael Johnson", time: "4 hours ago" },
  { id: "3", type: "email" as const, user: "David Wilson", action: "sent an email to", target: "Tech Corp", time: "Yesterday" },
  { id: "4", type: "call" as const, user: "Sarah Smith", action: "missed a call with", target: "Startup Inc", time: "Yesterday" },
]

export function ActivityFeed() {
  const { isSuperAdmin } = useUserRole()
  const { stats } = useDashboardStats()

  // Build activities from real data or use demo
  const activities = isSuperAdmin
    ? demoActivities
    : (stats?.recentActivity ?? []).map((item) => ({
        id: item.id,
        type: item.type,
        user: "You",
        action: item.type === "email" ? "sent an email to" : "called",
        target: item.target + (item.company ? ` at ${item.company}` : ""),
        time: formatDistanceToNow(new Date(item.time), { addSuffix: true }),
      }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">No recent activity yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <Avatar className="mt-1">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback>
                    {activity.user
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-none">
                      {activity.user} {activity.action} {activity.target}
                    </p>
                    {activity.type === "email" ? (
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
