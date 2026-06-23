import { listUpcomingEvents, extractMeetingUrl, registerCalendarWatch, stopCalendarWatch } from "@/lib/gcal/client"
import { createBot, deleteBot } from "@/lib/recall/client"
import { prisma } from "@/lib/prisma"

export interface SyncResult {
  dispatched: string[]
  skipped: string[]
  failed: { id: string; title: string; reason: string }[]
}

export async function syncMeetingsForUser(userId: string): Promise<SyncResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true, role: true, notetakerSettings: true },
  })

  const ns = (user?.notetakerSettings ?? {}) as Record<string, any>
  const autoJoin = ns.autoJoin !== false
  const botName: string = ns.botName || "Boiler Room Notes"

  // Ensure GCal watch channel is registered and not expiring within 24h
  const channelExpiry: number = ns.gcalChannelExpiry ?? 0
  if (Date.now() > channelExpiry - 24 * 60 * 60 * 1000) {
    try {
      if (ns.gcalChannelId && ns.gcalResourceId) {
        await stopCalendarWatch(userId, ns.gcalChannelId, ns.gcalResourceId).catch(() => {})
      }
      const watch = await registerCalendarWatch(userId)
      await prisma.user.update({
        where: { id: userId },
        data: {
          notetakerSettings: {
            ...ns,
            gcalChannelId: watch.channelId,
            gcalResourceId: watch.resourceId,
            gcalChannelExpiry: watch.expiry,
          },
        },
      })
    } catch (err) {
      console.warn("Failed to register GCal watch channel:", err)
    }
  }

  if (!autoJoin) return { dispatched: [], skipped: [], failed: [] }

  let events
  try {
    events = await listUpcomingEvents(userId, 50, 7)
  } catch (error: any) {
    if (error.message === "GCal not connected or token expired") {
      return { dispatched: [], skipped: [], failed: [] }
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

    const existing = await prisma.meeting.findFirst({
      where: { gcalEventId: event.id, userId },
      select: { id: true, recallBotId: true, startedAt: true },
    })

    if (existing?.recallBotId) {
      const existingStart = existing.startedAt ? new Date(existing.startedAt).getTime() : null
      const newStart = startTime.getTime()
      const rescheduled = existingStart && Math.abs(existingStart - newStart) > 60_000

      if (!rescheduled) {
        skipped.push(event.id)
        continue
      }

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

    if (startTime.getTime() < Date.now() + 11 * 60 * 1000) continue

    try {
      const bot = await createBot(videoUrl, botName, startTime.toISOString())

      const attendees = event.attendees.map((a) => ({ name: a.name || null, email: a.email }))

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

  return { dispatched, skipped, failed }
}
