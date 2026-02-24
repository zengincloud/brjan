"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import type { DateRange } from "react-day-picker"
import { Loader2 } from "lucide-react"
import type { ReportStats } from "@/hooks/use-report-stats"

interface ConversionReportProps {
  date?: DateRange | undefined
  fullWidth?: boolean
  isLoading?: boolean
  data?: ReportStats["conversion"]
}

export function ConversionReport({ date, fullWidth = false, isLoading, data }: ConversionReportProps) {
  if (isLoading) {
    return (
      <Card className={fullWidth ? "w-full" : ""}>
        <CardHeader>
          <CardTitle>Conversion Analysis</CardTitle>
          <CardDescription>Pipeline funnel and connect rate trends</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const funnel = data?.funnel || []
  const connectRateTrend = data?.connectRateTrend || []
  const totalFunnel = funnel.reduce((sum, s) => sum + s.count, 0)
  const hasData = totalFunnel > 0 || connectRateTrend.some(d => d.connectRate > 0)

  if (!hasData) {
    return (
      <Card className={fullWidth ? "w-full" : ""}>
        <CardHeader>
          <CardTitle>Conversion Analysis</CardTitle>
          <CardDescription>Pipeline funnel and connect rate trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p>No conversion data yet. Move prospects through your pipeline to see analysis here.</p>
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
            <CardTitle>Conversion Analysis</CardTitle>
            <CardDescription>Pipeline funnel and connect rate trends</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rates">
          <TabsList className="mb-4">
            <TabsTrigger value="rates">Connect Rates</TabsTrigger>
            <TabsTrigger value="funnel">Prospect Funnel</TabsTrigger>
          </TabsList>

          <TabsContent value="rates">
            <div className="h-[300px]">
              <ChartContainer
                config={{
                  connectRate: { label: "Connect Rate", color: "#22c55e" },
                  meetingRate: { label: "Meeting Rate", color: "#6366f1" },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={connectRateTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="label" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" tickFormatter={(value) => `${value}%`} />
                    <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                    <Legend />
                    <Line type="monotone" dataKey="connectRate" stroke="#22c55e" strokeWidth={2} name="Connect Rate %" />
                    <Line type="monotone" dataKey="meetingRate" stroke="#6366f1" strokeWidth={2} name="Meeting Rate %" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-medium mb-3">Period Averages</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg text-center">
                  <div className="text-sm text-muted-foreground">Avg. Connect Rate</div>
                  <div className="text-2xl font-bold text-green-500">
                    {connectRateTrend.length > 0
                      ? Math.round(connectRateTrend.reduce((sum, d) => sum + d.connectRate, 0) / connectRateTrend.length)
                      : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Calls that connected</div>
                </div>
                <div className="p-3 border rounded-lg text-center">
                  <div className="text-sm text-muted-foreground">Avg. Meeting Rate</div>
                  <div className="text-2xl font-bold text-indigo-500">
                    {connectRateTrend.length > 0
                      ? Math.round(connectRateTrend.reduce((sum, d) => sum + d.meetingRate, 0) / connectRateTrend.length)
                      : 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">Calls that booked intros</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="funnel">
            {totalFunnel > 0 ? (
              <>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <FunnelChart>
                      <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                      <Funnel dataKey="count" data={funnel.filter(f => f.count > 0)} isAnimationActive>
                        <LabelList position="right" fill="#fff" stroke="none" dataKey="label" />
                        <LabelList position="right" fill="#fff" stroke="none" dataKey="count" />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Funnel Breakdown</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Stage</th>
                        <th className="text-right py-2">Count</th>
                        <th className="text-right py-2">Conversion</th>
                        <th className="text-right py-2">Drop-off</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funnel.map((stage, index) => {
                        const prevStage = index > 0 ? funnel[index - 1] : null
                        const conversion = prevStage && prevStage.count > 0
                          ? Math.round((stage.count / prevStage.count) * 100)
                          : 100
                        const dropoff = prevStage ? prevStage.count - stage.count : 0

                        return (
                          <tr key={stage.stage} className="border-b">
                            <td className="py-2">{stage.label}</td>
                            <td className="text-right py-2">{stage.count}</td>
                            <td className="text-right py-2">{index === 0 ? "-" : `${conversion}%`}</td>
                            <td className="text-right py-2">{index === 0 ? "-" : dropoff}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>No prospects in the pipeline yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
