"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/date-range-picker"
import type { DateRange } from "react-day-picker"
import { addDays } from "date-fns"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Sample data for the chart
const emailData = [
  { date: "2023-05-01", sent: 100, opened: 65, clicked: 30 },
  { date: "2023-05-02", sent: 120, opened: 80, clicked: 40 },
  { date: "2023-05-03", sent: 90, opened: 60, clicked: 25 },
  { date: "2023-05-04", sent: 110, opened: 75, clicked: 35 },
  { date: "2023-05-05", sent: 130, opened: 85, clicked: 45 },
  { date: "2023-05-06", sent: 95, opened: 70, clicked: 30 },
  { date: "2023-05-07", sent: 105, opened: 72, clicked: 32 },
]

// Sample data for the table
const recentEmails = [
  {
    id: 1,
    subject: "Follow-up on our conversation",
    recipient: "john@example.com",
    sent: "2023-05-07 14:30",
    opened: "2023-05-07 15:45",
    clicked: "2023-05-07 16:00",
  },
  {
    id: 2,
    subject: "New product announcement",
    recipient: "sarah@example.com",
    sent: "2023-05-07 10:15",
    opened: "2023-05-07 11:30",
    clicked: "-",
  },
  {
    id: 3,
    subject: "Meeting request",
    recipient: "mike@example.com",
    sent: "2023-05-06 16:45",
    opened: "-",
    clicked: "-",
  },
  {
    id: 4,
    subject: "Quarterly report",
    recipient: "lisa@example.com",
    sent: "2023-05-06 09:00",
    opened: "2023-05-06 09:30",
    clicked: "2023-05-06 10:15",
  },
  {
    id: 5,
    subject: "Partnership opportunity",
    recipient: "david@example.com",
    sent: "2023-05-05 13:20",
    opened: "2023-05-05 14:10",
    clicked: "2023-05-05 14:30",
  },
]

export default function EmailsDeliveredPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Emails Delivered</h1>
        <DateRangePicker date={date} setDate={setDate} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={emailData}>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-blue-600">750</h3>
              <p className="text-sm text-gray-600">Emails Sent</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-green-600">68%</h3>
              <p className="text-sm text-gray-600">Open Rate</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-yellow-600">25%</h3>
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
        </CardContent>
      </Card>
    </div>
  )
}
