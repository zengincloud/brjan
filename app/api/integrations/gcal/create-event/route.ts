import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { createEvent } from "@/lib/gcal/client"
import { createBot } from "@/lib/recall/client"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Regex that matches Google Meet, Zoom, and Teams video URLs
const VIDEO_URL_RE =
  /https?:\/\/(meet\.google\.com|[\w-]+\.zoom\.us\/j|teams\.microsoft\.com\/[^\s]+)/i

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { summary, description, startTime, endTime, attendeeEmails, prospectId, accountId } = body

    if (!summary || !startTime || !endTime) {
      return NextResponse.json({ error: "summary, startTime, and endTime are required" }, { status: 400 })
    }

    const event = await createEvent(userId, { summary, description, startTime, endTime, attendeeEmails })

    // Detect video URL — prefer Google's hangoutLink, fall back to location/description
    const videoUrl =
      event.hangoutLink ||
      (event.location && VIDEO_URL_RE.test(event.location) ? event.location : undefined) ||
      (description && VIDEO_URL_RE.exec(description)?.[0])

    if (videoUrl && process.env.RECALL_API_KEY) {
      dispatchBot({
        userId,
        meetingUrl: videoUrl,
        title: summary,
        startTime,
        attendeeEmails: attendeeEmails || [],
        prospectId,
        accountId,
      }).catch((err) => console.error("Recall bot dispatch error:", err))
    }

    return NextResponse.json({ event })
  } catch (error: any) {
    if (error.message === "GCal not connected or token expired") {
      return NextResponse.json({ error: "not_connected" }, { status: 403 })
    }
    console.error("GCal create event error:", error)
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
  }
})

async function dispatchBot({
  userId,
  meetingUrl,
  title,
  startTime,
  attendeeEmails,
  prospectId,
  accountId,
}: {
  userId: string
  meetingUrl: string
  title: string
  startTime: string
  attendeeEmails: string[]
  prospectId?: string
  accountId?: string
}) {
  const bot = await createBot(meetingUrl, "Meeting Notes", startTime)

  await prisma.meeting.create({
    data: {
      userId,
      title,
      meetingUrl,
      startedAt: new Date(startTime),
      recallBotId: bot.id,
      attendees: attendeeEmails.map((email) => ({ email })),
      prospectId: prospectId || null,
      accountId: accountId || null,
    },
  })
}
