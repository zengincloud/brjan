"use client"

import { useUserRole } from "@/hooks/use-user-role"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import { cn } from "@/lib/utils"

const demoStatusData = [
  { label: "Total", value: 500, dot: "bg-blue-400" },
  { label: "Cold / Not Started", value: 200, dot: "bg-muted-foreground/40" },
  { label: "Working", value: 150, dot: "bg-yellow-400" },
  { label: "Replied", value: 75, dot: "bg-emerald-400" },
  { label: "Interested", value: 50, dot: "bg-purple-400" },
  { label: "Unresponsive", value: 25, dot: "bg-rose-400" },
]

export function ProspectStatusBoxes() {
  const { isSuperAdmin } = useUserRole()
  const { stats } = useDashboardStats()

  const ps = stats?.prospectStatuses
  const statusData = isSuperAdmin
    ? demoStatusData
    : [
        { label: "Total",        value: ps?.total             ?? 0, dot: "bg-blue-400" },
        { label: "New Lead",     value: ps?.new_lead          ?? 0, dot: "bg-muted-foreground/40" },
        { label: "In Sequence",  value: ps?.in_sequence       ?? 0, dot: "bg-yellow-400" },
        { label: "Contacted",    value: ps?.contacted         ?? 0, dot: "bg-emerald-400" },
        { label: "Meeting Set",  value: ps?.meeting_scheduled ?? 0, dot: "bg-purple-400" },
        { label: "Qualified",    value: ps?.qualified         ?? 0, dot: "bg-[hsl(100,78%,44%)]" },
      ]

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 divide-x divide-border border border-border rounded-lg overflow-hidden bg-card">
      {statusData.map((s) => (
        <div key={s.label} className="flex flex-col gap-1 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} />
            <span className="text-[11px] text-muted-foreground truncate">{s.label}</span>
          </div>
          <span className="text-xl font-semibold text-foreground leading-none">{s.value}</span>
        </div>
      ))}
    </div>
  )
}
