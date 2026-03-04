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
import { addDays, startOfWeek, endOfWeek, subWeeks } from "date-fns"
import { useReportStats } from "@/hooks/use-report-stats"

const timePresets = [
  { label: "This Week", value: "this_week" },
  { label: "Last Week", value: "last_week" },
  { label: "Last 30 Days", value: "last_30" },
  { label: "Last 60 Days", value: "last_60" },
  { label: "Last 90 Days", value: "last_90" },
  { label: "Custom", value: "custom" },
] as const

function getPresetRange(preset: string): DateRange {
  const now = new Date()
  switch (preset) {
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now }
    case "last_week": {
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      return { from: lastWeekStart, to: lastWeekEnd }
    }
    case "last_30":
      return { from: addDays(now, -30), to: now }
    case "last_60":
      return { from: addDays(now, -60), to: now }
    case "last_90":
      return { from: addDays(now, -90), to: now }
    default:
      return { from: addDays(now, -30), to: now }
  }
}

export default function ReportsPage() {
  const [timePreset, setTimePreset] = useState("last_30")
  const [date, setDate] = useState<DateRange | undefined>(getPresetRange("last_30"))

  const [selectedReport, setSelectedReport] = useState("activity")
  const { stats, isLoading } = useReportStats(date)

  const handlePresetChange = (value: string) => {
    setTimePreset(value)
    if (value !== "custom") {
      setDate(getPresetRange(value))
    }
  }

  const handleCustomDateChange = (newDate: DateRange | undefined) => {
    setTimePreset("custom")
    setDate(newDate)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Analyze your sales activity and pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timePreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timePresets.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {timePreset === "custom" && (
            <DateRangePicker date={date} setDate={handleCustomDateChange} />
          )}
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
