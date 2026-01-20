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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DateRange } from "react-day-picker"

interface ConversionReportProps {
  date?: DateRange | undefined
  fullWidth?: boolean
}

// Sample data for conversion rates over time
const conversionData = [
  { month: "Jan", lead_to_opp: 25, opp_to_demo: 60, demo_to_proposal: 75, proposal_to_close: 40 },
  { month: "Feb", lead_to_opp: 28, opp_to_demo: 62, demo_to_proposal: 70, proposal_to_close: 42 },
  { month: "Mar", lead_to_opp: 30, opp_to_demo: 65, demo_to_proposal: 72, proposal_to_close: 45 },
  { month: "Apr", lead_to_opp: 32, opp_to_demo: 68, demo_to_proposal: 74, proposal_to_close: 48 },
  { month: "May", lead_to_opp: 35, opp_to_demo: 70, demo_to_proposal: 76, proposal_to_close: 50 },
  { month: "Jun", lead_to_opp: 33, opp_to_demo: 67, demo_to_proposal: 73, proposal_to_close: 47 },
]

// Sample data for sales funnel
const funnelData = [
  { name: "Leads", value: 1250, fill: "#8B5CF6" },
  { name: "Opportunities", value: 375, fill: "#10B981" },
  { name: "Demos", value: 250, fill: "#F59E0B" },
  { name: "Proposals", value: 180, fill: "#EF4444" },
  { name: "Closed Won", value: 85, fill: "#6B7280" },
]

export function ConversionReport({ date, fullWidth = false }: ConversionReportProps) {
  return (
    <Card className={fullWidth ? "w-full" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Conversion Analysis</CardTitle>
            <CardDescription>Conversion rates and sales funnel</CardDescription>
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deals</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
              <SelectItem value="mid-market">Mid-Market</SelectItem>
              <SelectItem value="smb">SMB</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rates">
          <TabsList className="mb-4">
            <TabsTrigger value="rates">Conversion Rates</TabsTrigger>
            <TabsTrigger value="funnel">Sales Funnel</TabsTrigger>
          </TabsList>

          <TabsContent value="rates">
            <div className="h-[300px]">
              <ChartContainer
                config={{
                  lead_to_opp: {
                    label: "Lead → Opportunity",
                    color: "#8B5CF6",
                  },
                  opp_to_demo: {
                    label: "Opportunity → Demo",
                    color: "#10B981",
                  },
                  demo_to_proposal: {
                    label: "Demo → Proposal",
                    color: "#F59E0B",
                  },
                  proposal_to_close: {
                    label: "Proposal → Close",
                    color: "#EF4444",
                  },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={conversionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" tickFormatter={(value) => `${value}%`} />
                    <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                    <Legend />
                    <Line type="monotone" dataKey="lead_to_opp" stroke="#8B5CF6" strokeWidth={2} />
                    <Line type="monotone" dataKey="opp_to_demo" stroke="#10B981" strokeWidth={2} />
                    <Line type="monotone" dataKey="demo_to_proposal" stroke="#F59E0B" strokeWidth={2} />
                    <Line type="monotone" dataKey="proposal_to_close" stroke="#EF4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Current Conversion Rates</h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Lead → Opportunity</span>
                      <span>33%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: "33%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Opportunity → Demo</span>
                      <span>67%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: "67%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Demo → Proposal</span>
                      <span>73%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: "73%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Proposal → Close</span>
                      <span>47%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-red-500 h-1.5 rounded-full" style={{ width: "47%" }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Conversion Insights</h3>
                <div className="space-y-2 text-sm">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">Opportunity → Demo</div>
                    <div className="text-green-500 text-xs">+5% vs. last quarter</div>
                    <div className="text-muted-foreground mt-1">
                      Improved demo scheduling process is showing results.
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium">Proposal → Close</div>
                    <div className="text-red-500 text-xs">-3% vs. last quarter</div>
                    <div className="text-muted-foreground mt-1">
                      Consider reviewing pricing strategy and negotiation training.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="funnel">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "none" }} />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="#fff" stroke="none" dataKey="name" />
                    <LabelList position="right" fill="#fff" stroke="none" dataKey="value" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Funnel Analysis</h3>
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
                  {funnelData.map((stage, index) => {
                    const prevStage = index > 0 ? funnelData[index - 1] : null
                    const conversion = prevStage ? Math.round((stage.value / prevStage.value) * 100) : 100
                    const dropoff = prevStage ? prevStage.value - stage.value : 0

                    return (
                      <tr key={stage.name} className="border-b">
                        <td className="py-2">{stage.name}</td>
                        <td className="text-right py-2">{stage.value}</td>
                        <td className="text-right py-2">{index === 0 ? "-" : `${conversion}%`}</td>
                        <td className="text-right py-2">{index === 0 ? "-" : dropoff}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
