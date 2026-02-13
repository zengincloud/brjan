import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/accounts/[id]/contacts - Get prospects linked to this account by company name
export const GET = withAuth(async (request: NextRequest, userId: string, context?: { params: { id: string } }) => {
  try {
    if (!context?.params?.id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    const accountId = context.params.id

    // Get the account to find its name
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Find prospects whose company matches this account's name (case-insensitive)
    const prospects = await prisma.prospect.findMany({
      where: {
        userId,
        company: {
          equals: account.name,
          mode: 'insensitive',
        },
      },
      orderBy: { lastActivity: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        title: true,
        company: true,
        phone: true,
        linkedin: true,
        status: true,
        lastActivity: true,
      },
    })

    return NextResponse.json({ contacts: prospects })
  } catch (error) {
    console.error('Error fetching account contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
})
