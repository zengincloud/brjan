import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { listUpcomingEvents, extractMeetingUrl } from "@/lib/gcal/client"
import { createBot } from "@/lib/recall/client"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// POST /api/meetings/sync — pro_max only
// Fetches the next 7 days of GCal events, dispatches a Recall bot for any
// event with a video link that hasn't been dispatched yet.
export const POST = withAuth(async (_request: NextRequest, userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true, role: true } })
  if (user?.tier !== "pro_max" && user?.role !== "super_admin") {
    return NextResponse.json({ skipped: true, reason: "upgrade_required" })
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

  for (const event of events) {
    const videoUrl = extractMeetingUrl(event)
    if (!videoUrl) continue

    const startTime = new Date(event.start)
    // Skip events already past, or starting in less than 11 minutes (Recall requires 10+ min lead time)
    if (startTime.getTime() < Date.now() + 11 * 60 * 1000) continue

    // Check if already dispatched for this gcal event
    const existing = await prisma.meeting.findFirst({
      where: { gcalEventId: event.id, userId },
      select: { id: true, recallBotId: true },
    })

    if (existing?.recallBotId) {
      skipped.push(event.id)
      continue
    }

    try {
      const bot = await createBot(videoUrl, "Boiler Room Notes", startTime.toISOString())

      const attendees = event.attendees.map((a) => ({
        name: a.name || null,
        email: a.email,
      }))

      if (existing) {
        await prisma.meeting.update({
          where: { id: existing.id },
          data: { recallBotId: bot.id },
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
          },
        })
      }

      dispatched.push(event.id)
    } catch (err) {
      console.error(`Failed to dispatch bot for event ${event.id}:`, err)
    }
  }

  return NextResponse.json({ dispatched, skipped })
})
