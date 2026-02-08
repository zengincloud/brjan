import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import type { User } from '@prisma/client'

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

/**
 * Check if a user's email is in the super admin list.
 */
export function isSuperAdminEmail(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * Check if a user has super_admin role.
 */
export function isSuperAdmin(user: User): boolean {
  return user.role === 'super_admin'
}

/**
 * Get the current authenticated user from Supabase and the database.
 * Returns null if not authenticated.
 *
 * On first login: auto-creates user + org.
 * Auto-promotes super admin emails.
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()

  if (!supabaseUser) {
    return null
  }

  // Get or create user in our database
  let user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  })

  if (!user) {
    const email = supabaseUser.email!
    const firstName = supabaseUser.user_metadata?.firstName || null
    const isSuperEmail = isSuperAdminEmail(email)

    // Auto-create an organization for every new user
    const org = await prisma.organization.create({
      data: {
        name: firstName ? `${firstName}'s Team` : 'My Team',
      },
    })

    user = await prisma.user.create({
      data: {
        supabaseId: supabaseUser.id,
        email,
        firstName,
        lastName: supabaseUser.user_metadata?.lastName,
        avatarUrl: supabaseUser.user_metadata?.avatar_url,
        organizationId: org.id,
        role: isSuperEmail ? 'super_admin' : 'owner',
      },
    })
  } else {
    // For existing users: promote to super_admin if their email is in the list
    const shouldBeSuperAdmin = isSuperAdminEmail(user.email)
    if (shouldBeSuperAdmin && user.role !== 'super_admin') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'super_admin' },
      })
    }
  }

  return user
}

/**
 * Get the current user ID. Throws error if not authenticated.
 * Use this for server actions and API routes that require authentication.
 */
export async function getUserId(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user.id
}

/**
 * Require authentication for a page. Redirects to login if not authenticated.
 * Use this in Server Components that require authentication.
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}
