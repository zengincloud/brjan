import { NextRequest, NextResponse } from 'next/server'
import { withAuth, resolveRealUser } from '@/lib/auth/api-middleware'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { TIER_CONFIG, type TierKey } from '@/lib/tier-config'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/user - Get current authenticated user
 * If impersonating, returns the impersonated user + isImpersonating flag
 */
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        tier: true,
        organizationId: true,
        timezone: true,
        workStartTime: true,
        workEndTime: true,
        workDays: true,
        createdAt: true,
        creditsUsed: true,
        creditsResetAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch impersonation status and Supabase metadata in parallel (no extra DB call needed)
    const [impersonationResult, supabaseUser] = await Promise.all([
      (async () => {
        const realUser = await resolveRealUser()
        if (realUser && realUser.role === 'super_admin' && realUser.id !== userId) {
          const cookieStore = await cookies()
          const impersonatingId = cookieStore.get('impersonating_user_id')?.value
          return !!impersonatingId && impersonatingId === userId
        }
        return false
      })(),
      (async () => {
        const supabase = await createClient()
        const { data } = await supabase.auth.getUser()
        return data.user
      })(),
    ])

    // Compute credit status from already-fetched user (no extra DB roundtrip)
    let creditStatus: ReturnType<typeof computeCreditStatus> | null = null
    try {
      creditStatus = computeCreditStatus(user)
      // Lazy reset: if paid tier and past reset date, reset in background (don't await)
      if (user.tier !== 'trial' && user.role !== 'super_admin' && user.creditsResetAt && new Date() > user.creditsResetAt) {
        const nextReset = new Date()
        nextReset.setDate(nextReset.getDate() + 30)
        prisma.user.update({ where: { id: userId }, data: { creditsUsed: 0, creditsResetAt: nextReset } }).catch(() => {})
        creditStatus.creditsUsed = 0
        creditStatus.creditsRemaining = creditStatus.creditsTotal
      }
    } catch {
      creditStatus = null
    }

    function computeCreditStatus(u: typeof user) {
      if (!u) return null
      if (u.role === 'super_admin') {
        return { tier: 'super_admin', label: 'Super Admin', creditsUsed: 0, creditsTotal: -1, creditsRemaining: -1, resetsAt: null }
      }
      const tier = u.tier as TierKey
      const total = TIER_CONFIG[tier].credits
      return {
        tier: u.tier,
        label: TIER_CONFIG[tier].label,
        creditsUsed: u.creditsUsed,
        creditsTotal: total,
        creditsRemaining: total - u.creditsUsed,
        resetsAt: u.creditsResetAt,
      }
    }

    const metadata = supabaseUser?.user_metadata ?? {}
    const { creditsUsed: _cu, creditsResetAt: _cr, ...userFields } = user
    const userWithMeta = {
      ...userFields,
      jobRole: metadata.jobRole ?? null,
      usageType: metadata.usageType ?? null,
      primaryGoal: metadata.primaryGoal ?? null,
      checklistDismissed: metadata.checklist_dismissed ?? false,
    }

    return NextResponse.json({ user: userWithMeta, isImpersonating: impersonationResult, creditStatus })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
})

/**
 * PATCH /api/auth/user - Update current user's profile
 */
export const PATCH = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { firstName, lastName, timezone, workStartTime, workEndTime, workDays } = body

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(timezone !== undefined && { timezone }),
        ...(workStartTime !== undefined && { workStartTime }),
        ...(workEndTime !== undefined && { workEndTime }),
        ...(workDays !== undefined && { workDays }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        tier: true,
        organizationId: true,
        timezone: true,
        workStartTime: true,
        workEndTime: true,
        workDays: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
})
