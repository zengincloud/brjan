'use client'

import Link from 'next/link'
import { AlertTriangle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TrialLimitBannerProps {
  current: number
  limit: number
  resourceLabel: string
  className?: string
}

export function TrialLimitBanner({ current, limit, resourceLabel, className }: TrialLimitBannerProps) {
  const pct = current / limit
  if (pct < 0.7) return null

  const atLimit = current >= limit
  const Icon = atLimit ? XCircle : AlertTriangle

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border px-4 py-3 text-sm',
        atLimit
          ? 'bg-red-500/10 border-red-500/30 text-red-400'
          : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        {atLimit ? (
          <span>
            You&apos;ve run out of credits. You&apos;ve used all {limit} {resourceLabel} on your trial.
          </span>
        ) : (
          <span>
            You&apos;re using {current}/{limit} {resourceLabel} on your trial plan.
          </span>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="ml-4 shrink-0 h-7 text-xs border-current"
        asChild
      >
        <Link href="/upgrade">Upgrade</Link>
      </Button>
    </div>
  )
}
