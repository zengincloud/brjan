import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { User, UserRole } from '@prisma/client'
import { isSuperAdminEmail } from './helpers'

/**
 * Internal helper to resolve the authenticated user from Supabase + Prisma.
 */
async function resolveUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()

  if (!supabaseUser) return null

  let user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        supabaseId: supabaseUser.id,
        email: supabaseUser.email!,
        firstName: supabaseUser.user_metadata?.firstName,
        lastName: supabaseUser.user_metadata?.lastName,
        avatarUrl: supabaseUser.user_metadata?.avatar_url,
      },
    })
  }

  // Auto-promote super admin emails
  if (isSuperAdminEmail(user.email) && user.role !== 'super_admin') {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'super_admin' },
    })
  }

  return user
}

/**
 * Wrapper for API routes that require authentication.
 * Injects userId into the handler.
 */
export function withAuth<T = any>(
  handler: (request: NextRequest, userId: string, context?: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: T) => {
    try {
      const user = await resolveUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return await handler(request, user.id, context)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Wrapper for API routes that require authentication.
 * Injects the full User object into the handler.
 */
export function withAuthUser<T = any>(
  handler: (request: NextRequest, user: User, context?: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: T) => {
    try {
      const user = await resolveUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return await handler(request, user, context)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Wrapper for API routes that require super_admin role.
 * Injects the full User object into the handler.
 */
export function withSuperAdmin<T = any>(
  handler: (request: NextRequest, user: User, context?: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: T) => {
    try {
      const user = await resolveUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (user.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return await handler(request, user, context)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Wrapper for API routes that require specific roles.
 * Injects the full User object into the handler.
 *
 * Usage:
 * export const GET = withRole(['owner', 'manager'], async (request, user) => { ... })
 */
export function withRole<T = any>(
  roles: UserRole[],
  handler: (request: NextRequest, user: User, context?: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: T) => {
    try {
      const user = await resolveUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      // super_admin can do anything
      if (user.role !== 'super_admin' && !roles.includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return await handler(request, user, context)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}
