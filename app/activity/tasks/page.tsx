"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/date-range-picker"
import type { DateRange } from "react-day-picker"
import { addDays } from "date-fns"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

// Sample data for the chart
const taskTypeData = [
  { name: "Follow-up", value: 30 },
  { name: "Research", value: 20 },
  { name: "Data Entry", value: 15 },
  { name: "Meeting Prep", value: 25 },
  { name: "Other", value: 10 },
]

const COLORS = ["#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#6B7280"]

// Sample data for the table
const recentTasks = [
  { id: 1, title: "Follow up with John Doe", dueDate: "2023-05-08", status: "Completed", priority: "High" },
  { id: 2, title: "Research XYZ Inc", dueDate: "2023-05-09", status: "In Progress", priority: "Medium" },
  { id: 3, title: "Update CRM data", dueDate: "2023-05-10", status: "Not Started", priority: "Low" },
  { id: 4, title: "Prepare for client meeting", dueDate: "2023-05-11", status: "Completed", priority: "High" },
  { id: 5, title: "Send proposal to ABC Corp", dueDate: "2023-05-12", status: "In Progress", priority: "Medium" },
]

export default function TasksDonePage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <DateRangePicker date={date} setDate={setDate} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task Completion Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taskTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-medium">75%</span>
              </div>
              <Progress value={75} className="w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-blue-400">45</h3>
                <p className="text-sm text-gray-400">Total Tasks</p>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-green-400">32</h3>
                <p className="text-sm text-gray-400">Completed Tasks</p>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-yellow-400">10</h3>
                <p className="text-sm text-gray-400">Overdue Tasks</p>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-purple-400">3</h3>
                <p className="text-sm text-gray-400">High Priority Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{task.dueDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.status === "Completed"
                          ? "success"
                          : task.status === "In Progress"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.priority === "High" ? "destructive" : task.priority === "Medium" ? "warning" : "secondary"
                      }
                    >
                      {task.priority}
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
