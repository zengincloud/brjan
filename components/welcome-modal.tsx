'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/use-user'
import {
  ArrowRight, ArrowLeft, Search, Users, Phone, Mail, Settings,
  Zap, CircleDot, Filter, BarChart3, CheckCircle2, ChevronRight,
  MoreHorizontal, Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WelcomeModalProps {
  show: boolean
}

const ACCENT = 'hsl(100,78%,44%)'

// ─── Step mockups ────────────────────────────────────────────────────────────

function ProspectingMockup() {
  return (
    <div className="w-full rounded-xl bg-[hsl(220,15%,10%)] border border-white/10 overflow-hidden p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <Search className="h-3.5 w-3.5 text-white/30" />
          <span className="text-xs text-white/30">Search by name, company, title…</span>
        </div>
        <div className="px-3 py-2 rounded-lg bg-accent/15 border border-accent/30 flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-accent" />
          <span className="text-xs text-accent font-medium">Filters</span>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { name: 'Jordan Mills', title: 'VP of Sales', co: 'Acme Corp' },
          { name: 'Riley Chen', title: 'Head of Growth', co: 'Stride Inc.' },
          { name: 'Sam Torres', title: 'Sales Director', co: 'Nexlify' },
        ].map((p, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-semibold text-accent">{p.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{p.name}</p>
              <p className="text-[10px] text-white/40 truncate">{p.title} · {p.co}</p>
            </div>
            <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center shrink-0">
              <Plus className="h-3 w-3 text-white/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProspectsMockup() {
  const statuses = [
    { label: 'New', color: 'bg-blue-500/20 text-blue-400' },
    { label: 'Called', color: 'bg-accent/20 text-accent' },
    { label: 'Interested', color: 'bg-purple-500/20 text-purple-400' },
  ]
  return (
    <div className="w-full rounded-xl bg-[hsl(220,15%,10%)] border border-white/10 overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-white/[0.06]">
        {['All', 'Active', 'New', 'Called'].map((t, i) => (
          <span key={t} className={cn('text-xs', i === 0 ? 'text-accent font-semibold border-b border-accent pb-0.5' : 'text-white/30')}>{t}</span>
        ))}
      </div>
      <div className="divide-y divide-white/[0.04]">
        {[
          { name: 'Jordan Mills', co: 'Acme Corp', s: 0 },
          { name: 'Riley Chen', co: 'Stride Inc.', s: 1 },
          { name: 'Sam Torres', co: 'Nexlify', s: 2 },
        ].map((p, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-semibold text-white/60">{p.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{p.name}</p>
              <p className="text-[10px] text-white/40">{p.co}</p>
            </div>
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', statuses[p.s].color)}>
              {statuses[p.s].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DialerMockup() {
  return (
    <div className="w-full rounded-xl bg-[hsl(220,15%,10%)] border border-white/10 overflow-hidden p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50 font-medium">Active call</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] text-accent font-medium">0:42</span>
        </span>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
        <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-accent">J</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Jordan Mills</p>
          <p className="text-[10px] text-white/40">+1 (555) 000-1234</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['Mute', 'Hold', 'End'].map((a, i) => (
          <button key={a} className={cn(
            'py-2 rounded-lg text-xs font-medium transition-colors',
            i === 2 ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-white/5 text-white/50 border border-white/10'
          )}>{a}</button>
        ))}
      </div>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <Phone className="h-3.5 w-3.5 text-white/30 shrink-0" />
        <span className="text-[10px] text-white/30">3 more prospects queued</span>
      </div>
    </div>
  )
}

function SequencerMockup() {
  const steps = [
    { icon: <Mail className="h-3 w-3" />, label: 'Email', day: 'Day 1', color: 'text-blue-400 bg-blue-500/15 border-blue-500/25' },
    { icon: <Phone className="h-3 w-3" />, label: 'Call', day: 'Day 3', color: 'text-accent bg-accent/15 border-accent/25' },
    { icon: <Mail className="h-3 w-3" />, label: 'Follow-up', day: 'Day 7', color: 'text-purple-400 bg-purple-500/15 border-purple-500/25' },
  ]
  return (
    <div className="w-full rounded-xl bg-[hsl(220,15%,10%)] border border-white/10 overflow-hidden p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white">Q2 Outreach</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">Active</span>
      </div>
      <div className="relative">
        <div className="absolute left-4 top-4 bottom-4 w-px bg-white/10" />
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3 pl-2">
              <div className={cn('w-5 h-5 rounded-full border flex items-center justify-center shrink-0 relative z-10', s.color)}>
                {s.icon}
              </div>
              <div className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <span className="text-xs text-white font-medium">{s.label}</span>
                <span className="text-[10px] text-white/30">{s.day}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-white/30">24 enrolled</span>
        <span className="text-[10px] text-accent">42% open rate</span>
      </div>
    </div>
  )
}

function SettingsMockup() {
  const sections = [
    { icon: <Users className="h-3.5 w-3.5" />, label: 'Team & Members' },
    { icon: <Phone className="h-3.5 w-3.5" />, label: 'Phone Numbers' },
    { icon: <Mail className="h-3.5 w-3.5" />, label: 'Email Integration' },
    { icon: <BarChart3 className="h-3.5 w-3.5" />, label: 'Compliance' },
  ]
  return (
    <div className="w-full rounded-xl bg-[hsl(220,15%,10%)] border border-white/10 overflow-hidden p-4 space-y-2">
      {sections.map((s, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-white/50">
            {s.icon}
          </div>
          <span className="text-xs font-medium text-white/70 flex-1">{s.label}</span>
          <ChevronRight className="h-3.5 w-3.5 text-white/20" />
        </div>
      ))}
    </div>
  )
}

function CreditsMockup() {
  return (
    <div className="w-full rounded-xl bg-[hsl(220,15%,10%)] border border-white/10 overflow-hidden p-4 space-y-3">
      <div className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Sidebar — bottom left</div>
      <div className="rounded-lg border-2 border-accent/40 bg-accent/5 p-3 space-y-3">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
          <CircleDot className="h-3.5 w-3.5 text-white/30 shrink-0" />
          <span className="text-xs text-white/50">50 credits remaining</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-accent text-white justify-center">
          <Zap className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Upgrade Plan</span>
        </div>
      </div>
      <p className="text-[10px] text-white/40 text-center">Each prospect search, email send, and enrichment uses credits.</p>
    </div>
  )
}

// ─── Tour steps data ──────────────────────────────────────────────────────────

const STEPS = [
  {
    title: 'Prospecting',
    description: 'Search millions of contacts and build targeted lists. Filter by job title, industry, company size, and more — then add them to your pipeline in one click.',
    mockup: <ProspectingMockup />,
  },
  {
    title: 'Prospects',
    description: 'Your full pipeline in one view. Track statuses, log call and email activity, and pick up right where you left off on every contact.',
    mockup: <ProspectsMockup />,
  },
  {
    title: 'Dialer',
    description: 'Power through your call list. Call multiple prospects back-to-back, drop voicemails instantly, and log outcomes automatically — no manual data entry.',
    mockup: <DialerMockup />,
  },
  {
    title: 'Sequencer',
    description: 'Build multi-step email and call sequences that run on autopilot. Personalize at scale and follow up without lifting a finger.',
    mockup: <SequencerMockup />,
  },
  {
    title: 'Settings',
    description: "Configure your team, phone numbers, email integrations, and compliance settings. Everything you need to get your workspace running your way.",
    mockup: <SettingsMockup />,
  },
  {
    title: 'Keep an eye on your credits',
    description: "You'll see your remaining credits in the bottom-left corner of the sidebar at all times. Each prospect search, email, and enrichment uses credits — you start with 50 to get going.",
    mockup: <CreditsMockup />,
  },
]

// ─── Main component ───────────────────────────────────────────────────────────

export function WelcomeModal({ show }: WelcomeModalProps) {
  const [open, setOpen] = useState(false)
  // -1 = welcome screen, 0–5 = tour steps
  const [step, setStep] = useState(-1)
  const { user } = useUser()

  useEffect(() => {
    if (!user?.id) return
    const key = `welcome_shown_${user.id}`
    if (localStorage.getItem(key) !== 'true') {
      setOpen(true)
      localStorage.setItem(key, 'true')
    }
  }, [user?.id])

  const close = () => {
    setOpen(false)
    setStep(-1)
  }

  const totalSteps = STEPS.length

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close() }}>
      <DialogContent
        className="p-0 overflow-hidden border border-white/10 bg-[hsl(220,15%,9%)]"
        style={{ maxWidth: 460 }}
      >
        {step === -1 ? (
          /* ── Welcome screen ── */
          <div className="flex flex-col">
            {/* Illustration area */}
            <div className="relative bg-[hsl(220,15%,6%)] border-b border-white/[0.06] p-6 pb-5">
              {/* Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-accent/10 blur-3xl pointer-events-none" />
              {/* Fake app preview */}
              <div className="relative rounded-xl border border-white/10 bg-[hsl(220,15%,10%)] overflow-hidden">
                {/* Top bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-[hsl(220,15%,8%)]">
                  <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex gap-1 ml-1">
                    {['Prospects', 'Dialer', 'Sequencer'].map((t) => (
                      <span key={t} className="text-[10px] px-2.5 py-1 rounded-md text-white/40">{t}</span>
                    ))}
                  </div>
                </div>
                {/* Content preview */}
                <div className="p-4 space-y-2">
                  {[
                    { w: 'w-1/3', label: 'Prospecting', icon: <Search className="h-3 w-3 text-accent" /> },
                    { w: 'w-1/2', label: 'Prospects', icon: <Users className="h-3 w-3 text-blue-400" /> },
                    { w: 'w-2/5', label: 'Dialer', icon: <Phone className="h-3 w-3 text-purple-400" /> },
                    { w: 'w-3/5', label: 'Sequencer', icon: <Mail className="h-3 w-3 text-orange-400" /> },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.05]">
                      {r.icon}
                      <span className="text-[10px] text-white/50 font-medium">{r.label}</span>
                      <div className={cn('h-1.5 rounded-full bg-white/10 ml-auto', r.w)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Text + CTAs */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5 text-center">
                <h2 className="text-2xl font-bold text-white">
                  Welcome to boilerroom{user?.firstName ? `, ${user.firstName}` : ''}!
                </h2>
                <p className="text-sm text-white/50">
                  We&apos;d love to show you around your new sales workspace.
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  variant="ghost"
                  className="flex-1 h-11 text-white/50 hover:text-white hover:bg-white/5 border border-white/10"
                  onClick={close}
                >
                  Maybe Later
                </Button>
                <Button
                  className="flex-1 h-11 font-semibold text-white shadow-[0_0_20px_hsl(100,78%,44%,0.3)]"
                  style={{ background: ACCENT }}
                  onClick={() => setStep(0)}
                >
                  Let&apos;s Go <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Feature tour ── */
          <div className="flex flex-col">
            {/* Mockup */}
            <div className="bg-[hsl(220,15%,6%)] border-b border-white/[0.06] p-5">
              {STEPS[step].mockup}
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white">{STEPS[step].title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{STEPS[step].description}</p>
              </div>

              {/* Nav row */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  variant="ghost"
                  className="h-10 px-4 text-white/50 hover:text-white hover:bg-white/5 border border-white/10"
                  onClick={() => setStep((s) => s - 1)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>

                {/* Step dots */}
                <div className="flex-1 flex items-center justify-center gap-1.5">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'rounded-full transition-all duration-300',
                        i === step
                          ? 'w-4 h-1.5 bg-accent'
                          : i < step
                          ? 'w-1.5 h-1.5 bg-accent/40'
                          : 'w-1.5 h-1.5 bg-white/20'
                      )}
                    />
                  ))}
                </div>

                {step < totalSteps - 1 ? (
                  <Button
                    className="h-10 px-4 font-semibold text-white"
                    style={{ background: ACCENT }}
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    className="h-10 px-4 font-semibold text-white"
                    style={{ background: ACCENT }}
                    onClick={close}
                  >
                    Get started <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>

              {/* Step counter */}
              <p className="text-center text-[11px] text-white/25">
                {step + 1} of {totalSteps}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
