import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export interface ChecklistItem {
  id: string
  label: string
  complete: boolean
  href: string
  cta: string
}

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const [prospectsCount, callsCount, emailsCount, sequencesCount, meetingsCount] =
      await Promise.all([
        prisma.prospect.count({ where: { userId } }),
        prisma.call.count({ where: { userId } }),
        prisma.email.count({ where: { userId, status: 'sent' } }),
        prisma.sequence.count({ where: { userId } }),
        prisma.call.count({ where: { userId, outcome: 'connected_intro_booked' } }),
      ])

    const milestones: ChecklistItem[] = [
      {
        id: 'first_prospect',
        label: 'Add your first prospect',
        complete: prospectsCount > 0,
        href: '/prospects',
        cta: 'Add Prospect',
      },
      {
        id: 'first_call',
        label: 'Make your first call',
        complete: callsCount > 0,
        href: '/dialer',
        cta: 'Go to Dialer',
      },
      {
        id: 'first_email',
        label: 'Send your first email',
        complete: emailsCount > 0,
        href: '/emailer',
        cta: 'Go to Emailer',
      },
      {
        id: 'first_sequence',
        label: 'Create your first sequence',
        complete: sequencesCount > 0,
        href: '/sequences',
        cta: 'Create Sequence',
      },
      {
        id: 'first_meeting',
        label: 'Book your first meeting',
        complete: meetingsCount > 0,
        href: '/dialer',
        cta: 'Start Dialing',
      },
    ]

    const completedCount = milestones.filter((m) => m.complete).length
    const allComplete = completedCount === milestones.length

    return NextResponse.json({ milestones, completedCount, allComplete })
  } catch (error) {
    console.error('Error fetching onboarding checklist:', error)
    return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 })
  }
})
