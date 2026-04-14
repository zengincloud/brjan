'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, X, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { ChecklistItem } from '@/app/api/onboarding-checklist/route'
import { useUser } from '@/hooks/use-user'
import { CTA_BY_ROLE, DEFAULT_CTA } from '@/lib/onboarding-cta'

const DISMISSED_KEY = 'checklist_dismissed'
const COLLAPSED_KEY = 'checklist_collapsed'

interface OnboardingChecklistProps {
  showHero?: boolean
}

export function OnboardingChecklist({ showHero }: OnboardingChecklistProps) {
  const [milestones, setMilestones] = useState<ChecklistItem[]>([])
  const [completedCount, setCompletedCount] = useState(0)
  const [allComplete, setAllComplete] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const { user } = useUser()

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === 'true') {
      setDismissed(true)
      return
    }

    fetch('/api/onboarding-checklist')
      .then((r) => r.json())
      .then((data) => {
        const count = data.completedCount ?? 0
        setMilestones(data.milestones ?? [])
        setCompletedCount(count)
        setAllComplete(data.allComplete ?? false)

        // Only respect stored collapse state if the user has made progress
        if (count > 0 && localStorage.getItem(COLLAPSED_KEY) === 'true') {
          setCollapsed(true)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  const handleToggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(COLLAPSED_KEY, next ? 'true' : 'false')
  }

  const isNewUser = completedCount === 0 && user?.tier === 'trial'
  const shouldShowHero = (showHero || isNewUser) && !dismissed && !loading && milestones.length > 0

  const roleCta = CTA_BY_ROLE[user?.jobRole ?? ''] ?? DEFAULT_CTA

  if (loading || dismissed || allComplete || milestones.length === 0) return null

  const total = milestones.length
  const pct = (completedCount / total) * 100

  return (
    <div className="space-y-3">
      {/* Hero banner for new users */}
      {shouldShowHero && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">
              {user?.firstName ? `Hey ${user.firstName}, ready` : 'Ready'} to start closing?
            </h2>
            <p className="text-sm text-white/60">
              Your boilerroom is set up. Your first win is just a few clicks away.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              className="bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white shadow-[0_0_20px_hsl(100,78%,44%,0.3)]"
              asChild
            >
              <Link href={roleCta.href}>
                {roleCta.label} <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-white/40 hover:text-white/70" asChild>
              <Link href="/prospects">Add prospects first</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Checklist card */}
      <Card className="border-accent/20 bg-accent/5">
        <CardHeader
          className="pb-2 cursor-pointer select-none"
          onClick={handleToggleCollapse}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {milestones.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'w-2 h-2 rounded-full transition-colors',
                      m.complete ? 'bg-accent' : 'bg-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">
                Get started ({completedCount}/{total})
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleDismiss}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform text-muted-foreground',
                  collapsed && 'rotate-180'
                )}
              />
            </div>
          </div>
          <Progress value={pct} className="h-1 mt-2" />
        </CardHeader>

        {!collapsed && (
          <CardContent className="pt-0 pb-3 space-y-1">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                      m.complete
                        ? 'bg-accent border-accent'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {m.complete && <Check className="h-3 w-3 text-accent-foreground" />}
                  </div>
                  <span
                    className={cn(
                      'text-sm',
                      m.complete && 'line-through text-muted-foreground'
                    )}
                  >
                    {m.label}
                  </span>
                </div>
                {!m.complete && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                    <Link href={m.href}>{m.cta}</Link>
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
