"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/date-range-picker"
import type { DateRange } from "react-day-picker"
import { addDays, format } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

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
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  })
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 50

  useEffect(() => {
    setLoading(true)
    setPage(1)
    const params = new URLSearchParams({ page: "1", pageSize: String(pageSize) })
    if (date?.from) params.set("from", date.from.toISOString())
    if (date?.to) params.set("to", date.to.toISOString())
    fetch(`/api/calls?${params}`)
      .then((r) => (r.ok ? r.json() : { calls: [], totalCount: 0 }))
      .then((data) => {
        setCalls(data.calls || [])
        setTotalCount(data.totalCount || 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [date])

  const loadMore = () => {
    const nextPage = page + 1
    const params = new URLSearchParams({ page: String(nextPage), pageSize: String(pageSize) })
    if (date?.from) params.set("from", date.from.toISOString())
    if (date?.to) params.set("to", date.to.toISOString())
    fetch(`/api/calls?${params}`)
      .then((r) => (r.ok ? r.json() : { calls: [] }))
      .then((data) => {
        setCalls((prev) => [...prev, ...(data.calls || [])])
        setPage(nextPage)
      })
      .catch(console.error)
  }

  const filteredCalls = calls

  // Compute real stats
  const totalCalls = filteredCalls.length
  const connectedCalls = filteredCalls.filter((c: any) =>
    c.outcome && c.outcome.startsWith("connected")
  ).length
  const connectionRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0
  const callsWithDuration = filteredCalls.filter((c: any) => c.duration && c.duration > 0)
  const avgDurationSec = callsWithDuration.length > 0
    ? Math.round(callsWithDuration.reduce((sum: number, c: any) => sum + c.duration, 0) / callsWithDuration.length)
    : 0
  const avgDurationStr = avgDurationSec > 0
    ? `${Math.floor(avgDurationSec / 60)}m ${avgDurationSec % 60}s`
    : "0m 0s"
  const positiveCalls = filteredCalls.filter((c: any) =>
    c.outcome === "connected" || c.outcome === "connected_intro_booked" || c.outcome === "connected_referral" || c.outcome === "connected_info_gathered"
  ).length
  const positiveRate = totalCalls > 0 ? Math.round((positiveCalls / totalCalls) * 100) : 0

  // Build chart data from real calls (group by date)
  const chartDataMap = new Map<string, { connected: number; voicemail: number; notReached: number }>()
  for (const call of filteredCalls) {
    const d = format(new Date(call.createdAt), "yyyy-MM-dd")
    const entry = chartDataMap.get(d) || { connected: 0, voicemail: 0, notReached: 0 }
    if (call.outcome?.startsWith("connected")) entry.connected++
    else if (call.outcome === "voicemail") entry.voicemail++
    else entry.notReached++
    chartDataMap.set(d, entry)
  }
  const chartData = Array.from(chartDataMap.entries())
    .map(([d, v]) => ({ date: d, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)

  // Build recent calls table from real data
  const recentCalls = filteredCalls.slice(0, 10).map((c: any) => ({
    id: c.id,
    contact: c.prospect?.name || c.to,
    company: c.prospect?.company || "--",
    date: format(new Date(c.createdAt), "yyyy-MM-dd HH:mm"),
    duration: formatDuration(c.duration),
    outcome: outcomeLabels[c.outcome] || c.outcome || c.status,
  }))

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
              <h3 className="text-2xl font-bold text-blue-400">{totalCalls}</h3>
              <p className="text-sm text-gray-400">Total Calls</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-green-400">{connectionRate}%</h3>
              <p className="text-sm text-gray-400">Connection Rate</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-yellow-400">{avgDurationStr}</h3>
              <p className="text-sm text-gray-400">Average Call Duration</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-purple-400">{positiveRate}%</h3>
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
          {calls.length < totalCount && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Load more ({calls.length} of {totalCount})
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
