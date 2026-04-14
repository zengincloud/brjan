import { NextRequest, NextResponse } from 'next/server'
import { withAuth, resolveRealUser } from '@/lib/auth/api-middleware'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { getCreditStatus } from '@/lib/credits'
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
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch impersonation status, credit status, and Supabase metadata in parallel
    const [impersonationResult, creditStatus, supabaseUser] = await Promise.all([
      (async () => {
        const realUser = await resolveRealUser()
        if (realUser && realUser.role === 'super_admin' && realUser.id !== userId) {
          const cookieStore = await cookies()
          const impersonatingId = cookieStore.get('impersonating_user_id')?.value
          return !!impersonatingId && impersonatingId === userId
        }
        return false
      })(),
      getCreditStatus(userId).catch(() => null),
      (async () => {
        const supabase = await createClient()
        const { data } = await supabase.auth.getUser()
        return data.user
      })(),
    ])

    const metadata = supabaseUser?.user_metadata ?? {}
    const userWithMeta = {
      ...user,
      jobRole: metadata.jobRole ?? null,
      usageType: metadata.usageType ?? null,
      primaryGoal: metadata.primaryGoal ?? null,
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
