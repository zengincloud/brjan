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
import type { DateRange } from "react-day-picker"
import { Loader2 } from "lucide-react"
import type { ReportStats } from "@/hooks/use-report-stats"

interface PipelineReportProps {
  date?: DateRange | undefined
  fullWidth?: boolean
  isLoading?: boolean
  data?: ReportStats["pipeline"]
}

const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#22c55e", "#ef4444"]

export function PipelineReport({ date, fullWidth = false, isLoading, data }: PipelineReportProps) {
  if (isLoading) {
    return (
      <Card className={fullWidth ? "w-full" : ""}>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
          <CardDescription>Prospect stages and pipeline trend</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const prospectsByStatus = data?.prospectsByStatus || []
  const prospectCreationTimeline = data?.prospectCreationTimeline || []
  const accountsByStatus = data?.accountsByStatus || []

  const totalProspects = prospectsByStatus.reduce((sum, s) => sum + s.count, 0)
  const totalAccounts = accountsByStatus.reduce((sum, s) => sum + s.count, 0)
  const hasData = totalProspects > 0

  // Filter out zero-count statuses for the pie chart
  const pieData = prospectsByStatus
    .filter(s => s.count > 0)
    .map((s, i) => ({ name: s.label, value: s.count, fill: COLORS[i % COLORS.length] }))

  // Conversion rates between sequential statuses
  const conversionPairs = [
    { from: "new_lead", to: "in_sequence", label: "New Lead → In Sequence" },
    { from: "in_sequence", to: "contacted", label: "In Sequence → Contacted" },
    { from: "contacted", to: "meeting_scheduled", label: "Contacted → Meeting" },
    { from: "meeting_scheduled", to: "qualified", label: "Meeting → Qualified" },
  ]

  const getStatusCount = (status: string) =>
    prospectsByStatus.find(s => s.status === status)?.count || 0

  if (!hasData) {
    return (
      <Card className={fullWidth ? "w-full" : ""}>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
          <CardDescription>Prospect stages and pipeline trend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>No prospects yet. Add prospects to see your pipeline here.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={fullWidth ? "w-full" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>Prospect stages and pipeline trend</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="current">
          <TabsList className="mb-4">
            <TabsTrigger value="current">Current Pipeline</TabsTrigger>
            <TabsTrigger value="trend">New Prospects</TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
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
                      <th className="text-right py-2">Prospects</th>
                      <th className="text-right py-2">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospectsByStatus.filter(s => s.count > 0).map((stage) => (
                      <tr key={stage.status} className="border-b">
                        <td className="py-2">{stage.label}</td>
                        <td className="text-right py-2">{stage.count}</td>
                        <td className="text-right py-2">
                          {Math.round((stage.count / totalProspects) * 100)}%
                        </td>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td className="py-2">Total</td>
                      <td className="text-right py-2">{totalProspects}</td>
                      <td className="text-right py-2">100%</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Stage Conversion</h4>
                  <div className="space-y-2">
                    {conversionPairs.map((pair) => {
                      const fromCount = getStatusCount(pair.from)
                      const toCount = getStatusCount(pair.to)
                      const rate = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0
                      return (
                        <div key={pair.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span>{pair.label}</span>
                            <span>{rate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                            <div
                              className="bg-primary h-1.5 rounded-full"
                              style={{ width: `${Math.min(rate, 100)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trend">
            <div className="h-[350px]">
              <ChartContainer
                config={{
                  newProspects: { label: "New Prospects", color: "#6366f1" },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prospectCreationTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="label" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                    <Legend />
                    <Bar dataKey="newProspects" fill="#6366f1" name="New Prospects" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {totalAccounts > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Account Pipeline</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {accountsByStatus.filter(s => s.count > 0).map((s) => (
                    <div key={s.status} className="p-3 border rounded-lg text-center">
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className="text-xl font-bold">{s.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
