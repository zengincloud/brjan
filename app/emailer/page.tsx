'use client'

import { useUser } from "@/hooks/use-user"
import { EmailerDashboard } from "@/components/emailer-dashboard"

export default function EmailerPage() {
  const { user } = useUser()
  const isTrialUser = user?.tier === 'trial' && user?.role !== 'super_admin'

  return <EmailerDashboard isTrialUser={isTrialUser} />
}
