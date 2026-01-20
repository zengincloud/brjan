"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, LineChart, PieChart, ArrowRight } from "lucide-react"

// Sample report templates
const reportTemplates = [
  {
    id: 1,
    name: "Sales Performance",
    description: "Revenue, deals closed, and targets by rep and time period",
    icon: BarChart3,
  },
  {
    id: 2,
    name: "Pipeline Analysis",
    description: "Deal stages, conversion rates, and forecasting",
    icon: PieChart,
  },
  {
    id: 3,
    name: "Activity Metrics",
    description: "Calls, emails, meetings, and notes over time",
    icon: LineChart,
  },
  {
    id: 4,
    name: "Conversion Analysis",
    description: "Conversion rates and sales funnel",
    icon: BarChart3,
  },
]

export function ReportTemplates() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Templates</CardTitle>
        <CardDescription>Start with a pre-built report template</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {reportTemplates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <template.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-base">{template.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </CardContent>
              <div className="p-4 pt-0 mt-auto">
                <Button variant="outline" className="w-full">
                  Use Template
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
