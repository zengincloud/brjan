import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * Wrapper for API routes that require authentication.
 * Automatically injects userId into the handler.
 *
 * Usage:
 * export const GET = withAuth(async (request, userId) => {
 *   // Your authenticated API logic here
 *   return NextResponse.json({ data: 'success' })
 * })
 */
export function withAuth(
  handler: (request: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const supabase = await createClient()
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser()

      if (!supabaseUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Get or create user in our database
      let user = await prisma.user.findUnique({
        where: { supabaseId: supabaseUser.id },
      })

      if (!user) {
        // Create user if doesn't exist (shouldn't happen in normal flow)
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

      return await handler(request, user.id)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}
