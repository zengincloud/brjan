"use client"

import { useState } from "react"
import { DateRangePicker } from "@/components/date-range-picker"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ReportTemplates } from "@/components/report-templates"
import { PipelineReport } from "@/components/reports/pipeline-report"
import { ActivityReport } from "@/components/reports/activity-report"
import { Download, Share2 } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { addDays } from "date-fns"
import { useReportStats } from "@/hooks/use-report-stats"

export default function ReportsPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })

  const [selectedReport, setSelectedReport] = useState("activity")
  const { stats, isLoading } = useReportStats(date)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Analyze your sales activity and pipeline</p>
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

      <Select value={selectedReport} onValueChange={setSelectedReport}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select report" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="activity">Activity</SelectItem>
          <SelectItem value="pipeline">Pipeline</SelectItem>
          <SelectItem value="templates">Report Templates</SelectItem>
        </SelectContent>
      </Select>

      <div className="mt-6">
        {selectedReport === "activity" && (
          <ActivityReport
            date={date}
            data={{
              activityByDay: stats?.activityByDay,
              activityByType: stats?.activityByType,
              recentActivity: stats?.recentActivity,
              emailEngagement: stats?.emailEngagement,
            }}
            fullWidth
            isLoading={isLoading}
          />
        )}

        {selectedReport === "pipeline" && (
          <PipelineReport date={date} data={stats?.pipeline} fullWidth isLoading={isLoading} />
        )}

        {selectedReport === "templates" && (
          <ReportTemplates />
        )}
      </div>
    </div>
  )
}
