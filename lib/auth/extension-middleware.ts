import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import type { User } from '@prisma/client'

/**
 * Create a Supabase admin client for verifying Bearer tokens from the extension.
 * Uses the service role key to call auth.getUser(token) without cookies.
 */
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Resolve a user from a Bearer token (sent by the Chrome extension).
 * Validates the access_token via Supabase, then looks up the Prisma User.
 */
async function resolveExtensionUser(request: NextRequest): Promise<User | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  if (!token) return null

  const supabase = createAdminClient()
  const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token)

  if (error || !supabaseUser) return null

  const user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  })

  return user
}

/**
 * Auth wrapper for extension API routes.
 * Validates Bearer token from Authorization header, injects userId.
 */
export function withExtensionAuth<T = any>(
  handler: (request: NextRequest, userId: string, context?: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: T) => {
    try {
      const user = await resolveExtensionUser(request)
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return await handler(request, user.id, context)
    } catch (error) {
      console.error('Extension auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Auth wrapper for extension API routes.
 * Validates Bearer token, injects full User object.
 */
export function withExtensionAuthUser<T = any>(
  handler: (request: NextRequest, user: User, context?: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: T) => {
    try {
      const user = await resolveExtensionUser(request)
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return await handler(request, user, context)
    } catch (error) {
      console.error('Extension auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}
