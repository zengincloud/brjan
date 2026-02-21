import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-middleware'
import { prisma } from '@/lib/prisma'
import { normalizeCompanyName } from '@/lib/account-linking'

export const dynamic = 'force-dynamic'

// GET /api/accounts/[id]/contacts - Get prospects linked to this account
export const GET = withAuth(async (request: NextRequest, userId: string, context?: { params: { id: string } }) => {
  try {
    if (!context?.params?.id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    const accountId = context.params.id

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Primary: find prospects linked via accountId FK
    const linkedProspects = await prisma.prospect.findMany({
      where: {
        userId,
        accountId: accountId,
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

    // Also find prospects matched by company name but not yet linked
    // This catches prospects that existed before the accountId FK was added
    const normalizedAccountName = normalizeCompanyName(account.name)
    const unlinkedProspects = await prisma.prospect.findMany({
      where: {
        userId,
        accountId: null,
        company: { not: null },
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

    // Filter unlinked prospects by fuzzy company name match
    const fuzzyMatched = unlinkedProspects.filter((p) => {
      if (!p.company) return false
      // Exact case-insensitive
      if (p.company.toLowerCase() === account.name.toLowerCase()) return true
      // Normalized match
      return normalizeCompanyName(p.company) === normalizedAccountName
    })

    // Auto-link the fuzzy-matched prospects (fire and forget)
    if (fuzzyMatched.length > 0) {
      const idsToLink = fuzzyMatched.map((p) => p.id)
      prisma.prospect.updateMany({
        where: { id: { in: idsToLink } },
        data: { accountId },
      }).catch((err) => console.error('Error auto-linking prospects:', err))
    }

    // Merge and deduplicate
    const linkedIds = new Set(linkedProspects.map((p) => p.id))
    const allContacts = [
      ...linkedProspects,
      ...fuzzyMatched.filter((p) => !linkedIds.has(p.id)),
    ]

    return NextResponse.json({ contacts: allContacts })
  } catch (error) {
    console.error('Error fetching account contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
})
