"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import type { DateRange } from "react-day-picker"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { ReportStats } from "@/hooks/use-report-stats"

interface ActivityReportProps {
  date?: DateRange | undefined
  fullWidth?: boolean
  isLoading?: boolean
  data?: {
    activityByDay?: ReportStats["activityByDay"]
    activityByType?: ReportStats["activityByType"]
    recentActivity?: ReportStats["recentActivity"]
    emailEngagement?: ReportStats["emailEngagement"]
  }
}

const outcomeLabels: Record<string, string> = {
  connected: "Connected",
  connected_intro_booked: "Intro Booked",
  connected_referral: "Referral",
  connected_not_interested: "Not Interested",
  connected_info_gathered: "Info Gathered",
  voicemail: "Voicemail",
  no_answer: "No Answer",
  busy: "Busy",
  failed: "Failed",
  gatekeeper: "Gatekeeper",
}

const outcomeColors: Record<string, string> = {
  connected: "#22c55e",
  connected_intro_booked: "#16a34a",
  connected_referral: "#15803d",
  connected_not_interested: "#ef4444",
  connected_info_gathered: "#3b82f6",
  voicemail: "#f59e0b",
  no_answer: "#6b7280",
  busy: "#a855f7",
  failed: "#dc2626",
  gatekeeper: "#8b5cf6",
}

export function ActivityReport({ date, fullWidth = false, isLoading, data }: ActivityReportProps) {
  if (isLoading) {
    return (
      <Card className={fullWidth ? "w-full" : ""}>
        <CardHeader>
          <CardTitle>Activity Metrics</CardTitle>
          <CardDescription>Calls, emails, and engagement</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const activityByDay = data?.activityByDay || []
  const activityByType = data?.activityByType
  const recentActivity = data?.recentActivity || []
  const emailEngagement = data?.emailEngagement

  const hasData = activityByDay.some(d => d.calls > 0 || d.emailsSent > 0)

  if (!hasData && recentActivity.length === 0) {
    return (
      <Card className={fullWidth ? "w-full" : ""}>
        <CardHeader>
          <CardTitle>Activity Metrics</CardTitle>
          <CardDescription>Calls, emails, and engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>No activity data yet. Start making calls and sending emails to see metrics here.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Build outcome breakdown data for the chart
  const outcomeChartData = Object.entries(activityByType?.calls.byOutcome || {})
    .map(([outcome, count]) => ({
      name: outcomeLabels[outcome] || outcome,
      count,
      fill: outcomeColors[outcome] || "#6b7280",
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <Card className={fullWidth ? "w-full" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Metrics</CardTitle>
            <CardDescription>Calls, emails, and engagement</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="h-[300px]">
              <ChartContainer
                config={{
                  calls: { label: "Calls", color: "#10B981" },
                  emailsSent: { label: "Emails", color: "#8B5CF6" },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="label" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                    <Legend />
                    <Bar dataKey="calls" fill="#10B981" name="Calls" />
                    <Bar dataKey="emailsSent" fill="#8B5CF6" name="Emails" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Phone className="h-4 w-4 text-green-500" />
                  <div className="text-sm text-muted-foreground">Calls</div>
                </div>
                <div className="text-2xl font-bold">{activityByType?.calls.total ?? 0}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-purple-500" />
                  <div className="text-sm text-muted-foreground">Emails Sent</div>
                </div>
                <div className="text-2xl font-bold">{activityByType?.emails.total ?? 0}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Open Rate</div>
                <div className="text-2xl font-bold">{emailEngagement?.openRate ?? 0}%</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Click Rate</div>
                <div className="text-2xl font-bold">{emailEngagement?.clickRate ?? 0}%</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="breakdown">
            {outcomeChartData.length > 0 ? (
              <>
                <h3 className="text-sm font-medium mb-3">Call Outcomes</h3>
                <div className="h-[300px]">
                  <ChartContainer
                    config={{
                      count: { label: "Count", color: "#10B981" },
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={outcomeChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" stroke="#9CA3AF" />
                        <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={110} />
                        <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                        <Bar dataKey="count" fill="#10B981">
                          {outcomeChartData.map((entry, index) => (
                            <Bar key={index} dataKey="count" fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>

                <div className="mt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Outcome</th>
                        <th className="text-right py-2">Count</th>
                        <th className="text-right py-2">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outcomeChartData.map((item) => (
                        <tr key={item.name} className="border-b">
                          <td className="py-2">{item.name}</td>
                          <td className="text-right py-2">{item.count}</td>
                          <td className="text-right py-2">
                            {activityByType?.calls.total
                              ? Math.round((item.count / activityByType.calls.total) * 100)
                              : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>No call outcomes recorded yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent">
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-3 border rounded-lg">
                    <div className="mt-1">
                      {activity.type === "email" && <Mail className="h-5 w-5 text-purple-500" />}
                      {activity.type === "call" && <Phone className="h-5 w-5 text-green-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">{activity.target}</div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {activity.type === "call"
                          ? `${outcomeLabels[activity.detail] || activity.detail}${activity.duration ? ` (${Math.round(activity.duration / 60)}m)` : ""}`
                          : activity.detail}
                      </div>
                      {activity.company && (
                        <div className="text-xs text-muted-foreground">{activity.company}</div>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize shrink-0">
                      {activity.type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>No recent activity.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
