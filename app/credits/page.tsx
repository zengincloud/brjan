"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Users2, Building2, Dumbbell, Phone, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type CreditActionKey = "prospect_created" | "account_created" | "mock_call" | "additional_phone_number"

interface BreakdownItem {
  action: CreditActionKey
  label: string
  description: string
  cost: number
  count: number
  totalCredits: number
}

interface ActivityEntry {
  id: string
  action: CreditActionKey
  label: string
  detail: string
  credits: number
  createdAt: string
}

interface CreditsData {
  tier: string
  label: string
  creditsUsed: number
  creditsTotal: number
  creditsRemaining: number
  resetsAt: string | null
  periodLabel: string
  breakdown: BreakdownItem[]
  recentActivity: ActivityEntry[]
  totalCreditsThisPeriod: number
}

const ACTION_STYLE: Record<CreditActionKey, { icon: typeof Users2; text: string; bar: string }> = {
  prospect_created: { icon: Users2, text: "text-blue-500", bar: "bg-blue-500" },
  account_created: { icon: Building2, text: "text-purple-500", bar: "bg-purple-500" },
  mock_call: { icon: Dumbbell, text: "text-amber-500", bar: "bg-amber-500" },
  additional_phone_number: { icon: Phone, text: "text-orange-500", bar: "bg-orange-500" },
}

export default function CreditsPage() {
  const [data, setData] = useState<CreditsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch("/api/credits")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load")
        return res.json()
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setIsLoading(false))
  }, [])

  const isUnlimited = data?.creditsTotal === -1
  const pct = data && !isUnlimited && data.creditsTotal > 0
    ? Math.min((data.creditsUsed / data.creditsTotal) * 100, 100)
    : 0
  const pctColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-primary"

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Credits</h1>
        <p className="text-muted-foreground">Exactly what your credits went to</p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
          <div className="grid gap-3 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))}
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load credit usage. Please refresh the page.</span>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          {/* Summary */}
          <Card className={cn(!isUnlimited && "border-primary/30 bg-primary/5")}>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="font-semibold text-lg">{data.label} plan</h2>
                {isUnlimited ? (
                  <span className="text-sm font-medium text-primary">Unlimited</span>
                ) : (
                  <span className="text-xl font-semibold text-primary">
                    {data.creditsRemaining}
                    <span className="text-sm font-normal text-muted-foreground"> of {data.creditsTotal} remaining</span>
                  </span>
                )}
              </div>
              {!isUnlimited ? (
                <>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
                    <div className={cn("h-full rounded-full transition-all", pctColor)} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
                    <span>{data.creditsUsed} used {data.periodLabel}</span>
                    {data.resetsAt && (
                      <span>
                        Resets {new Date(data.resetsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                    {data.tier === "trial" && <span>Trial credits do not reset</span>}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Super Admins don&apos;t draw down credits — usage is shown below for reference.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Breakdown by category */}
          <div>
            <h3 className="text-sm font-medium mb-3">What used your credits — {data.periodLabel}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {data.breakdown.map((item) => {
                const style = ACTION_STYLE[item.action]
                const Icon = style.icon
                const share = data.totalCreditsThisPeriod > 0
                  ? Math.round((item.totalCredits / data.totalCreditsThisPeriod) * 100)
                  : 0
                return (
                  <Card key={item.action}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", style.text)} />
                          <span className="font-medium text-sm">{item.label}</span>
                        </div>
                        <span className="text-lg font-semibold shrink-0">
                          {item.totalCredits}
                          <span className="text-xs font-normal text-muted-foreground"> credits</span>
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{item.description}</p>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                        <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${share}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{item.count} × {item.cost} credit{item.cost === 1 ? "" : "s"}</span>
                        <span>{share}% of usage</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No credit activity yet {data.periodLabel}.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 font-medium">Action</th>
                        <th className="text-left py-2 font-medium">Detail</th>
                        <th className="text-right py-2 font-medium">Credits</th>
                        <th className="text-right py-2 font-medium">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentActivity.map((entry) => {
                        const style = ACTION_STYLE[entry.action]
                        const Icon = style.icon
                        return (
                          <tr key={`${entry.action}-${entry.id}`} className="border-b last:border-0">
                            <td className="py-2.5">
                              <span className="flex items-center gap-1.5">
                                <Icon className={cn("h-3.5 w-3.5 shrink-0", style.text)} />
                                {entry.label}
                              </span>
                            </td>
                            <td className="py-2.5 text-muted-foreground truncate max-w-[220px]">{entry.detail}</td>
                            <td className="py-2.5 text-right">-{entry.credits}</td>
                            <td className="py-2.5 text-right text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {data.tier === "trial" && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <span className="text-sm">Need more credits? Upgrade for a bigger monthly allotment.</span>
              <Button size="sm" asChild>
                <Link href="/upgrade">Upgrade</Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
