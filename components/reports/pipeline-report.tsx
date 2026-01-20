"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DateRange } from "react-day-picker"

interface PipelineReportProps {
  date?: DateRange | undefined
  fullWidth?: boolean
}

// Sample data for pipeline stages
const pipelineData = [
  { name: "Prospecting", value: 125, amount: 1250000 },
  { name: "Qualification", value: 80, amount: 960000 },
  { name: "Proposal", value: 45, amount: 675000 },
  { name: "Negotiation", value: 30, amount: 525000 },
  { name: "Closed Won", value: 25, amount: 375000 },
]

const COLORS = ["#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#6B7280"]

// Sample data for pipeline by month
const pipelineByMonth = [
  { month: "Jan", prospecting: 150000, qualification: 120000, proposal: 90000, negotiation: 60000, closed: 45000 },
  { month: "Feb", prospecting: 180000, qualification: 140000, proposal: 100000, negotiation: 70000, closed: 50000 },
  { month: "Mar", prospecting: 200000, qualification: 160000, proposal: 120000, negotiation: 80000, closed: 60000 },
  { month: "Apr", prospecting: 220000, qualification: 180000, proposal: 130000, negotiation: 90000, closed: 65000 },
  { month: "May", prospecting: 240000, qualification: 200000, proposal: 150000, negotiation: 100000, closed: 70000 },
  { month: "Jun", prospecting: 260000, qualification: 220000, proposal: 170000, negotiation: 110000, closed: 75000 },
]

export function PipelineReport({ date, fullWidth = false }: PipelineReportProps) {
  return (
    <Card className={fullWidth ? "w-full" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pipeline Analysis</CardTitle>
            <CardDescription>Deal stages, conversion rates, and forecasting</CardDescription>
          </div>
          <Select defaultValue="deals">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deals">Deal Count</SelectItem>
              <SelectItem value="value">Deal Value</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="current">
          <TabsList className="mb-4">
            <TabsTrigger value="current">Current Pipeline</TabsTrigger>
            <TabsTrigger value="trend">Pipeline Trend</TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pipelineData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Pipeline Summary</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Stage</th>
                      <th className="text-right py-2">Deals</th>
                      <th className="text-right py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipelineData.map((stage) => (
                      <tr key={stage.name} className="border-b">
                        <td className="py-2">{stage.name}</td>
                        <td className="text-right py-2">{stage.value}</td>
                        <td className="text-right py-2">${stage.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td className="py-2">Total</td>
                      <td className="text-right py-2">{pipelineData.reduce((sum, item) => sum + item.value, 0)}</td>
                      <td className="text-right py-2">
                        ${pipelineData.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Conversion Rates</h4>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Qualification → Proposal</span>
                        <span>56%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: "56%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Proposal → Negotiation</span>
                        <span>67%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: "67%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Negotiation → Closed Won</span>
                        <span>83%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: "83%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trend">
            <div className="h-[350px]">
              <ChartContainer
                config={{
                  prospecting: {
                    label: "Prospecting",
                    color: "#8B5CF6",
                  },
                  qualification: {
                    label: "Qualification",
                    color: "#10B981",
                  },
                  proposal: {
                    label: "Proposal",
                    color: "#F59E0B",
                  },
                  negotiation: {
                    label: "Negotiation",
                    color: "#EF4444",
                  },
                  closed: {
                    label: "Closed Won",
                    color: "#6B7280",
                  },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineByMonth} stackOffset="sign">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                    <Legend />
                    <Bar dataKey="prospecting" stackId="a" fill="#8B5CF6" />
                    <Bar dataKey="qualification" stackId="a" fill="#10B981" />
                    <Bar dataKey="proposal" stackId="a" fill="#F59E0B" />
                    <Bar dataKey="negotiation" stackId="a" fill="#EF4444" />
                    <Bar dataKey="closed" stackId="a" fill="#6B7280" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Pipeline Forecast</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Based on current conversion rates and pipeline velocity
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">30-Day Forecast</div>
                  <div className="text-2xl font-bold">$425,000</div>
                  <div className="text-xs text-green-500">+12% vs. last period</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">60-Day Forecast</div>
                  <div className="text-2xl font-bold">$875,000</div>
                  <div className="text-xs text-green-500">+8% vs. last period</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">90-Day Forecast</div>
                  <div className="text-2xl font-bold">$1,250,000</div>
                  <div className="text-xs text-green-500">+15% vs. last period</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
