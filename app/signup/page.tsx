'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Zap, Phone, Mail, BarChart3, ArrowRight, CheckCircle2, ArrowBigUp, ArrowLeft, Loader2 } from 'lucide-react'

const MIN_PASSWORD_LENGTH = 8

export default function SignupPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmedEmail, setConfirmedEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [verifying, setVerifying] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const supabase = createClient()

  // Always use production URL for auth redirects
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.boilerroom.ai'

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    const nameParts = name.trim().split(/\s+/)
    if (nameParts.length < 2 || !nameParts[1]) {
      setNameError(name.trim() ? 'Last name missing' : 'First and last name missing')
      return
    }

    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    if (!password) {
      toast.error('Please enter a password')
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }

    if (!agreeToTerms) {
      toast.error('Please agree to the Terms of Service and Privacy Policy')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(' '),
            organizationName: organizationName.trim() || undefined,
          },
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      })

      if (error) {
        if (data?.user && data.user.identities?.length === 0) {
          setConfirmedEmail(email)
          setShowConfirmation(true)
          return
        }

        if (error.message.includes('User already registered')) {
          setEmailError('Account already exists')
        } else if (error.message.includes('Email rate limit exceeded')) {
          toast.error('Too many signup attempts. Please wait a few minutes and try again.')
        } else if (error.message.includes('Invalid email')) {
          toast.error('Please enter a valid email address')
        } else if (error.message.includes('Signups not allowed')) {
          toast.error('Email signups are disabled. Please contact support.')
        } else {
          toast.error(`Signup failed: ${error.message}`)
        }
        return
      }

      if (data.user) {
        if (!data.user.confirmed_at || data.session === null) {
          setConfirmedEmail(email)
          setShowConfirmation(true)
          toast.success('Confirmation email sent!')
        } else {
          toast.success('Account created successfully! Redirecting...')
          setTimeout(() => {
            router.push('/')
            router.refresh()
          }, 1000)
        }
      }
    } catch (error: any) {
      toast.error(`Unexpected error: ${error.message || 'Please try again'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setGoogleLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
        },
      })

      if (error) {
        toast.error(error.message)
        setGoogleLoading(false)
      }
    } catch (error) {
      toast.error('An error occurred during Google signup')
      setGoogleLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    // Auto-advance
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
    // Auto-submit when all 6 filled
    if (digit && index === 5) {
      const code = [...next].join('')
      if (code.length === 6) handleVerifyOtp(code)
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = [...otp]
    pasted.split('').forEach((d, i) => { next[i] = d })
    setOtp(next)
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6) handleVerifyOtp(pasted)
  }

  const handleVerifyOtp = async (code: string) => {
    setVerifying(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: confirmedEmail,
        token: code,
        type: 'signup',
      })
      if (error) {
        toast.error('Invalid code. Please try again.')
        setOtp(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
        return
      }
      toast.success('Email confirmed!')
      router.push('/')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  // Confirmation screen
  if (showConfirmation) {
    const otpValue = otp.join('')
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(220,15%,7%)] p-6">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-[hsl(100,78%,44%,0.15)] flex items-center justify-center">
            <Mail className="h-10 w-10 text-[hsl(100,78%,44%)]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">Check your email</h2>
            <p className="text-white/50">
              We sent a 6-digit code to{' '}
              <span className="text-white font-medium">{confirmedEmail}</span>
            </p>
          </div>

          {verifying ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="h-10 w-10 text-[hsl(100,78%,44%)] animate-spin" />
              <p className="text-white/60 font-medium">Verifying your code…</p>
            </div>
          ) : (
            <>
              {/* OTP inputs */}
              <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-white/5 border border-white/10 text-white focus:border-[hsl(100,78%,44%)] focus:outline-none focus:ring-2 focus:ring-[hsl(100,78%,44%,0.3)] transition-all"
                  />
                ))}
              </div>

              <Button
                onClick={() => handleVerifyOtp(otpValue)}
                disabled={otpValue.length < 6}
                className="w-full h-12 bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white font-semibold shadow-[0_0_20px_hsl(100,78%,44%,0.3)]"
              >
                Confirm account
              </Button>

              <p className="text-sm text-white/30">
                Didn&apos;t get it? Check your spam folder.
              </p>

              <button
                onClick={() => setShowConfirmation(false)}
                className="flex items-center gap-1.5 mx-auto text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign up
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[hsl(220,15%,4%)] flex-col justify-between p-12">
        {/* Animated gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,hsl(100,78%,44%,0.15),transparent_70%)] blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,hsl(100,78%,44%,0.08),transparent_70%)] blur-2xl animate-pulse [animation-delay:1s]" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(hsl(100,78%,44%) 1px, transparent 1px), linear-gradient(90deg, hsl(100,78%,44%) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(100,78%,44%)] flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="font-semibold text-xl flex items-baseline">
              <span className="text-white">boilerroom</span>
              <span className="text-[hsl(100,78%,44%)]">.ai</span>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl font-bold text-white leading-tight tracking-tight">
            Start selling
            <br />
            <span className="text-[hsl(100,78%,44%)]">smarter.</span>
          </h1>
          <p className="text-lg text-white/50 max-w-md leading-relaxed">
            Join thousands of sales teams using AI to prospect, connect, and close faster than ever.
          </p>

          {/* Checklist */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-[hsl(100,78%,44%)]" />
              <span className="text-white/70">25 free credits to get started</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-[hsl(100,78%,44%)]" />
              <span className="text-white/70">No credit card required</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-[hsl(100,78%,44%)]" />
              <span className="text-white/70">Set up in 30 seconds</span>
            </div>
          </div>
        </div>

        {/* Bottom feature pills */}
        <div className="relative z-10 flex flex-wrap gap-3 pt-8 border-t border-white/10">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
            <Phone className="h-4 w-4 text-[hsl(100,78%,44%)]" />
            <span className="text-sm text-white/70">Parallel Dialer</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
            <Mail className="h-4 w-4 text-[hsl(100,78%,44%)]" />
            <span className="text-sm text-white/70">Email Sequences</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
            <BarChart3 className="h-4 w-4 text-[hsl(100,78%,44%)]" />
            <span className="text-sm text-white/70">Smart Prospecting</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-[hsl(220,15%,7%)]">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
            <div className="w-10 h-10 rounded-xl bg-[hsl(100,78%,44%)] flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="font-semibold text-xl flex items-baseline">
              <span className="text-white">boilerroom</span>
              <span className="text-[hsl(100,78%,44%)]">.ai</span>
            </div>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white">Create an account</h2>
            <p className="text-white/50">Enter your information to get started</p>
          </div>

          {/* Google OAuth */}
          <Button
            variant="outline"
            type="button"
            className="w-full h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white transition-all"
            onClick={handleGoogleSignup}
            disabled={googleLoading}
          >
            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-3 text-white/30 bg-[hsl(220,15%,7%)]">
                or continue with email
              </span>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="name" className="text-sm text-white/70">Name</Label>
                <span className="flex items-center gap-1 text-xs text-white/30">
                  Name + Company is autocapitalized — save yourself the <ArrowBigUp className="h-3.5 w-3.5" />
                </span>
              </div>
              <Input
                id="name"
                type="text"
                placeholder="First and Last Name"
                value={name}
                onChange={(e) => {
                  const capitalized = e.target.value.replace(/\b\w/g, (c) => c.toUpperCase())
                  setName(capitalized)
                  const parts = capitalized.trim().split(/\s+/)
                  if (!capitalized.trim()) {
                    setNameError('')
                  } else if (parts.length < 2 || !parts[1]) {
                    setNameError('Last name missing')
                  } else {
                    setNameError('')
                  }
                }}
                onBlur={() => {
                  const parts = name.trim().split(/\s+/)
                  if (!name.trim()) {
                    setNameError('First and last name missing')
                  } else if (parts.length < 2 || !parts[1]) {
                    setNameError('Last name missing')
                  }
                }}
                disabled={loading}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[hsl(100,78%,44%)] focus:ring-[hsl(100,78%,44%,0.3)] transition-all"
              />
              {nameError && <p className="text-xs text-red-400">{nameError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationName" className="text-sm text-white/70">Company name</Label>
              <Input
                id="organizationName"
                type="text"
                placeholder="Acme Inc."
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value.replace(/\b\w/g, (c) => c.toUpperCase()))}
                disabled={loading}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[hsl(100,78%,44%)] focus:ring-[hsl(100,78%,44%,0.3)] transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-white/70">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
                required
                disabled={loading}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[hsl(100,78%,44%)] focus:ring-[hsl(100,78%,44%,0.3)] transition-all"
              />
              {emailError && (
                <p className="text-xs text-red-400">
                  {emailError} —{' '}
                  <Link href="/login" className="underline hover:text-red-300">sign in instead</Link>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-white/70">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[hsl(100,78%,44%)] focus:ring-[hsl(100,78%,44%,0.3)] transition-all"
              />
              {password.length > 0 && password.length < MIN_PASSWORD_LENGTH ? (
                <p className="text-xs text-red-400">
                  Password must be at least {MIN_PASSWORD_LENGTH} characters ({password.length}/{MIN_PASSWORD_LENGTH})
                </p>
              ) : (
                <p className="text-xs text-white/30">
                  Must be at least {MIN_PASSWORD_LENGTH} characters
                </p>
              )}
            </div>
            <div className="flex items-start space-x-2 pt-1">
              <Checkbox
                id="terms"
                checked={agreeToTerms}
                onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                disabled={loading}
                className="border-white/20 data-[state=checked]:bg-[hsl(100,78%,44%)] data-[state=checked]:border-[hsl(100,78%,44%)]"
              />
              <label
                htmlFor="terms"
                className="text-sm leading-none text-white/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the{' '}
                <span className="text-[hsl(100,78%,44%)] hover:underline cursor-pointer">
                  Terms of Service
                </span>{' '}
                and{' '}
                <span className="text-[hsl(100,78%,44%)] hover:underline cursor-pointer">
                  Privacy Policy
                </span>
              </label>
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white font-semibold text-base transition-all shadow-[0_0_20px_hsl(100,78%,44%,0.3)] hover:shadow-[0_0_30px_hsl(100,78%,44%,0.4)]"
              disabled={loading}
            >
              {loading ? 'Creating account...' : (
                <span className="flex items-center gap-2">
                  Create account <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-white/40">
            Already have an account?{' '}
            <Link href="/login" className="text-[hsl(100,78%,44%)] hover:text-[hsl(100,78%,54%)] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
