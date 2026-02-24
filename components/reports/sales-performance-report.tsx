"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import type { DateRange } from "react-day-picker"
import { Loader2 } from "lucide-react"
import type { ReportStats } from "@/hooks/use-report-stats"

interface SalesPerformanceReportProps {
  date?: DateRange | undefined
  fullWidth?: boolean
  isLoading?: boolean
  data?: ReportStats["callPerformance"]
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

export function SalesPerformanceReport({ date, fullWidth = false, isLoading, data }: SalesPerformanceReportProps) {
  if (isLoading) {
    return (
      <Card className={fullWidth ? "w-full" : ""}>
        <CardHeader>
          <CardTitle>Call Performance</CardTitle>
          <CardDescription>Call volume, outcomes, and connect rates</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const timeline = data?.timeline || []
  const summary = data?.summary
  const outcomeBreakdown = data?.outcomeBreakdown || {}
  const hasData = summary && summary.totalCalls > 0

  if (!hasData) {
    return (
      <Card className={fullWidth ? "w-full" : ""}>
        <CardHeader>
          <CardTitle>Call Performance</CardTitle>
          <CardDescription>Call volume, outcomes, and connect rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>No call data yet. Start making calls to see performance metrics here.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const outcomeChartData = Object.entries(outcomeBreakdown)
    .map(([outcome, count]) => ({
      name: outcomeLabels[outcome] || outcome,
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <Card className={fullWidth ? "w-full" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Call Performance</CardTitle>
            <CardDescription>Call volume, outcomes, and connect rates</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="timeline">
          <TabsList className="mb-4">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="outcomes">Outcome Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <div className="h-[350px]">
              <ChartContainer
                config={{
                  totalCalls: { label: "Total Calls", color: "#6366f1" },
                  connected: { label: "Connected", color: "#22c55e" },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="label" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                    <Legend />
                    <Line type="monotone" dataKey="totalCalls" stroke="#6366f1" strokeWidth={2} name="Total Calls" />
                    <Line type="monotone" dataKey="connected" stroke="#22c55e" strokeWidth={2} name="Connected" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Total Calls</div>
                <div className="text-2xl font-bold">{summary.totalCalls}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Connected</div>
                <div className="text-2xl font-bold">{summary.totalConnected}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Connect Rate</div>
                <div className="text-2xl font-bold">{summary.connectRate}%</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Avg. Duration</div>
                <div className="text-2xl font-bold">{formatDuration(summary.avgDuration)}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="outcomes">
            <div className="h-[350px]">
              <ChartContainer
                config={{
                  count: { label: "Count", color: "#6366f1" },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={outcomeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" angle={-30} textAnchor="end" height={70} />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                    <Bar dataKey="count" fill="#6366f1" name="Calls" />
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
                    <th className="text-right py-2">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {outcomeChartData.map((item) => (
                    <tr key={item.name} className="border-b">
                      <td className="py-2">{item.name}</td>
                      <td className="text-right py-2">{item.count}</td>
                      <td className="text-right py-2">
                        {Math.round((item.count / summary.totalCalls) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
