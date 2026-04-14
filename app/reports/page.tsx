"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/date-range-picker"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Phone, UserCheck, TrendingUp, CalendarCheck, MessageSquare, ArrowUp, ArrowDown, AlertCircle } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { DateRange } from "react-day-picker"
import { addDays, startOfWeek, endOfWeek, subWeeks } from "date-fns"
import { useReportStats } from "@/hooks/use-report-stats"

const timePresets = [
  { label: "This Week", value: "this_week" },
  { label: "Last Week", value: "last_week" },
  { label: "Last 30 Days", value: "last_30" },
  { label: "Last 60 Days", value: "last_60" },
  { label: "Last 90 Days", value: "last_90" },
  { label: "Custom", value: "custom" },
] as const

function getPresetRange(preset: string): DateRange {
  const now = new Date()
  switch (preset) {
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now }
    case "last_week": {
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      return { from: lastWeekStart, to: lastWeekEnd }
    }
    case "last_30":
      return { from: addDays(now, -30), to: now }
    case "last_60":
      return { from: addDays(now, -60), to: now }
    case "last_90":
      return { from: addDays(now, -90), to: now }
    default:
      return { from: addDays(now, -30), to: now }
  }
}

function StatChange({ current, previous, suffix = "" }: { current: number; previous: number; suffix?: string }) {
  const diff = current - previous
  if (diff === 0 || previous === 0) return null
  const isPositive = diff > 0
  return (
    <span className={`text-xs flex items-center gap-0.5 ${isPositive ? "text-green-500" : "text-red-500"}`}>
      {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(diff)}{suffix}
    </span>
  )
}

const DAYS_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

function formatHour(h: number): string {
  if (h === 0 || h === 12) return "12p"
  return h < 12 ? `${h}a` : `${h - 12}p`
}

export default function ReportsPage() {
  const [timePreset, setTimePreset] = useState("last_30")
  const [date, setDate] = useState<DateRange | undefined>(getPresetRange("last_30"))
  const { stats, isLoading, error } = useReportStats(date)

  const handlePresetChange = (value: string) => {
    setTimePreset(value)
    if (value !== "custom") {
      setDate(getPresetRange(value))
    }
  }

  const handleCustomDateChange = (newDate: DateRange | undefined) => {
    setTimePreset("custom")
    setDate(newDate)
  }

  const overview = stats?.overview
  const heatmapData = stats?.bestTimeToCall || []

  // Build heatmap grid
  const heatmapGrid: Record<string, Record<number, { calls: number; connectRate: number }>> = {}
  for (const day of DAYS_ORDER) {
    heatmapGrid[day] = {}
    for (const hour of HOURS) {
      heatmapGrid[day][hour] = { calls: 0, connectRate: 0 }
    }
  }
  for (const entry of heatmapData) {
    if (heatmapGrid[entry.day]?.[entry.hour] !== undefined) {
      heatmapGrid[entry.day][entry.hour] = { calls: entry.calls, connectRate: entry.connectRate }
    }
  }

  // Find max connect rate for color scaling
  const maxRate = Math.max(...heatmapData.map(e => e.connectRate), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-muted-foreground">Track what matters</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timePreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timePresets.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {timePreset === "custom" && (
            <DateRangePicker date={date} setDate={handleCustomDateChange} />
          )}
        </div>
      </div>

      {/* Error state */}
      {!isLoading && error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load report data. Please refresh the page and try again.</span>
        </div>
      )}

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-16" /><Skeleton className="h-4 w-24 mt-2" /></CardContent></Card>
          ))}
        </div>
      ) : !error && overview && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calls Made</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold">{overview.totalCalls}</span>
                <StatChange current={overview.totalCalls} previous={overview.prevTotalCalls} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected</CardTitle>
              <UserCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-primary">{overview.connectRate}%</span>
                <StatChange current={overview.connectRate} previous={overview.prevConnectRate} suffix="%" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">connect rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold">{overview.totalConversations}</div>
              <p className="text-xs text-muted-foreground mt-1">calls &gt; 1 min</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conv → Intro</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold">{overview.conversationToIntroRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">{overview.totalIntrosFromConversations} of {overview.totalConversations}</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Intros Booked</CardTitle>
              <CalendarCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-green-500">{overview.meetingsBooked}</span>
                <StatChange current={overview.meetingsBooked} previous={overview.prevMeetingsBooked} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && stats && stats.overview.totalCalls === 0 && stats.overview.totalEmailsSent === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <TrendingUp className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-base font-medium">No activity yet for this period</p>
          <p className="text-sm mt-1">Make calls and send emails to see your stats here.</p>
        </div>
      )}

      {/* Connect Rate Trend */}
      {!isLoading && !error && stats?.conversion?.connectRateTrend && stats.conversion.connectRateTrend.length > 1 && stats.overview.totalCalls > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Connect Rate Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.conversion.connectRateTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} unit="%" />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line type="monotone" dataKey="connectRate" name="Connect Rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="meetingRate" name="Intro Rate" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Best Time to Call Heatmap */}
        {!isLoading && !error && heatmapData.filter(e => e.calls > 0).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Best Time to Call</CardTitle>
              <p className="text-xs text-muted-foreground">Connect rate by day & hour</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left py-1 pr-2 font-medium text-muted-foreground"></th>
                      {HOURS.map(h => (
                        <th key={h} className="text-center py-1 px-0.5 font-medium text-muted-foreground w-8">{formatHour(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS_ORDER.map(day => (
                      <tr key={day}>
                        <td className="py-0.5 pr-2 font-medium text-muted-foreground">{day}</td>
                        {HOURS.map(hour => {
                          const cell = heatmapGrid[day]?.[hour] || { calls: 0, connectRate: 0 }
                          const intensity = cell.calls === 0 ? 0 : Math.max(0.15, cell.connectRate / maxRate)
                          return (
                            <td key={hour} className="p-0.5">
                              <div
                                className="w-full h-6 rounded-sm flex items-center justify-center cursor-default"
                                style={{
                                  backgroundColor: cell.calls === 0
                                    ? "hsl(var(--muted))"
                                    : `rgba(34, 197, 94, ${intensity})`,
                                }}
                                title={`${day} ${formatHour(hour)}: ${cell.connectRate}% connect rate (${cell.calls} calls)`}
                              >
                                {cell.calls > 0 && (
                                  <span className="text-[10px] font-medium" style={{ color: intensity > 0.5 ? "white" : "hsl(var(--foreground))" }}>
                                    {cell.connectRate}%
                                  </span>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Call Outcome Breakdown */}
        {!isLoading && !error && stats?.callPerformance?.outcomeBreakdown && stats.overview.totalCalls > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Call Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const outcomes = stats.callPerformance.outcomeBreakdown
                  const total = Object.values(outcomes).reduce((a, b) => a + b, 0)
                  if (total === 0) return <p className="text-sm text-muted-foreground">No calls yet</p>

                  const labels: Record<string, { label: string; color: string }> = {
                    connected_intro_booked: { label: "Intro Booked", color: "bg-green-500" },
                    connected_referral: { label: "Referral", color: "bg-blue-500" },
                    connected_not_interested: { label: "Not Interested", color: "bg-red-500" },
                    connected_info_gathered: { label: "Informational", color: "bg-purple-500" },
                    callback: { label: "Callback", color: "bg-amber-500" },
                    voicemail: { label: "Voicemail", color: "bg-orange-500" },
                    no_answer: { label: "No Answer", color: "bg-gray-500" },
                    wrong_number: { label: "Wrong Number", color: "bg-red-400" },
                  }

                  return Object.entries(outcomes)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, count]) => {
                      const info = labels[key] || { label: key.replace(/_/g, " "), color: "bg-gray-400" }
                      const pct = Math.round((count / total) * 100)
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{info.label}</span>
                            <span className="text-muted-foreground">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${info.color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })
                })()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sequence Performance */}
      {!isLoading && !error && stats?.sequencePerformance && stats.sequencePerformance.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sequence Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">Sequence</th>
                    <th className="text-right py-2 font-medium">Prospects</th>
                    <th className="text-right py-2 font-medium">Calls</th>
                    <th className="text-right py-2 font-medium">Connect Rate</th>
                    <th className="text-right py-2 font-medium">Intros</th>
                    <th className="text-right py-2 font-medium">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.sequencePerformance.map((seq) => (
                    <tr key={seq.name} className="border-b last:border-0">
                      <td className="py-2.5 font-medium">{seq.name}</td>
                      <td className="text-right py-2.5">{seq.prospects}</td>
                      <td className="text-right py-2.5">{seq.calls}</td>
                      <td className="text-right py-2.5">
                        <Badge variant={seq.connectRate > 20 ? "default" : "secondary"} className="text-xs">
                          {seq.connectRate}%
                        </Badge>
                      </td>
                      <td className="text-right py-2.5">
                        {seq.introsBooked > 0 ? (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/40 text-xs">{seq.introsBooked}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="text-right py-2.5 text-muted-foreground">{seq.completionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity by Day */}
      {!isLoading && !error && stats?.activityByDay && stats.activityByDay.length > 1 && stats.overview.totalCalls > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.activityByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line type="monotone" dataKey="calls" name="Calls" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="emailsSent" name="Emails" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-[300px] w-full rounded-lg" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[300px] rounded-lg" />
            <Skeleton className="h-[300px] rounded-lg" />
          </div>
        </div>
      )}
    </div>
  )
}
