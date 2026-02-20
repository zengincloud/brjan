import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-middleware'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { firstName, lastName, organizationName } = body

    if (!firstName || !firstName.trim()) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 })
    }

    // Update user in database
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName.trim(),
        ...(lastName && { lastName: lastName.trim() }),
      },
    })

    // Update organization name if provided
    if (organizationName?.trim() && user.organizationId) {
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: { name: organizationName.trim() },
      })
    }

    // Update Supabase user metadata so middleware knows onboarding is complete
    const supabase = await createClient()
    await supabase.auth.updateUser({
      data: {
        firstName: firstName.trim(),
        lastName: lastName?.trim() || undefined,
        organizationName: organizationName?.trim() || undefined,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving onboarding:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
})
