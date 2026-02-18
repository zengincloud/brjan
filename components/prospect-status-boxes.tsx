"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useUserRole } from "@/hooks/use-user-role"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"

const demoStatusData = [
  { label: "Total", value: 500, color: "bg-blue-100 text-blue-800" },
  { label: "Cold/Not Started", value: 200, color: "bg-gray-100 text-gray-800" },
  { label: "Working", value: 150, color: "bg-yellow-100 text-yellow-800" },
  { label: "Replied", value: 75, color: "bg-green-100 text-green-800" },
  { label: "Interested", value: 50, color: "bg-purple-100 text-purple-800" },
  { label: "Unresponsive", value: 25, color: "bg-red-100 text-red-800" },
]

export function ProspectStatusBoxes() {
  const { isSuperAdmin } = useUserRole()
  const { stats } = useDashboardStats()

  const ps = stats?.prospectStatuses
  const statusData = isSuperAdmin
    ? demoStatusData
    : [
        { label: "Total", value: ps?.total ?? 0, color: "bg-blue-100 text-blue-800" },
        { label: "New Lead", value: ps?.new_lead ?? 0, color: "bg-gray-100 text-gray-800" },
        { label: "In Sequence", value: ps?.in_sequence ?? 0, color: "bg-yellow-100 text-yellow-800" },
        { label: "Contacted", value: ps?.contacted ?? 0, color: "bg-green-100 text-green-800" },
        { label: "Meeting Set", value: ps?.meeting_scheduled ?? 0, color: "bg-purple-100 text-purple-800" },
        { label: "Qualified", value: ps?.qualified ?? 0, color: "bg-emerald-100 text-emerald-800" },
      ]

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {statusData.map((status) => (
        <Card key={status.label} className={status.color}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{status.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
