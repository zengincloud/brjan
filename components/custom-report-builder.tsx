"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import {
  BarChart3,
  LineChartIcon,
  PieChartIcon,
  Save,
  Download,
  Share2,
  Plus,
  Trash2,
  Settings,
  Eye,
} from "lucide-react"
import type { DateRange } from "react-day-picker"

interface CustomReportBuilderProps {
  date?: DateRange | undefined
}

// Sample data for the report
const sampleData = [
  { month: "Jan", revenue: 65000, deals: 24, calls: 450, emails: 1200 },
  { month: "Feb", revenue: 59000, deals: 22, calls: 420, emails: 1150 },
  { month: "Mar", revenue: 80000, deals: 31, calls: 500, emails: 1300 },
  { month: "Apr", revenue: 81000, deals: 30, calls: 510, emails: 1250 },
  { month: "May", revenue: 56000, deals: 21, calls: 400, emails: 1100 },
  { month: "Jun", revenue: 55000, deals: 20, calls: 390, emails: 1050 },
]

// Available metrics for custom reports
const availableMetrics = [
  { id: "revenue", name: "Revenue", category: "Sales", color: "#8B5CF6" },
  { id: "deals", name: "Deals Closed", category: "Sales", color: "#10B981" },
  { id: "calls", name: "Calls Made", category: "Activity", color: "#F59E0B" },
  { id: "emails", name: "Emails Sent", category: "Activity", color: "#EF4444" },
  { id: "meetings", name: "Meetings Held", category: "Activity", color: "#6B7280" },
  { id: "conversion_rate", name: "Conversion Rate", category: "Performance", color: "#EC4899" },
  { id: "avg_deal_size", name: "Avg. Deal Size", category: "Sales", color: "#14B8A6" },
  { id: "pipeline_value", name: "Pipeline Value", category: "Pipeline", color: "#8B5CF6" },
]

// Available dimensions for custom reports
const availableDimensions = [
  { id: "month", name: "Month" },
  { id: "week", name: "Week" },
  { id: "day", name: "Day" },
  { id: "sales_rep", name: "Sales Rep" },
  { id: "team", name: "Team" },
  { id: "region", name: "Region" },
  { id: "industry", name: "Industry" },
  { id: "deal_size", name: "Deal Size" },
]

// Available chart types
const chartTypes = [
  { id: "bar", name: "Bar Chart", icon: BarChart3 },
  { id: "line", name: "Line Chart", icon: LineChartIcon },
  { id: "pie", name: "Pie Chart", icon: PieChartIcon },
]

// Sample saved reports
const savedReports = [
  { id: 1, name: "Monthly Revenue by Rep", description: "Track revenue performance by sales rep", type: "bar" },
  { id: 2, name: "Activity Metrics Trend", description: "Monitor calls, emails, and meetings over time", type: "line" },
  { id: 3, name: "Pipeline Distribution", description: "Analyze pipeline by stage and value", type: "pie" },
]

export function CustomReportBuilder({ date }: CustomReportBuilderProps) {
  const [activeTab, setActiveTab] = useState("builder")
  const [reportName, setReportName] = useState("New Custom Report")
  const [selectedChartType, setSelectedChartType] = useState("bar")
  const [selectedDimension, setSelectedDimension] = useState("month")
  const [selectedMetrics, setSelectedMetrics] = useState(["revenue", "deals"])
  const [showPreview, setShowPreview] = useState(false)

  // Handle adding a metric
  const handleAddMetric = (metricId: string) => {
    if (!selectedMetrics.includes(metricId)) {
      setSelectedMetrics([...selectedMetrics, metricId])
    }
  }

  // Handle removing a metric
  const handleRemoveMetric = (metricId: string) => {
    setSelectedMetrics(selectedMetrics.filter((id) => id !== metricId))
  }

  // Get metric details by ID
  const getMetricById = (metricId: string) => {
    return availableMetrics.find((metric) => metric.id === metricId)
  }

  // Render the appropriate chart based on the selected type
  const renderChart = () => {
    switch (selectedChartType) {
      case "bar":
        return (
          <ChartContainer
            config={selectedMetrics.reduce(
              (config, metricId) => {
                const metric = getMetricById(metricId)
                if (metric) {
                  config[metricId] = {
                    label: metric.name,
                    color: metric.color,
                  }
                }
                return config
              },
              {} as Record<string, { label: string; color: string }>,
            )}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sampleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey={selectedDimension} stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                <Legend />
                {selectedMetrics.map((metricId) => {
                  const metric = getMetricById(metricId)
                  return metric ? (
                    <Bar key={metricId} dataKey={metricId} fill={metric.color} name={metric.name} />
                  ) : null
                })}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )

      case "line":
        return (
          <ChartContainer
            config={selectedMetrics.reduce(
              (config, metricId) => {
                const metric = getMetricById(metricId)
                if (metric) {
                  config[metricId] = {
                    label: metric.name,
                    color: metric.color,
                  }
                }
                return config
              },
              {} as Record<string, { label: string; color: string }>,
            )}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sampleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey={selectedDimension} stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                <Legend />
                {selectedMetrics.map((metricId) => {
                  const metric = getMetricById(metricId)
                  return metric ? (
                    <Line
                      key={metricId}
                      type="monotone"
                      dataKey={metricId}
                      stroke={metric.color}
                      name={metric.name}
                      strokeWidth={2}
                    />
                  ) : null
                })}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )

      case "pie":
        // For pie charts, we'll just use the first selected metric
        const metricId = selectedMetrics[0] || "revenue"
        const pieData = sampleData.map((item) => ({
          name: item[selectedDimension as keyof typeof item],
          value: item[metricId as keyof typeof item],
        }))

        const COLORS = ["#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#6B7280", "#EC4899"]

        return (
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
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="saved">Saved Reports</TabsTrigger>
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="saved" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            {savedReports.map((report) => (
              <Card key={report.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {report.type === "bar" && <BarChart3 className="h-5 w-5" />}
                    {report.type === "line" && <LineChartIcon className="h-5 w-5" />}
                    {report.type === "pie" && <PieChartIcon className="h-5 w-5" />}
                    {report.name}
                  </CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="h-40 bg-muted/30 rounded-md flex items-center justify-center">
                    {report.type === "bar" && <BarChart3 className="h-10 w-10 text-muted-foreground" />}
                    {report.type === "line" && <LineChartIcon className="h-10 w-10 text-muted-foreground" />}
                    {report.type === "pie" && <PieChartIcon className="h-10 w-10 text-muted-foreground" />}
                  </div>
                </CardContent>
                <div className="p-4 pt-0 mt-auto">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            <Card className="flex flex-col items-center justify-center p-6">
              <Plus className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Create New Report</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Build a custom report with your selected metrics and dimensions
              </p>
              <Button onClick={() => setActiveTab("builder")}>Create Report</Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="builder" className="mt-6">
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Report Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="report-name">Report Name</Label>
                    <Input id="report-name" value={reportName} onChange={(e) => setReportName(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Chart Type</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {chartTypes.map((chartType) => (
                        <Button
                          key={chartType.id}
                          variant={selectedChartType === chartType.id ? "default" : "outline"}
                          className="flex flex-col items-center justify-center h-20 p-2"
                          onClick={() => setSelectedChartType(chartType.id)}
                        >
                          <chartType.icon className="h-6 w-6 mb-1" />
                          <span className="text-xs">{chartType.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dimension">Dimension (X-Axis)</Label>
                    <Select value={selectedDimension} onValueChange={setSelectedDimension}>
                      <SelectTrigger id="dimension">
                        <SelectValue placeholder="Select dimension" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDimensions.map((dimension) => (
                          <SelectItem key={dimension.id} value={dimension.id}>
                            {dimension.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Metrics</CardTitle>
                  <CardDescription>Select metrics to include in your report</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Selected Metrics</Label>
                    {selectedMetrics.length === 0 ? (
                      <div className="text-sm text-muted-foreground p-2 border rounded-md">No metrics selected</div>
                    ) : (
                      <div className="space-y-2">
                        {selectedMetrics.map((metricId) => {
                          const metric = getMetricById(metricId)
                          return metric ? (
                            <div key={metricId} className="flex items-center justify-between p-2 border rounded-md">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: metric.color }} />
                                <span>{metric.name}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleRemoveMetric(metricId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Available Metrics</Label>
                    <div className="h-[200px] overflow-y-auto border rounded-md p-2">
                      {availableMetrics.map((metric) => (
                        <div key={metric.id} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: metric.color }} />
                            <span>{metric.name}</span>
                            <span className="text-xs text-muted-foreground">({metric.category})</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6"
                            onClick={() => handleAddMetric(metric.id)}
                            disabled={selectedMetrics.includes(metric.id)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => setShowPreview(true)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline" className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{reportName}</CardTitle>
                    <CardDescription>
                      {selectedMetrics.length} metrics •{" "}
                      {availableDimensions.find((d) => d.id === selectedDimension)?.name} dimension
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showPreview ? (
                  <div className="h-[400px]">{renderChart()}</div>
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center">
                    <div className="bg-muted/30 rounded-md p-8 text-center">
                      <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Preview Your Report</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Select your metrics and dimensions, then click Preview to see your report
                      </p>
                      <Button onClick={() => setShowPreview(true)}>Generate Preview</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
