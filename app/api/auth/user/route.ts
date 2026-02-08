import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-middleware'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

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
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if we're impersonating
    const cookieStore = await cookies()
    const impersonatingId = cookieStore.get('impersonating_user_id')?.value
    const isImpersonating = !!impersonatingId && impersonatingId === userId

    return NextResponse.json({ user, isImpersonating })
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
    const { firstName, lastName } = body

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
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
