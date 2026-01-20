"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangePicker } from "@/components/date-range-picker"
import { Button } from "@/components/ui/button"
import { ReportTemplates } from "@/components/report-templates"
import { CustomReportBuilder } from "@/components/custom-report-builder"
import { SalesPerformanceReport } from "@/components/reports/sales-performance-report"
import { PipelineReport } from "@/components/reports/pipeline-report"
import { ActivityReport } from "@/components/reports/activity-report"
import { ConversionReport } from "@/components/reports/conversion-report"
import { BookmarkIcon, Download, Share2 } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { addDays } from "date-fns"

export default function ReportsPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })

  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Analyze your sales data and create custom reports</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker date={date} setDate={setDate} />
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales Performance</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Revenue" value="$125,430" change="+12.5%" trend="up" description="Last 30 days" />
            <MetricCard title="Deals Closed" value="42" change="+8.3%" trend="up" description="Last 30 days" />
            <MetricCard title="Conversion Rate" value="24.8%" change="-2.1%" trend="down" description="Last 30 days" />
            <MetricCard title="Avg. Deal Size" value="$2,986" change="+4.2%" trend="up" description="Last 30 days" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <SalesPerformanceReport date={date} />
            <PipelineReport date={date} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <ActivityReport date={date} />
            <ConversionReport date={date} />
          </div>

          <ReportTemplates />
        </TabsContent>

        <TabsContent value="sales" className="space-y-6 mt-6">
          <SalesPerformanceReport date={date} fullWidth />
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6 mt-6">
          <PipelineReport date={date} fullWidth />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6 mt-6">
          <ActivityReport date={date} fullWidth />
        </TabsContent>

        <TabsContent value="custom" className="space-y-6 mt-6">
          <CustomReportBuilder date={date} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  change: string
  trend: "up" | "down" | "neutral"
  description: string
}

function MetricCard({ title, value, change, trend, description }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Button variant="ghost" size="icon" className="h-4 w-4">
          <BookmarkIcon className="h-4 w-4 text-muted-foreground" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div
          className={`mt-1 text-xs ${
            trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"
          }`}
        >
          {change}
        </div>
      </CardContent>
    </Card>
  )
}
