"use client"

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Zap, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// SDR weekly targets
const TARGETS = {
  emails: 40,
  calls: 500,
  leads: 50,
  linkedin: 20,
}

// Sample data for the current week's progress
const sdrProgress = [
  { category: "Emails", value: 35, target: TARGETS.emails, fullMark: TARGETS.emails },
  { category: "Calls", value: 400, target: TARGETS.calls, fullMark: TARGETS.calls },
  { category: "Leads", value: 45, target: TARGETS.leads, fullMark: TARGETS.leads },
  { category: "LinkedIn", value: 15, target: TARGETS.linkedin, fullMark: TARGETS.linkedin },
]

// Normalized data for better visualization (percentage of target)
const normalizedData = sdrProgress.map((item) => ({
  category: item.category,
  progress: Math.round((item.value / item.target) * 100),
  target: 100, // Target is always 100%
}))

export function SDRPerformanceChart() {
  return (
    <Card className="w-full border-border bg-card overflow-hidden">
      {/* Window Controls Bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/20">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-xs text-muted-foreground ml-2">Weekly Performance</span>
        <div className="ml-auto flex items-center gap-2">
          <Badge className="bg-accent/20 text-accent border-0 gap-1">
            <TrendingUp className="w-3 h-3" />
            On Track
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-accent" />
            </div>
            <div>
              <CardTitle className="text-lg">Weekly SDR Performance</CardTitle>
              <CardDescription className="text-xs">
                Progress toward {TARGETS.emails} emails, {TARGETS.calls} calls, {TARGETS.leads} leads,{" "}
                {TARGETS.linkedin} LinkedIn outreaches
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[350px]">
          <ChartContainer
            config={{
              progress: {
                label: "Current Progress",
                color: "hsl(100, 78%, 44%)",
              },
              target: {
                label: "Target (100%)",
                color: "hsl(220, 9%, 46%)",
              },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={normalizedData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                <PolarGrid stroke="hsl(220, 15%, 20%)" />
                <PolarAngleAxis dataKey="category" tick={{ fill: "hsl(220, 9%, 60%)", fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Radar
                  name="Target"
                  dataKey="target"
                  stroke="hsl(220, 9%, 40%)"
                  fill="hsl(220, 9%, 40%)"
                  fillOpacity={0.1}
                />
                <Radar
                  name="Progress"
                  dataKey="progress"
                  stroke="hsl(100, 78%, 44%)"
                  fill="hsl(100, 78%, 44%)"
                  fillOpacity={0.4}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {sdrProgress.map((item) => {
            const percentage = Math.round((item.value / item.target) * 100)
            return (
              <div
                key={item.category}
                className="flex flex-col p-3 rounded-lg bg-secondary/30 border border-border"
              >
                <div className="text-xs text-muted-foreground mb-1">{item.category}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{item.value}</span>
                  <span className="text-xs text-muted-foreground">/ {item.target}</span>
                </div>
                <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-accent mt-1">{percentage}%</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
