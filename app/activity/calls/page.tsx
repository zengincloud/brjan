"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/date-range-picker"
import type { DateRange } from "react-day-picker"
import { addDays, format } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useUserRole } from "@/hooks/use-user-role"
import { Loader2 } from "lucide-react"

// Demo data for super admin
const demoCallData = [
  { date: "2023-05-01", total: 50, connected: 30, voicemail: 15, notReached: 5 },
  { date: "2023-05-02", total: 45, connected: 25, voicemail: 12, notReached: 8 },
  { date: "2023-05-03", total: 55, connected: 35, voicemail: 18, notReached: 2 },
  { date: "2023-05-04", total: 48, connected: 28, voicemail: 14, notReached: 6 },
  { date: "2023-05-05", total: 52, connected: 32, voicemail: 16, notReached: 4 },
  { date: "2023-05-06", total: 47, connected: 27, voicemail: 13, notReached: 7 },
  { date: "2023-05-07", total: 53, connected: 33, voicemail: 17, notReached: 3 },
]

const demoRecentCalls = [
  { id: "1", contact: "John Doe", company: "ABC Corp", date: "2023-05-07 14:30", duration: "15:20", outcome: "Interested" },
  { id: "2", contact: "Sarah Smith", company: "XYZ Inc", date: "2023-05-07 11:15", duration: "08:45", outcome: "Follow-up" },
  { id: "3", contact: "Mike Johnson", company: "123 LLC", date: "2023-05-06 16:00", duration: "05:30", outcome: "Not interested" },
  { id: "4", contact: "Lisa Brown", company: "Tech Solutions", date: "2023-05-06 09:30", duration: "12:10", outcome: "Meeting scheduled" },
  { id: "5", contact: "David Lee", company: "Global Enterprises", date: "2023-05-05 13:45", duration: "10:00", outcome: "Voicemail" },
]

const demoStats = { totalCalls: 350, connectionRate: "60%", avgDuration: "8m 30s", positiveRate: "25%" }

const outcomeLabels: Record<string, string> = {
  connected: "Connected",
  connected_intro_booked: "Intro Booked",
  connected_referral: "Referral",
  connected_not_interested: "Not interested",
  connected_info_gathered: "Info Gathered",
  voicemail: "Voicemail",
  no_answer: "No answer",
  busy: "Busy",
  failed: "Failed",
  gatekeeper: "Gatekeeper",
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function CallsMadePage() {
  const { isSuperAdmin } = useUserRole()
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  })
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSuperAdmin) {
      setLoading(false)
      return
    }
    fetch("/api/calls")
      .then((r) => (r.ok ? r.json() : { calls: [] }))
      .then((data) => setCalls(data.calls || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isSuperAdmin])

  // Compute real stats
  const totalCalls = calls.length
  const connectedCalls = calls.filter((c: any) =>
    c.outcome && c.outcome.startsWith("connected")
  ).length
  const connectionRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0
  const callsWithDuration = calls.filter((c: any) => c.duration && c.duration > 0)
  const avgDurationSec = callsWithDuration.length > 0
    ? Math.round(callsWithDuration.reduce((sum: number, c: any) => sum + c.duration, 0) / callsWithDuration.length)
    : 0
  const avgDurationStr = avgDurationSec > 0
    ? `${Math.floor(avgDurationSec / 60)}m ${avgDurationSec % 60}s`
    : "0m 0s"
  const positiveCalls = calls.filter((c: any) =>
    c.outcome === "connected" || c.outcome === "connected_intro_booked" || c.outcome === "connected_referral" || c.outcome === "connected_info_gathered"
  ).length
  const positiveRate = totalCalls > 0 ? Math.round((positiveCalls / totalCalls) * 100) : 0

  // Build chart data from real calls (group by date)
  const chartDataMap = new Map<string, { connected: number; voicemail: number; notReached: number }>()
  for (const call of calls) {
    const d = format(new Date(call.createdAt), "yyyy-MM-dd")
    const entry = chartDataMap.get(d) || { connected: 0, voicemail: 0, notReached: 0 }
    if (call.outcome?.startsWith("connected")) entry.connected++
    else if (call.outcome === "voicemail") entry.voicemail++
    else entry.notReached++
    chartDataMap.set(d, entry)
  }
  const realChartData = Array.from(chartDataMap.entries())
    .map(([d, v]) => ({ date: d, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)

  // Build recent calls table from real data
  const realRecentCalls = calls.slice(0, 10).map((c: any) => ({
    id: c.id,
    contact: c.prospect?.name || c.to,
    company: c.prospect?.company || "--",
    date: format(new Date(c.createdAt), "yyyy-MM-dd HH:mm"),
    duration: formatDuration(c.duration),
    outcome: outcomeLabels[c.outcome] || c.outcome || c.status,
  }))

  const chartData = isSuperAdmin ? demoCallData : realChartData
  const recentCalls = isSuperAdmin ? demoRecentCalls : realRecentCalls
  const stats = isSuperAdmin
    ? demoStats
    : { totalCalls: String(totalCalls), connectionRate: `${connectionRate}%`, avgDuration: avgDurationStr, positiveRate: `${positiveRate}%` }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Calls Made</h1>
        <Card>
          <CardContent className="py-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Calls Made</h1>
        <DateRangePicker date={date} setDate={setDate} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Call Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">No call data yet. Make calls to see performance trends.</p>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                  <Legend />
                  <Bar dataKey="connected" stackId="a" fill="#8B5CF6" />
                  <Bar dataKey="voicemail" stackId="a" fill="#10B981" />
                  <Bar dataKey="notReached" stackId="a" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Call Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-blue-400">{stats.totalCalls}</h3>
              <p className="text-sm text-gray-400">Total Calls</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-green-400">{stats.connectionRate}</h3>
              <p className="text-sm text-gray-400">Connection Rate</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-yellow-400">{stats.avgDuration}</h3>
              <p className="text-sm text-gray-400">Average Call Duration</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-purple-400">{stats.positiveRate}</h3>
              <p className="text-sm text-gray-400">Positive Outcome Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCalls.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">No calls yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>{call.contact}</TableCell>
                    <TableCell>{call.company}</TableCell>
                    <TableCell>{call.date}</TableCell>
                    <TableCell>{call.duration}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          call.outcome === "Interested" || call.outcome === "Meeting scheduled" || call.outcome === "Intro Booked"
                            ? "success"
                            : call.outcome === "Follow-up" || call.outcome === "Connected"
                              ? "warning"
                              : call.outcome === "Not interested"
                                ? "destructive"
                                : "secondary"
                        }
                      >
                        {call.outcome}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
