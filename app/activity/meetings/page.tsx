"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Sample data for meetings
const meetings = [
  {
    id: 1,
    title: "Product Demo",
    date: new Date(2023, 4, 15, 10, 0),
    attendees: ["John Doe", "Sarah Smith"],
    status: "completed",
  },
  {
    id: 2,
    title: "Follow-up Call",
    date: new Date(2023, 4, 17, 14, 30),
    attendees: ["Mike Johnson"],
    status: "scheduled",
  },
  {
    id: 3,
    title: "Contract Negotiation",
    date: new Date(2023, 4, 20, 11, 0),
    attendees: ["Lisa Brown", "David Lee"],
    status: "scheduled",
  },
  { id: 4, title: "Team Sync", date: new Date(2023, 4, 22, 9, 0), attendees: ["Team Members"], status: "scheduled" },
  {
    id: 5,
    title: "Quarterly Review",
    date: new Date(2023, 4, 25, 13, 0),
    attendees: ["Executive Team"],
    status: "scheduled",
  },
]

export default function MeetingsHadPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const meetingsOnSelectedDate = meetings.filter(
    (meeting) => meeting.date.toDateString() === selectedDate?.toDateString(),
  )

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Meetings</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meetings on {selectedDate?.toDateString()}</CardTitle>
          </CardHeader>
          <CardContent>
            {meetingsOnSelectedDate.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Attendees</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetingsOnSelectedDate.map((meeting) => (
                    <TableRow key={meeting.id}>
                      <TableCell>{meeting.title}</TableCell>
                      <TableCell>
                        {meeting.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell>{meeting.attendees.join(", ")}</TableCell>
                      <TableCell>
                        <Badge variant={meeting.status === "completed" ? "secondary" : "default"}>
                          {meeting.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p>No meetings scheduled for this date.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meeting Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-blue-600">15</h3>
              <p className="text-sm text-gray-600">Total Meetings This Month</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-green-600">80%</h3>
              <p className="text-sm text-gray-600">Meeting Attendance Rate</p>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-yellow-600">4.5/5</h3>
              <p className="text-sm text-gray-600">Average Meeting Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
