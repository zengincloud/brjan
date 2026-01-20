"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DateRange } from "react-day-picker"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, Calendar, MessageSquare } from "lucide-react"

interface ActivityReportProps {
  date?: DateRange | undefined
  fullWidth?: boolean
}

// Sample data for activity metrics
const activityData = [
  { day: "Mon", emails: 45, calls: 32, meetings: 8, notes: 15 },
  { day: "Tue", emails: 52, calls: 38, meetings: 10, notes: 18 },
  { day: "Wed", emails: 48, calls: 35, meetings: 12, notes: 20 },
  { day: "Thu", emails: 61, calls: 42, meetings: 9, notes: 22 },
  { day: "Fri", emails: 50, calls: 33, meetings: 7, notes: 16 },
]

// Sample data for activity by rep
const activityByRep = [
  { name: "Alex Johnson", emails: 210, calls: 180, meetings: 25, notes: 45 },
  { name: "Sarah Miller", emails: 245, calls: 195, meetings: 30, notes: 55 },
  { name: "Michael Chen", emails: 180, calls: 150, meetings: 20, notes: 40 },
  { name: "Emily Davis", emails: 225, calls: 175, meetings: 28, notes: 50 },
  { name: "David Wilson", emails: 195, calls: 160, meetings: 22, notes: 42 },
]

// Sample data for recent activities
const recentActivities = [
  {
    id: 1,
    type: "email",
    user: "Sarah Miller",
    target: "John Smith at TechCorp",
    time: "2 hours ago",
    subject: "Follow-up on our conversation",
  },
  {
    id: 2,
    type: "call",
    user: "Alex Johnson",
    target: "Michael Chen at GlobalTech",
    time: "4 hours ago",
    duration: "15 minutes",
  },
  {
    id: 3,
    type: "meeting",
    user: "Emily Davis",
    target: "FutureSoft Team",
    time: "Yesterday",
    subject: "Quarterly Business Review",
  },
  {
    id: 4,
    type: "note",
    user: "David Wilson",
    target: "AlphaTech Account",
    time: "Yesterday",
    subject: "Contract renewal notes",
  },
  {
    id: 5,
    type: "email",
    user: "Michael Chen",
    target: "Jessica Lee at CloudNine",
    time: "2 days ago",
    subject: "Demo scheduling",
  },
]

export function ActivityReport({ date, fullWidth = false }: ActivityReportProps) {
  return (
    <Card className={fullWidth ? "w-full" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Metrics</CardTitle>
            <CardDescription>Emails, calls, meetings, and notes</CardDescription>
          </div>
          <Select defaultValue="week">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="by-rep">By Rep</TabsTrigger>
            <TabsTrigger value="recent">Recent Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="h-[300px]">
              <ChartContainer
                config={{
                  emails: {
                    label: "Emails",
                    color: "#8B5CF6",
                  },
                  calls: {
                    label: "Calls",
                    color: "#10B981",
                  },
                  meetings: {
                    label: "Meetings",
                    color: "#F59E0B",
                  },
                  notes: {
                    label: "Notes",
                    color: "#6B7280",
                  },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                    <Legend />
                    <Bar dataKey="emails" fill="#8B5CF6" />
                    <Bar dataKey="calls" fill="#10B981" />
                    <Bar dataKey="meetings" fill="#F59E0B" />
                    <Bar dataKey="notes" fill="#6B7280" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-purple-500" />
                  <div className="text-sm text-muted-foreground">Emails</div>
                </div>
                <div className="text-2xl font-bold">256</div>
                <div className="text-xs text-green-500">+12% vs. last week</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Phone className="h-4 w-4 text-green-500" />
                  <div className="text-sm text-muted-foreground">Calls</div>
                </div>
                <div className="text-2xl font-bold">180</div>
                <div className="text-xs text-green-500">+8% vs. last week</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-yellow-500" />
                  <div className="text-sm text-muted-foreground">Meetings</div>
                </div>
                <div className="text-2xl font-bold">46</div>
                <div className="text-xs text-red-500">-5% vs. last week</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  <div className="text-sm text-muted-foreground">Notes</div>
                </div>
                <div className="text-2xl font-bold">91</div>
                <div className="text-xs text-green-500">+15% vs. last week</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="by-rep">
            <div className="h-[300px]">
              <ChartContainer
                config={{
                  emails: {
                    label: "Emails",
                    color: "#8B5CF6",
                  },
                  calls: {
                    label: "Calls",
                    color: "#10B981",
                  },
                  meetings: {
                    label: "Meetings",
                    color: "#F59E0B",
                  },
                  notes: {
                    label: "Notes",
                    color: "#6B7280",
                  },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityByRep} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9CA3AF" />
                    <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={100} />
                    <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                    <Legend />
                    <Bar dataKey="emails" fill="#8B5CF6" />
                    <Bar dataKey="calls" fill="#10B981" />
                    <Bar dataKey="meetings" fill="#F59E0B" />
                    <Bar dataKey="notes" fill="#6B7280" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Sales Rep</th>
                    <th className="text-right py-2">Emails</th>
                    <th className="text-right py-2">Calls</th>
                    <th className="text-right py-2">Meetings</th>
                    <th className="text-right py-2">Notes</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activityByRep.map((rep) => {
                    const total = rep.emails + rep.calls + rep.meetings + rep.notes
                    return (
                      <tr key={rep.name} className="border-b">
                        <td className="py-2">{rep.name}</td>
                        <td className="text-right py-2">{rep.emails}</td>
                        <td className="text-right py-2">{rep.calls}</td>
                        <td className="text-right py-2">{rep.meetings}</td>
                        <td className="text-right py-2">{rep.notes}</td>
                        <td className="text-right py-2 font-medium">{total}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="recent">
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 border rounded-lg">
                  <div className="mt-1">
                    {activity.type === "email" && <Mail className="h-5 w-5 text-purple-500" />}
                    {activity.type === "call" && <Phone className="h-5 w-5 text-green-500" />}
                    {activity.type === "meeting" && <Calendar className="h-5 w-5 text-yellow-500" />}
                    {activity.type === "note" && <MessageSquare className="h-5 w-5 text-gray-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{activity.user}</div>
                      <div className="text-xs text-muted-foreground">{activity.time}</div>
                    </div>
                    <div className="text-sm">
                      {activity.type === "email" && `Sent email to ${activity.target}`}
                      {activity.type === "call" && `Called ${activity.target}`}
                      {activity.type === "meeting" && `Meeting with ${activity.target}`}
                      {activity.type === "note" && `Added note to ${activity.target}`}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {activity.subject && `Subject: ${activity.subject}`}
                      {activity.duration && `Duration: ${activity.duration}`}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
