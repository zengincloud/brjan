'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Zap,
  ArrowRight,
  ArrowLeft,
  Users,
  TrendingUp,
  BarChart3,
  HelpCircle,
  User,
  CalendarCheck,
} from 'lucide-react'

type JobRole = 'sdr_bdr' | 'account_executive' | 'sales_manager' | 'founder_ceo' | 'other'
type UsageType = 'personal' | 'team'
type PrimaryGoal = 'book_more_meetings' | 'automate_outreach' | 'manage_team_pipeline'

const ROLES: { value: JobRole; label: string; sub: string; icon: React.ReactNode }[] = [
  { value: 'sdr_bdr', label: 'SDR / BDR', sub: 'Sales development rep', icon: <Users className="h-5 w-5" /> },
  { value: 'account_executive', label: 'Account Executive', sub: 'Closing deals', icon: <TrendingUp className="h-5 w-5" /> },
  { value: 'sales_manager', label: 'Sales Manager', sub: 'Managing a team', icon: <BarChart3 className="h-5 w-5" /> },
  { value: 'founder_ceo', label: 'Founder / CEO', sub: 'Wearing many hats', icon: <Zap className="h-5 w-5" /> },
  { value: 'other', label: 'Other', sub: 'Something else', icon: <HelpCircle className="h-5 w-5" /> },
]

const GOALS: { value: PrimaryGoal; label: string; sub: string; icon: React.ReactNode }[] = [
  { value: 'book_more_meetings', label: 'Book more meetings', sub: 'Fill my calendar with qualified conversations', icon: <CalendarCheck className="h-5 w-5" /> },
  { value: 'automate_outreach', label: 'Automate my outreach', sub: 'Run sequences and follow-ups on autopilot', icon: <Zap className="h-5 w-5" /> },
  { value: 'manage_team_pipeline', label: 'Manage my team\'s pipeline', sub: 'Oversee activity across my team', icon: <BarChart3 className="h-5 w-5" /> },
]

const ACCENT = 'hsl(100,78%,44%)'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    organizationName: '',
    jobRole: null as JobRole | null,
    usageType: null as UsageType | null,
    primaryGoal: null as PrimaryGoal | null,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!formData.primaryGoal) {
      toast.error('Please select a goal')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          organizationName: formData.organizationName.trim(),
          jobRole: formData.jobRole,
          usageType: formData.usageType,
          primaryGoal: formData.primaryGoal,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Something went wrong')
        return
      }
      router.push('/?welcome=true')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(220,15%,7%)] p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center">
          <div className="w-10 h-10 rounded-xl bg-[hsl(100,78%,44%)] flex items-center justify-center">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="font-semibold text-xl flex items-baseline">
            <span className="text-white">boilerroom</span>
            <span className="text-[hsl(100,78%,44%)]">.ai</span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {([1, 2, 3, 4] as const).map((s) => (
            <div
              key={s}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                s === step
                  ? 'w-8 bg-[hsl(100,78%,44%)]'
                  : s < step
                  ? 'w-4 bg-[hsl(100,78%,44%,0.5)]'
                  : 'w-4 bg-white/20'
              )}
            />
          ))}
        </div>

        {/* Step 1: Name + Org */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-bold text-white">Welcome! Let&apos;s get started</h2>
              <p className="text-white/50">Tell us a bit about yourself</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm text-white/70">
                    First name <span className="text-[hsl(100,78%,44%)]">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData((d) => ({ ...d, firstName: e.target.value }))}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[hsl(100,78%,44%)] transition-all"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm text-white/70">Last name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData((d) => ({ ...d, lastName: e.target.value }))}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[hsl(100,78%,44%)] transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationName" className="text-sm text-white/70">Organization name</Label>
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="Acme Inc."
                  value={formData.organizationName}
                  onChange={(e) => setFormData((d) => ({ ...d, organizationName: e.target.value }))}
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[hsl(100,78%,44%)] transition-all"
                />
              </div>
              <Button
                onClick={() => {
                  if (!formData.firstName.trim()) {
                    toast.error('Please enter your first name')
                    return
                  }
                  setStep(2)
                }}
                className="w-full h-12 bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white font-semibold text-base transition-all shadow-[0_0_20px_hsl(100,78%,44%,0.3)] hover:shadow-[0_0_30px_hsl(100,78%,44%,0.4)]"
              >
                <span className="flex items-center gap-2">
                  Continue <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Role */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-bold text-white">What&apos;s your role?</h2>
              <p className="text-white/50">We&apos;ll tailor your experience accordingly</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  onClick={() => setFormData((d) => ({ ...d, jobRole: role.value }))}
                  className={cn(
                    'flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left',
                    formData.jobRole === role.value
                      ? 'border-[hsl(100,78%,44%)] bg-[hsl(100,78%,44%,0.08)]'
                      : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/8'
                  )}
                >
                  <span className={cn(
                    'transition-colors',
                    formData.jobRole === role.value ? 'text-[hsl(100,78%,44%)]' : 'text-white/50'
                  )}>
                    {role.icon}
                  </span>
                  <div>
                    <span className="text-sm font-semibold text-white block">{role.label}</span>
                    <span className="text-xs text-white/40">{role.sub}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="flex-1 h-12 text-white/50 hover:text-white hover:bg-white/5"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!formData.jobRole}
                className="flex-1 h-12 bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white font-semibold transition-all shadow-[0_0_20px_hsl(100,78%,44%,0.3)] disabled:opacity-40 disabled:shadow-none"
              >
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Personal or Team */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-bold text-white">Who are you setting this up for?</h2>
              <p className="text-white/50">This helps us personalise your workspace</p>
            </div>
            <div className="flex flex-col gap-3">
              {([
                {
                  value: 'personal' as UsageType,
                  label: 'Just me',
                  sub: "I'm using boilerroom on my own",
                  icon: <User className="h-6 w-6" />,
                },
                {
                  value: 'team' as UsageType,
                  label: 'My team',
                  sub: "I'm setting this up for my team or organization",
                  icon: <Users className="h-6 w-6" />,
                },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setFormData((d) => ({ ...d, usageType: opt.value }))
                    setStep(4)
                  }}
                  className="flex items-center gap-4 p-5 rounded-xl border-2 border-white/10 bg-white/5 hover:border-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,44%,0.08)] transition-all text-left group"
                >
                  <span className="text-white/50 group-hover:text-[hsl(100,78%,44%)] transition-colors shrink-0">
                    {opt.icon}
                  </span>
                  <div>
                    <span className="text-base font-semibold text-white block">{opt.label}</span>
                    <span className="text-sm text-white/40">{opt.sub}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-[hsl(100,78%,44%)] ml-auto transition-colors" />
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => setStep(2)}
              className="w-full h-10 text-white/50 hover:text-white hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </div>
        )}

        {/* Step 4: Primary Goal */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-bold text-white">What&apos;s your primary goal?</h2>
              <p className="text-white/50">We&apos;ll optimise your setup around this</p>
            </div>
            <div className="flex flex-col gap-3">
              {GOALS.map((goal) => (
                <button
                  key={goal.value}
                  onClick={() => setFormData((d) => ({ ...d, primaryGoal: goal.value }))}
                  className={cn(
                    'flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left group',
                    formData.primaryGoal === goal.value
                      ? 'border-[hsl(100,78%,44%)] bg-[hsl(100,78%,44%,0.08)]'
                      : 'border-white/10 bg-white/5 hover:border-white/25'
                  )}
                >
                  <span className={cn(
                    'transition-colors shrink-0',
                    formData.primaryGoal === goal.value ? 'text-[hsl(100,78%,44%)]' : 'text-white/50'
                  )}>
                    {goal.icon}
                  </span>
                  <div>
                    <span className="text-base font-semibold text-white block">{goal.label}</span>
                    <span className="text-sm text-white/40">{goal.sub}</span>
                  </div>
                  {formData.primaryGoal === goal.value && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-[hsl(100,78%,44%)] flex items-center justify-center shrink-0">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep(3)}
                className="flex-1 h-12 text-white/50 hover:text-white hover:bg-white/5"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.primaryGoal || loading}
                className="flex-1 h-12 bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white font-semibold transition-all shadow-[0_0_20px_hsl(100,78%,44%,0.3)] disabled:opacity-40 disabled:shadow-none"
              >
                {loading ? 'Setting up...' : (
                  <span className="flex items-center gap-2">
                    Get started <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
