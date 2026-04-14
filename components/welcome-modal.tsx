'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Phone, Mail, Zap } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/use-user'
import { CTA_BY_ROLE, DEFAULT_CTA } from '@/lib/onboarding-cta'

interface WelcomeModalProps {
  show: boolean
}

const FEATURES = [
  {
    icon: <Phone className="h-4 w-4 text-accent" />,
    title: 'Power Dialer',
    desc: 'Call more prospects in less time',
  },
  {
    icon: <Mail className="h-4 w-4 text-accent" />,
    title: 'Email Sequences',
    desc: 'Automate personalised follow-up at scale',
  },
  {
    icon: <Zap className="h-4 w-4 text-accent" />,
    title: 'Cadences',
    desc: 'Build multi-touch outreach that runs on autopilot',
  },
]

export function WelcomeModal({ show }: WelcomeModalProps) {
  const [open, setOpen] = useState(false)
  const { user } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!show || !user?.id) return
    const key = `welcome_shown_${user.id}`
    if (localStorage.getItem(key) !== 'true') {
      setOpen(true)
      localStorage.setItem(key, 'true')
    }
  }, [show, user?.id])

  const handleClose = () => {
    setOpen(false)
    router.replace('/')
  }

  const cta = CTA_BY_ROLE[user?.jobRole ?? ''] ?? DEFAULT_CTA
  const teamCta = user?.usageType === 'team'
    ? { label: 'Invite your team', href: '/settings?tab=team' }
    : null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Welcome to boilerroom{user?.firstName ? `, ${user.firstName}` : ''}!
          </DialogTitle>
          <DialogDescription>
            Your sales workspace is ready. Here&apos;s what you can do from day one.
          </DialogDescription>
        </DialogHeader>

        {/* Feature highlights */}
        <div className="grid grid-cols-3 gap-3 py-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            className="w-full bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white shadow-[0_0_20px_hsl(100,78%,44%,0.3)]"
            asChild
            onClick={handleClose}
          >
            <Link href={cta.href}>{cta.label}</Link>
          </Button>

          {teamCta && (
            <Button variant="outline" className="w-full" asChild onClick={handleClose}>
              <Link href={teamCta.href}>{teamCta.label}</Link>
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={handleClose}
          >
            Skip for now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
