"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"

interface MeetingItem {
  id: string
  title: string
  date: Date
  attendees: string[]
  status: string
}

export default function MeetingsHadPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [meetings, setMeetings] = useState<MeetingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch prospects with meeting_scheduled status as a proxy for meetings
    fetch("/api/prospects?status=meeting_scheduled")
      .then((r) => (r.ok ? r.json() : { prospects: [] }))
      .then((data) => {
        const prospects = data.prospects || []
        const meetingItems: MeetingItem[] = prospects.map((p: any) => ({
          id: p.id,
          title: `Meeting with ${p.name || "Unknown"}`,
          date: new Date(p.lastActivity || p.createdAt),
          attendees: [p.name || "Unknown"],
          status: "scheduled",
        }))
        setMeetings(meetingItems)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const meetingsOnSelectedDate = meetings.filter(
    (meeting) => meeting.date.toDateString() === selectedDate?.toDateString(),
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Meetings</h1>
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
      <h1 className="text-xl font-semibold">Meetings</h1>

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
              <p className="text-muted-foreground text-sm">No meetings scheduled for this date.</p>
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
              <h3 className="text-xl font-semibold text-blue-600">{meetings.length}</h3>
              <p className="text-sm text-gray-600">Total Meetings</p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-green-600">--</h3>
              <p className="text-sm text-gray-600">Meeting Attendance Rate</p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-yellow-600">--</h3>
              <p className="text-sm text-gray-600">Average Meeting Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
