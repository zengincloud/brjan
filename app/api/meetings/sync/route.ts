import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { listUpcomingEvents, extractMeetingUrl } from "@/lib/gcal/client"
import { createBot, deleteBot } from "@/lib/recall/client"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// POST /api/meetings/sync — pro_max only
// Fetches the next 7 days of GCal events, dispatches a Recall bot for any
// event with a video link that hasn't been dispatched yet.
export const POST = withAuth(async (_request: NextRequest, userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true, role: true, notetakerSettings: true },
  })
  if (user?.tier !== "pro_max" && user?.role !== "super_admin") {
    return NextResponse.json({ skipped: true, reason: "upgrade_required" })
  }

  const ns = (user?.notetakerSettings ?? {}) as Record<string, any>
  const autoJoin = ns.autoJoin !== false // default true
  const botName: string = ns.botName || "Boiler Room Notes"

  if (!autoJoin) {
    return NextResponse.json({ skipped: true, reason: "auto_join_disabled" })
  }

  let events
  try {
    events = await listUpcomingEvents(userId, 50, 7)
  } catch (error: any) {
    if (error.message === "GCal not connected or token expired") {
      return NextResponse.json({ skipped: true, reason: "gcal_not_connected" })
    }
    throw error
  }

  const dispatched: string[] = []
  const skipped: string[] = []
  const failed: { id: string; title: string; reason: string }[] = []

  for (const event of events) {
    const videoUrl = extractMeetingUrl(event)
    if (!videoUrl) continue

    const startTime = new Date(event.start)

    // Check if already dispatched for this gcal event
    const existing = await prisma.meeting.findFirst({
      where: { gcalEventId: event.id, userId },
      select: { id: true, recallBotId: true, startedAt: true },
    })

    if (existing?.recallBotId) {
      // Check if the meeting was rescheduled
      const existingStart = existing.startedAt ? new Date(existing.startedAt).getTime() : null
      const newStart = startTime.getTime()
      const rescheduled = existingStart && Math.abs(existingStart - newStart) > 60_000 // >1 min diff

      if (!rescheduled) {
        skipped.push(event.id)
        continue
      }

      // Delete the old bot and fall through to create a new one
      try {
        await deleteBot(existing.recallBotId)
      } catch (err) {
        console.warn(`Could not delete old bot ${existing.recallBotId}:`, err)
      }
      await prisma.meeting.update({
        where: { id: existing.id },
        data: { recallBotId: null, startedAt: startTime },
      })
    }

    // Only skip the time check for new bot creation — already-dispatched meetings handled above
    // Recall requires 10+ min lead time to schedule a bot
    if (startTime.getTime() < Date.now() + 11 * 60 * 1000) continue

    try {
      const bot = await createBot(videoUrl, botName, startTime.toISOString())

      const attendees = event.attendees.map((a) => ({
        name: a.name || null,
        email: a.email,
      }))

      // Try to link to a known prospect/account at scheduling time
      const attendeeEmails = event.attendees.map((a) => a.email).filter(Boolean)
      let linkedProspectId: string | undefined
      let linkedAccountId: string | undefined
      if (attendeeEmails.length > 0) {
        const matched = await prisma.prospect.findFirst({
          where: { email: { in: attendeeEmails }, userId },
          select: { id: true, accountId: true },
        })
        if (matched) {
          linkedProspectId = matched.id
          linkedAccountId = matched.accountId || undefined
        }
      }

      if (existing) {
        await prisma.meeting.update({
          where: { id: existing.id },
          data: {
            recallBotId: bot.id,
            ...(linkedProspectId ? { prospectId: linkedProspectId } : {}),
            ...(linkedAccountId ? { accountId: linkedAccountId } : {}),
          },
        })
      } else {
        await prisma.meeting.create({
          data: {
            userId,
            gcalEventId: event.id,
            title: event.summary,
            meetingUrl: videoUrl,
            startedAt: startTime,
            attendees,
            recallBotId: bot.id,
            ...(linkedProspectId ? { prospectId: linkedProspectId } : {}),
            ...(linkedAccountId ? { accountId: linkedAccountId } : {}),
          },
        })
      }

      dispatched.push(event.id)
    } catch (err: any) {
      const reason = err?.message || "Unknown error"
      console.error(`Failed to dispatch bot for event ${event.id}:`, reason)
      failed.push({ id: event.id, title: event.summary, reason })
    }
  }

  return NextResponse.json({ dispatched, skipped, failed })
})
