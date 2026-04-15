'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Zap, Shield, Headphones } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/hooks/use-user'

const PLANS = [
  {
    key: 'starter' as const,
    name: 'Starter',
    monthlyPrice: 49,
    yearlyPrice: 39,
    description: 'For individual reps getting started',
    credits: 100,
    teammates: 1,
    features: [
      '100 credits / month',
      'Power Dialer',
      'Email sequences',
      '1 teammate seat',
      'Call recordings',
      'Standard support',
    ],
    popular: false,
  },
  {
    key: 'pro' as const,
    name: 'Pro',
    monthlyPrice: 99,
    yearlyPrice: 79,
    description: 'For power reps who want full automation',
    credits: 500,
    teammates: 5,
    features: [
      '500 credits / month',
      'Everything in Starter',
      'LinkedIn outreach',
      '5 teammate seats',
      'HubSpot integration',
      'Priority support',
    ],
    popular: true,
  },
  {
    key: 'pro_max' as const,
    name: 'Pro Max',
    monthlyPrice: 199,
    yearlyPrice: 159,
    description: 'For teams that need scale and control',
    credits: 1000,
    teammates: 10,
    features: [
      '1,000 credits / month',
      'Everything in Pro',
      'Advanced analytics',
      '10 teammate seats',
      'Custom integrations',
      'Dedicated support',
    ],
    popular: false,
  },
]

export default function UpgradePage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState<string | null>(null)
  const { user } = useUser()
  const router = useRouter()

  const handleUpgrade = async (planKey: 'starter' | 'pro' | 'pro_max') => {
    setLoading(planKey)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, billing }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const isCurrentPlan = (planKey: string) => user?.tier === planKey

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-16 px-4">
      {/* Header */}
      <div className="text-center space-y-4 mb-10 max-w-xl">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-foreground">boilerroom<span className="text-accent">.ai</span></span>
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Unlock the full power of boilerroom
        </h1>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="flex items-center p-1 rounded-full bg-secondary border border-border">
            <button
              onClick={() => setBilling('monthly')}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                billing === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                billing === 'yearly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Yearly
            </button>
          </div>
        </div>
        {billing === 'yearly' && (
          <p className="text-sm text-accent font-medium">Save ~20% with a yearly plan</p>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full max-w-5xl">

        {/* Trial card — always visible, non-interactive */}
        <div className={cn(
          'relative flex flex-col rounded-2xl border p-6',
          user?.tier === 'trial' ? 'border-white/20 bg-white/5' : 'border-border bg-card opacity-60'
        )}>
          {user?.tier === 'trial' && (
            <div className="absolute -top-3 right-5">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white/70 border border-white/20">
                Current plan
              </span>
            </div>
          )}
          <div className="mb-5">
            <h2 className="text-lg font-bold text-foreground">Trial</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Try before you commit</p>
          </div>
          <div className="mb-5">
            <span className="text-4xl font-bold text-foreground">Free</span>
            <p className="text-xs text-muted-foreground mt-1">no credit card needed</p>
          </div>
          <div className="w-full py-2.5 rounded-lg border border-border text-center text-sm font-medium text-muted-foreground mb-5 cursor-default">
            {user?.tier === 'trial' ? 'Active' : 'Expired'}
          </div>
          <ul className="space-y-2.5 flex-1">
            {[
              '25 credits total',
              '10 prospects',
              '25 calls',
              '1 sequence (5 steps)',
              '1 call recording',
              'No email sending',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-foreground/60">
                <Check className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        {PLANS.map((plan) => {
          const price = billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
          const originalPrice = plan.monthlyPrice
          const isCurrent = isCurrentPlan(plan.key)

          return (
            <div
              key={plan.key}
              className={cn(
                'relative flex flex-col rounded-2xl border p-6 transition-all',
                plan.popular
                  ? 'border-accent bg-accent/5 shadow-[0_0_40px_hsl(100,78%,44%,0.12)]'
                  : 'border-border bg-card'
              )}
            >
              {/* Most Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3 right-5">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent text-white shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan name */}
              <div className="mb-5">
                <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-baseline gap-2">
                  {billing === 'yearly' && (
                    <span className="text-base text-muted-foreground line-through">${originalPrice}</span>
                  )}
                  <span className="text-4xl font-bold text-foreground">${price}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  per month{billing === 'yearly' ? ', billed yearly' : ''}
                </p>
              </div>

              {/* CTA button */}
              {isCurrent ? (
                <div className="w-full py-2.5 rounded-lg border border-border text-center text-sm font-medium text-muted-foreground mb-5">
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={loading === plan.key}
                  className={cn(
                    'w-full py-2.5 rounded-lg text-sm font-semibold transition-all mb-5',
                    plan.popular
                      ? 'bg-accent hover:bg-[hsl(100,78%,38%)] text-white shadow-[0_0_16px_hsl(100,78%,44%,0.3)]'
                      : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border'
                  )}
                >
                  {loading === plan.key ? 'Redirecting...' : 'Upgrade'}
                </button>
              )}

              {/* Feature list */}
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Trust signals */}
      <div className="mt-12 flex flex-col items-center gap-4">
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Stripe checkout
          </span>
          <span className="flex items-center gap-1.5">
            <Headphones className="h-3.5 w-3.5" /> Priority support
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" /> Cancel anytime
          </span>
        </div>
        <Link href="/settings?tab=billing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Back to settings
        </Link>
      </div>
    </div>
  )
}
