'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Zap, ArrowRight } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName.trim()) {
      toast.error('Please enter your first name')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          organizationName: organizationName.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Something went wrong')
        return
      }

      toast.success('Welcome to Boilerroom!')
      router.push('/')
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

        {/* Header */}
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold text-white">Welcome! Let&apos;s get started</h2>
          <p className="text-white/50">Tell us a bit about yourself</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm text-white/70">
                First name <span className="text-[hsl(100,78%,44%)]">*</span>
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[hsl(100,78%,44%)] focus:ring-[hsl(100,78%,44%,0.3)] transition-all"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm text-white/70">Last name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[hsl(100,78%,44%)] focus:ring-[hsl(100,78%,44%,0.3)] transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationName" className="text-sm text-white/70">Organization name</Label>
            <Input
              id="organizationName"
              type="text"
              placeholder="Acme Inc."
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              disabled={loading}
              className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[hsl(100,78%,44%)] focus:ring-[hsl(100,78%,44%,0.3)] transition-all"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-12 bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white font-semibold text-base transition-all shadow-[0_0_20px_hsl(100,78%,44%,0.3)] hover:shadow-[0_0_30px_hsl(100,78%,44%,0.4)]"
            disabled={loading}
          >
            {loading ? 'Setting up...' : (
              <span className="flex items-center gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
