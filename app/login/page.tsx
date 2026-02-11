'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Zap, Phone, Mail, BarChart3, ArrowRight } from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const supabase = createClient()

  // Always use production URL for auth redirects
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.boilerroom.ai'

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    if (!password) {
      toast.error('Please enter your password')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password. Please check your credentials and try again.')
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please confirm your email address before logging in. Check your inbox.')
        } else if (error.message.includes('Email rate limit exceeded')) {
          toast.error('Too many login attempts. Please wait a few minutes and try again.')
        } else if (error.message.includes('not authorized') || error.message.includes('Email link is invalid')) {
          toast.error('Your session has expired. Please try logging in again.')
        } else {
          toast.error(`Login failed: ${error.message}`)
        }
        return
      }

      if (data.user) {
        toast.success('Logged in successfully! Redirecting...', {
          duration: 2000,
        })
        setTimeout(() => {
          router.push(redirect)
          router.refresh()
        }, 500)
      }
    } catch (error: any) {
      toast.error(`Unexpected error: ${error.message || 'Please try again'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback?redirect=${redirect}`,
        },
      })

      if (error) {
        toast.error(error.message)
        setGoogleLoading(false)
      }
    } catch (error) {
      toast.error('An error occurred during Google login')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[hsl(220,15%,4%)] flex-col justify-between p-12">
        {/* Animated gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,hsl(100,78%,44%,0.15),transparent_70%)] blur-3xl animate-pulse" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,hsl(100,78%,44%,0.08),transparent_70%)] blur-2xl animate-pulse [animation-delay:1s]" />

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
            Close more deals.
            <br />
            <span className="text-[hsl(100,78%,44%)]">Faster.</span>
          </h1>
          <p className="text-lg text-white/50 max-w-md leading-relaxed">
            AI-powered sales engagement platform with parallel dialing, automated sequences, and smart prospecting.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 pt-2">
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

        {/* Bottom stats */}
        <div className="relative z-10 flex gap-8 pt-8 border-t border-white/10">
          <div>
            <p className="text-2xl font-bold text-white">10x</p>
            <p className="text-sm text-white/40">Faster outreach</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">5x</p>
            <p className="text-sm text-white/40">More connections</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">3x</p>
            <p className="text-sm text-white/40">Pipeline growth</p>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-[hsl(220,15%,7%)]">
        <div className="w-full max-w-md space-y-8">
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
            <h2 className="text-3xl font-bold text-white">Welcome back</h2>
            <p className="text-white/50">Sign in to your account to continue</p>
          </div>

          {/* Google OAuth */}
          <Button
            variant="outline"
            type="button"
            className="w-full h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white transition-all"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
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

          {/* Email Form */}
          <form onSubmit={handleEmailLogin} className="space-y-5">
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm text-white/70">Password</Label>
                <Link
                  href="/reset-password"
                  className="text-sm text-[hsl(100,78%,44%)] hover:text-[hsl(100,78%,54%)] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'Signing in...' : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-white/40">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[hsl(100,78%,44%)] hover:text-[hsl(100,78%,54%)] font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
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
      <LoginContent />
    </Suspense>
  )
}
