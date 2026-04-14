"use client"

import { useUserRole } from "@/hooks/use-user-role"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import { cn } from "@/lib/utils"

const demoStatusData = [
  { label: "Total",       value: 125, dot: "bg-blue-400" },
  { label: "New",         value: 42,  dot: "bg-muted-foreground/40" },
  { label: "In Sequence", value: 38,  dot: "bg-yellow-400" },
  { label: "Contacted",   value: 25,  dot: "bg-emerald-400" },
  { label: "Customer",    value: 15,  dot: "bg-purple-400" },
  { label: "Churned",     value: 5,   dot: "bg-rose-400" },
]

export function AccountStatusBoxes() {
  const { isSuperAdmin } = useUserRole()
  const { stats } = useDashboardStats()

  const as = stats?.accountStatuses
  const statusData = isSuperAdmin
    ? demoStatusData
    : [
        { label: "Total",       value: as?.total       ?? 0, dot: "bg-blue-400" },
        { label: "New",         value: as?.new_lead    ?? 0, dot: "bg-muted-foreground/40" },
        { label: "In Sequence", value: as?.in_sequence ?? 0, dot: "bg-yellow-400" },
        { label: "Contacted",   value: as?.contacted   ?? 0, dot: "bg-emerald-400" },
        { label: "Customer",    value: as?.customer    ?? 0, dot: "bg-purple-400" },
        { label: "Churned",     value: as?.churned     ?? 0, dot: "bg-rose-400" },
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
