"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DateRange } from "react-day-picker"

interface SalesPerformanceReportProps {
  date?: DateRange | undefined
  fullWidth?: boolean
}

// Sample data
const salesData = [
  { month: "Jan", revenue: 65000, deals: 24, target: 70000 },
  { month: "Feb", revenue: 59000, deals: 22, target: 70000 },
  { month: "Mar", revenue: 80000, deals: 31, target: 70000 },
  { month: "Apr", revenue: 81000, deals: 30, target: 75000 },
  { month: "May", revenue: 56000, deals: 21, target: 75000 },
  { month: "Jun", revenue: 55000, deals: 20, target: 75000 },
  { month: "Jul", revenue: 40000, deals: 15, target: 80000 },
  { month: "Aug", revenue: 94000, deals: 35, target: 80000 },
  { month: "Sep", revenue: 79000, deals: 29, target: 80000 },
  { month: "Oct", revenue: 110000, deals: 41, target: 85000 },
  { month: "Nov", revenue: 130000, deals: 48, target: 85000 },
  { month: "Dec", revenue: 146000, deals: 54, target: 85000 },
]

// Sample data for sales by rep
const salesByRep = [
  { name: "Alex Johnson", revenue: 245000, deals: 92, quota: 250000 },
  { name: "Sarah Miller", revenue: 310000, deals: 115, quota: 300000 },
  { name: "Michael Chen", revenue: 186000, deals: 70, quota: 200000 },
  { name: "Emily Davis", revenue: 275000, deals: 102, quota: 250000 },
  { name: "David Wilson", revenue: 198000, deals: 74, quota: 200000 },
]

export function SalesPerformanceReport({ date, fullWidth = false }: SalesPerformanceReportProps) {
  return (
    <Card className={fullWidth ? "w-full" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sales Performance</CardTitle>
            <CardDescription>Revenue, deals closed, and targets</CardDescription>
          </div>
          <Select defaultValue="revenue">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="deals">Deals Closed</SelectItem>
              <SelectItem value="average">Avg. Deal Size</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="timeline">
          <TabsList className="mb-4">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="reps">Sales Reps</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <div className="h-[350px]">
              <ChartContainer
                config={{
                  revenue: {
                    label: "Revenue",
                    color: "hsl(var(--chart-1))",
                  },
                  target: {
                    label: "Target",
                    color: "hsl(var(--chart-2))",
                  },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="var(--color-target)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Total Revenue</div>
                <div className="text-2xl font-bold">$995,000</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Deals Closed</div>
                <div className="text-2xl font-bold">370</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Avg. Deal Size</div>
                <div className="text-2xl font-bold">$2,689</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reps">
            <div className="h-[350px]">
              <ChartContainer
                config={{
                  revenue: {
                    label: "Revenue",
                    color: "hsl(var(--chart-1))",
                  },
                  quota: {
                    label: "Quota",
                    color: "hsl(var(--chart-2))",
                  },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByRep}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                    <Legend />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" />
                    <Bar dataKey="quota" fill="var(--color-quota)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Sales Rep</th>
                    <th className="text-right py-2">Revenue</th>
                    <th className="text-right py-2">Deals</th>
                    <th className="text-right py-2">Quota Attainment</th>
                  </tr>
                </thead>
                <tbody>
                  {salesByRep.map((rep) => (
                    <tr key={rep.name} className="border-b">
                      <td className="py-2">{rep.name}</td>
                      <td className="text-right py-2">${rep.revenue.toLocaleString()}</td>
                      <td className="text-right py-2">{rep.deals}</td>
                      <td className="text-right py-2">
                        <div className="flex items-center justify-end">
                          <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                            <div
                              className="bg-primary h-2.5 rounded-full"
                              style={{ width: `${Math.min(100, (rep.revenue / rep.quota) * 100)}%` }}
                            ></div>
                          </div>
                          {Math.round((rep.revenue / rep.quota) * 100)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
