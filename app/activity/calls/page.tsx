"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/date-range-picker"
import type { DateRange } from "react-day-picker"
import { addDays } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Sample data for the chart
const callData = [
  { date: "2023-05-01", total: 50, connected: 30, voicemail: 15, notReached: 5 },
  { date: "2023-05-02", total: 45, connected: 25, voicemail: 12, notReached: 8 },
  { date: "2023-05-03", total: 55, connected: 35, voicemail: 18, notReached: 2 },
  { date: "2023-05-04", total: 48, connected: 28, voicemail: 14, notReached: 6 },
  { date: "2023-05-05", total: 52, connected: 32, voicemail: 16, notReached: 4 },
  { date: "2023-05-06", total: 47, connected: 27, voicemail: 13, notReached: 7 },
  { date: "2023-05-07", total: 53, connected: 33, voicemail: 17, notReached: 3 },
]

// Sample data for the table
const recentCalls = [
  {
    id: 1,
    contact: "John Doe",
    company: "ABC Corp",
    date: "2023-05-07 14:30",
    duration: "15:20",
    outcome: "Interested",
  },
  {
    id: 2,
    contact: "Sarah Smith",
    company: "XYZ Inc",
    date: "2023-05-07 11:15",
    duration: "08:45",
    outcome: "Follow-up",
  },
  {
    id: 3,
    contact: "Mike Johnson",
    company: "123 LLC",
    date: "2023-05-06 16:00",
    duration: "05:30",
    outcome: "Not interested",
  },
  {
    id: 4,
    contact: "Lisa Brown",
    company: "Tech Solutions",
    date: "2023-05-06 09:30",
    duration: "12:10",
    outcome: "Meeting scheduled",
  },
  {
    id: 5,
    contact: "David Lee",
    company: "Global Enterprises",
    date: "2023-05-05 13:45",
    duration: "10:00",
    outcome: "Voicemail",
  },
]

export default function CallsMadePage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  })

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
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={callData}>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Call Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-blue-400">350</h3>
              <p className="text-sm text-gray-400">Total Calls</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-green-400">60%</h3>
              <p className="text-sm text-gray-400">Connection Rate</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-yellow-400">8m 30s</h3>
              <p className="text-sm text-gray-400">Average Call Duration</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-purple-400">25%</h3>
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
                        call.outcome === "Interested" || call.outcome === "Meeting scheduled"
                          ? "success"
                          : call.outcome === "Follow-up"
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
        </CardContent>
      </Card>
    </div>
  )
}
