'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Zap, ArrowLeft, ArrowRight, Mail, KeyRound } from 'lucide-react'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const isRecovery = searchParams.get('type') === 'recovery'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const supabase = createClient()

  // Always use production URL for auth redirects
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.boilerroom.ai'

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/reset-password?type=recovery`,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      setEmailSent(true)
      toast.success('Password reset email sent. Check your inbox.')
    } catch (error) {
      toast.error('An error occurred sending reset email')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Password updated successfully')
      window.location.href = '/login'
    } catch (error) {
      toast.error('An error occurred updating password')
    } finally {
      setLoading(false)
    }
  }

  // Set new password screen (after clicking email link)
  if (isRecovery) {
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

          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-[hsl(100,78%,44%,0.15)] flex items-center justify-center">
              <KeyRound className="h-8 w-8 text-[hsl(100,78%,44%)]" />
            </div>
          </div>

          {/* Header */}
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold text-white">Set new password</h2>
            <p className="text-white/50">Enter your new password below</p>
          </div>

          {/* Form */}
          <form onSubmit={handlePasswordUpdate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-white/70">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[hsl(100,78%,44%)] focus:ring-[hsl(100,78%,44%,0.3)] transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm text-white/70">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[hsl(100,78%,44%)] focus:ring-[hsl(100,78%,44%,0.3)] transition-all"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white font-semibold text-base transition-all shadow-[0_0_20px_hsl(100,78%,44%,0.3)] hover:shadow-[0_0_30px_hsl(100,78%,44%,0.4)]"
              disabled={loading}
            >
              {loading ? 'Updating...' : (
                <span className="flex items-center gap-2">
                  Update password <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // Email sent confirmation screen
  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(220,15%,7%)] p-6">
        <div className="w-full max-w-md space-y-8 text-center">
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

          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-[hsl(100,78%,44%,0.15)] flex items-center justify-center">
              <Mail className="h-8 w-8 text-[hsl(100,78%,44%)]" />
            </div>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">Check your email</h2>
            <p className="text-white/50">
              We&apos;ve sent a password reset link to
            </p>
          </div>

          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
            <p className="font-medium text-lg text-white">{email}</p>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-[hsl(100,78%,44%)] hover:text-[hsl(100,78%,54%)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  // Request reset form
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

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[hsl(100,78%,44%,0.15)] flex items-center justify-center">
            <KeyRound className="h-8 w-8 text-[hsl(100,78%,44%)]" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-bold text-white">Reset password</h2>
          <p className="text-white/50">Enter your email to receive a password reset link</p>
        </div>

        {/* Form */}
        <form onSubmit={handleResetRequest} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-white/70">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[hsl(100,78%,44%)] focus:ring-[hsl(100,78%,44%,0.3)] transition-all"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-12 bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white font-semibold text-base transition-all shadow-[0_0_20px_hsl(100,78%,44%,0.3)] hover:shadow-[0_0_30px_hsl(100,78%,44%,0.4)]"
            disabled={loading}
          >
            {loading ? 'Sending...' : (
              <span className="flex items-center gap-2">
                Send reset link <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        {/* Back to login */}
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-[hsl(100,78%,44%)] hover:text-[hsl(100,78%,54%)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[hsl(220,15%,7%)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(100,78%,44%)] flex items-center justify-center animate-pulse">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-white/50 text-lg">Loading...</span>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
