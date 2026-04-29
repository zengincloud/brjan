"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/date-range-picker"
import type { DateRange } from "react-day-picker"
import { addDays, format } from "date-fns"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"

export default function EmailsDeliveredPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  })
  const [emails, setEmails] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 50

  useEffect(() => {
    setLoading(true)
    setPage(1)
    const params = new URLSearchParams({ status: "sent", page: "1", pageSize: String(pageSize) })
    if (date?.from) params.set("from", date.from.toISOString())
    if (date?.to) params.set("to", date.to.toISOString())
    fetch(`/api/emails?${params}`)
      .then((r) => (r.ok ? r.json() : { emails: [], totalCount: 0 }))
      .then((data) => {
        setEmails(data.emails || [])
        setTotalCount(data.totalCount || 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [date])

  const loadMore = () => {
    const nextPage = page + 1
    const params = new URLSearchParams({ status: "sent", page: String(nextPage), pageSize: String(pageSize) })
    if (date?.from) params.set("from", date.from.toISOString())
    if (date?.to) params.set("to", date.to.toISOString())
    fetch(`/api/emails?${params}`)
      .then((r) => (r.ok ? r.json() : { emails: [] }))
      .then((data) => {
        setEmails((prev) => [...prev, ...(data.emails || [])])
        setPage(nextPage)
      })
      .catch(console.error)
  }

  const filteredEmails = emails

  // Compute real stats
  const totalSent = filteredEmails.length
  const opened = filteredEmails.filter((e: any) => e.openedAt).length
  const clicked = filteredEmails.filter((e: any) => e.clickedAt).length
  const openRate = totalSent > 0 ? Math.round((opened / totalSent) * 100) : 0
  const clickRate = totalSent > 0 ? Math.round((clicked / totalSent) * 100) : 0

  // Build chart data (group by date)
  const chartMap = new Map<string, { sent: number; opened: number; clicked: number }>()
  for (const email of filteredEmails) {
    const d = format(new Date(email.sentAt || email.createdAt), "yyyy-MM-dd")
    const entry = chartMap.get(d) || { sent: 0, opened: 0, clicked: 0 }
    entry.sent++
    if (email.openedAt) entry.opened++
    if (email.clickedAt) entry.clicked++
    chartMap.set(d, entry)
  }
  const chartData = Array.from(chartMap.entries())
    .map(([d, v]) => ({ date: d, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)

  // Build recent emails table
  const recentEmails = filteredEmails.slice(0, 10).map((e: any) => ({
    id: e.id,
    subject: e.subject,
    recipient: e.to,
    sent: e.sentAt ? format(new Date(e.sentAt), "yyyy-MM-dd HH:mm") : format(new Date(e.createdAt), "yyyy-MM-dd HH:mm"),
    opened: e.openedAt ? format(new Date(e.openedAt), "yyyy-MM-dd HH:mm") : "-",
    clicked: e.clickedAt ? format(new Date(e.clickedAt), "yyyy-MM-dd HH:mm") : "-",
  }))

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Emails Delivered</h1>
        <Card>
          <CardContent className="py-12 flex justify-center">
            <div className="relative" style={{ width: 72, height: 72 }}>
              <div className="br-loading-ring" style={{ inset: -18 }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brgradientfav.png" alt="Boilerroom" style={{ width: 72, height: 72, borderRadius: "50%" }} />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Emails Delivered</h1>
        <DateRangePicker date={date} setDate={setDate} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">No email data yet. Send emails to see performance trends.</p>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sent" stroke="#8884d8" />
                  <Line type="monotone" dataKey="opened" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="clicked" stroke="#ffc658" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-blue-600">{totalSent}</h3>
              <p className="text-sm text-gray-600">Emails Sent</p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-green-600">{openRate}%</h3>
              <p className="text-sm text-gray-600">Open Rate</p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-yellow-600">{clickRate}%</h3>
              <p className="text-sm text-gray-600">Click-through Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Emails</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEmails.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">No emails sent yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Clicked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEmails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell>{email.subject}</TableCell>
                    <TableCell>{email.recipient}</TableCell>
                    <TableCell>{email.sent}</TableCell>
                    <TableCell>{email.opened}</TableCell>
                    <TableCell>{email.clicked}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {emails.length < totalCount && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Load more ({emails.length} of {totalCount})
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
