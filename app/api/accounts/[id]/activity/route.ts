import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET /api/accounts/[id]/activity - Get recent activity for an account
export const GET = withAuth(async (request: NextRequest, userId: string, context?: { params: { id: string } }) => {
  try {
    if (!context?.params?.id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
    }

    const accountId = context.params.id

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Get prospect IDs linked to this account (for querying by prospectId too)
    const prospects = await prisma.prospect.findMany({
      where: { userId, accountId },
      select: { id: true, name: true },
    })
    const prospectIds = prospects.map((p) => p.id)
    const prospectNameMap = new Map(prospects.map((p) => [p.id, p.name]))

    // Fetch calls linked to this account OR its prospects
    const calls = await prisma.call.findMany({
      where: {
        userId,
        OR: [
          { accountId },
          ...(prospectIds.length > 0 ? [{ prospectId: { in: prospectIds } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        to: true,
        outcome: true,
        duration: true,
        notes: true,
        recordingUrl: true,
        recordingDuration: true,
        status: true,
        startedAt: true,
        createdAt: true,
        prospectId: true,
        prospect: {
          select: { name: true },
        },
      },
    })

    // Fetch emails linked to this account OR its prospects
    const emails = await prisma.email.findMany({
      where: {
        userId,
        OR: [
          { accountId },
          ...(prospectIds.length > 0 ? [{ prospectId: { in: prospectIds } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        to: true,
        subject: true,
        status: true,
        sentAt: true,
        openedAt: true,
        clickedAt: true,
        createdAt: true,
        prospectId: true,
      },
    })

    // Merge into a unified activity timeline
    type ActivityItem = {
      id: string
      type: "call" | "email"
      contactName: string | null
      detail: string
      time: string
      outcome?: string | null
      duration?: number | null
      recordingUrl?: string | null
      emailStatus?: string | null
      subject?: string | null
    }

    const activity: ActivityItem[] = []

    for (const call of calls) {
      const contactName = call.prospect?.name || (call.prospectId ? prospectNameMap.get(call.prospectId) : null) || null
      const outcomeLabels: Record<string, string> = {
        connected: "Connected",
        connected_intro_booked: "Intro Booked",
        connected_referral: "Referral",
        connected_not_interested: "Not Interested",
        connected_info_gathered: "Info Gathered",
        callback: "Call Back Later",
        voicemail: "Voicemail",
        no_answer: "No Answer",
        busy: "Busy",
        failed: "Failed",
        gatekeeper: "Gatekeeper",
      }
      const outcomeText = call.outcome ? (outcomeLabels[call.outcome] || call.outcome.replace(/_/g, " ")) : call.status

      activity.push({
        id: call.id,
        type: "call",
        contactName,
        detail: `Call — ${outcomeText}`,
        time: (call.startedAt || call.createdAt).toISOString(),
        outcome: call.outcome,
        duration: call.recordingDuration || call.duration,
        recordingUrl: call.recordingUrl,
      })
    }

    for (const email of emails) {
      const contactName = email.prospectId ? prospectNameMap.get(email.prospectId) || null : null

      let detail = `Email to ${email.to}`
      if (email.openedAt) detail = `Email opened — "${email.subject}"`
      else if (email.sentAt) detail = `Email sent — "${email.subject}"`
      else if (email.status === "draft") detail = `Email draft — "${email.subject}"`

      activity.push({
        id: email.id,
        type: "email",
        contactName,
        detail,
        time: (email.sentAt || email.createdAt).toISOString(),
        emailStatus: email.status,
        subject: email.subject,
      })
    }

    // Sort by time descending
    activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    return NextResponse.json({ activity: activity.slice(0, 50) })
  } catch (error) {
    console.error("Error fetching account activity:", error)
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 })
  }
})
