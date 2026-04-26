"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Zap } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { TRIAL_LIMITS } from "@/lib/trial-limits"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface UsageStat {
  label: string
  current: number | null
  limit: number
}

function UsageRow({ label, current, limit }: UsageStat) {
  const loaded = current !== null
  const pct = loaded ? Math.min((current! / limit) * 100, 100) : 0
  const atLimit = loaded && current! >= limit
  const nearLimit = loaded && !atLimit && pct >= 70

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          "font-medium tabular-nums",
          atLimit ? "text-red-400" : nearLimit ? "text-yellow-400" : "text-foreground"
        )}>
          {loaded ? current : "—"} / {limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            atLimit ? "bg-red-500" : nearLimit ? "bg-yellow-500" : "bg-[hsl(100,78%,44%)]"
          )}
          style={{ width: loaded ? `${pct}%` : "0%" }}
        />
      </div>
    </div>
  )
}

export function TrialUsageSummary() {
  const { user } = useUser()
  const [prospectCount, setProspectCount] = useState<number | null>(null)
  const [callCount, setCallCount] = useState<number | null>(null)
  const [recordingCount, setRecordingCount] = useState<number | null>(null)
  const [sequenceCount, setSequenceCount] = useState<number | null>(null)

  const isTrial = user?.tier === 'trial' && user?.role !== 'super_admin'

  useEffect(() => {
    if (!isTrial) return

    fetch("/api/prospects?pageSize=1")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.totalCount !== undefined) setProspectCount(d.totalCount) })
      .catch(() => {})

    fetch("/api/calls?pageSize=500")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.calls) {
          setCallCount(d.calls.length)
          setRecordingCount(d.calls.filter((c: any) => c.recordingUrl).length)
        }
      })
      .catch(() => {})

    fetch("/api/sequences")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.sequences) setSequenceCount(d.sequences.length) })
      .catch(() => {})
  }, [isTrial])

  if (!isTrial) return null

  const stats: UsageStat[] = [
    { label: "Prospects", current: prospectCount, limit: TRIAL_LIMITS.prospects },
    { label: "Calls", current: callCount, limit: TRIAL_LIMITS.calls },
    { label: "Call Recordings", current: recordingCount, limit: TRIAL_LIMITS.recordings },
    { label: "Sequences", current: sequenceCount, limit: TRIAL_LIMITS.sequences },
  ]

  const anyNearOrAtLimit = stats.some(s => s.current !== null && (s.current / s.limit) >= 0.7)

  return (
    <Card className={cn(
      "border",
      anyNearOrAtLimit ? "border-yellow-500/30 bg-yellow-500/5" : "border-border"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[14px] font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" />
            Trial Usage
          </CardTitle>
          <Link href="/upgrade">
            <Button size="sm" className="h-7 text-[12px] gap-1.5 bg-accent hover:bg-[hsl(100,78%,38%)]">
              <Zap className="h-3 w-3" />
              Upgrade
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {stats.map(stat => (
          <UsageRow key={stat.label} {...stat} />
        ))}
        <p className="text-[11px] text-muted-foreground pt-1">
          Email sending and unlimited usage requires an upgraded plan.
        </p>
      </CardContent>
    </Card>
  )
}
