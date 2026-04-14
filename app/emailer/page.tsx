'use client'

import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmailerDashboard } from "@/components/emailer-dashboard"
import { useUser } from "@/hooks/use-user"

export default function EmailerPage() {
  const { user } = useUser()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Emailer</h1>
      {user?.tier === 'trial' && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>You&apos;ve run out of credits. Email sending is not available on the Trial plan.</span>
          </div>
          <Button size="sm" variant="outline" className="ml-4 shrink-0 h-7 text-xs border-current" asChild>
            <Link href="/settings?tab=billing">Upgrade</Link>
          </Button>
        </div>
      )}
      <EmailerDashboard />
    </div>
  )
}
