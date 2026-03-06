import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { formatDistanceToNow } from "date-fns"

export const dynamic = 'force-dynamic'

/**
 * GET /api/dialer/enrich?prospectId=...&email=...&company=...
 *
 * Lazy-loads enrichment data for a single prospect:
 * - Prior call history
 * - Email correspondence
 * - Account info
 */
export const GET = withAuth(async (
  request: NextRequest,
  userId: string
) => {
  try {
    const { searchParams } = new URL(request.url)
    const prospectId = searchParams.get("prospectId")
    const email = searchParams.get("email")
    const company = searchParams.get("company")

    const [calls, emails, account, prospect] = await Promise.all([
      prospectId
        ? prisma.call.findMany({
            where: { prospectId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              outcome: true,
              notes: true,
              duration: true,
              createdAt: true,
              user: { select: { firstName: true, lastName: true } },
            },
          })
        : Promise.resolve([]),

      email
        ? prisma.email.findMany({
            where: { userId, to: email },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              to: true,
              subject: true,
              status: true,
              sentAt: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),

      company
        ? prisma.account.findFirst({
            where: {
              userId,
              name: { equals: company, mode: 'insensitive' },
            },
            select: {
              id: true,
              name: true,
              industry: true,
              website: true,
              employees: true,
              location: true,
              linkedin: true,
              insights: true,
              pov: true,
            },
          })
        : Promise.resolve(null),

      prospectId
        ? prisma.prospect.findUnique({
            where: { id: prospectId },
            select: { notes: true },
          })
        : Promise.resolve(null),
    ])

    const priorCalls = calls.map((c: any) => ({
      date: safeTimeAgo(c.createdAt),
      outcome: c.outcome || 'unknown',
      notes: c.notes || '',
      calledBy: c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() : undefined,
    }))

    const correspondenceHistory: any[] = []
    for (const c of calls.slice(0, 5)) {
      correspondenceHistory.push({
        date: safeTimeAgo(c.createdAt),
        type: 'call',
        from: 'You',
        summary: `Call - ${c.outcome || 'unknown'}${c.notes ? ': ' + c.notes.substring(0, 80) : ''}`,
      })
    }
    for (const e of emails.slice(0, 5)) {
      correspondenceHistory.push({
        date: safeTimeAgo(e.sentAt || e.createdAt),
        type: 'email',
        from: 'You',
        summary: `Email: ${e.subject || '(no subject)'} - ${e.status}`,
      })
    }

    const lastEmailSent = emails.length > 0
      ? safeTimeAgo(emails[0].sentAt || emails[0].createdAt)
      : null

    const accountInfo = account
      ? {
          id: account.id,
          industry: account.industry,
          website: account.website,
          employees: account.employees,
          location: account.location,
          linkedin: account.linkedin,
          insights: account.insights,
          pov: account.pov,
        }
      : null

    return NextResponse.json({
      priorCalls,
      correspondenceHistory: correspondenceHistory.slice(0, 8),
      lastEmailSent,
      accountInfo,
      prospectNotes: prospect?.notes || null,
    })
  } catch (error: any) {
    console.error("Error enriching prospect:", error)
    return NextResponse.json(
      { error: "Failed to enrich prospect" },
      { status: 500 }
    )
  }
})

function safeTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return 'Unknown'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return 'Unknown'
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}
