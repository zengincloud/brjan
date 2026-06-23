import { google } from "googleapis"
import { getOAuth2Client, refreshAccessToken } from "./oauth"
import { decrypt } from "@/lib/encryption"
import { prisma } from "@/lib/prisma"

async function getAuthedClient(userId: string) {
  const accessToken = await refreshAccessToken(userId)
  if (!accessToken) throw new Error("GCal not connected or token expired")

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const integration = await prisma.gcalIntegration.findUnique({ where: { userId } })
  if (integration?.refreshToken) {
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: decrypt(integration.refreshToken),
    })
  }

  return google.calendar({ version: "v3", auth: oauth2Client })
}

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: string
  end: string
  attendees: { email: string; name?: string; responseStatus?: string }[]
  htmlLink: string
  status: string
  hangoutLink?: string // Google Meet URL if present
}

export async function listUpcomingEvents(
  userId: string,
  maxResults = 20,
  daysAhead = 0
): Promise<CalendarEvent[]> {
  const calendar = await getAuthedClient(userId)

  const timeMax = daysAhead > 0
    ? new Date(Date.now() + daysAhead * 86_400_000).toISOString()
    : undefined

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    ...(timeMax ? { timeMax } : {}),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  })

  return (res.data.items || []).map(mapEvent)
}

export async function listEventsInRange(
  userId: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const calendar = await getAuthedClient(userId)

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    maxResults: 100,
    singleEvents: true,
    orderBy: "startTime",
  })

  return (res.data.items || []).map(mapEvent)
}

export async function listPastEvents(
  userId: string,
  maxResults = 20
): Promise<CalendarEvent[]> {
  const calendar = await getAuthedClient(userId)

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMax: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  })

  return (res.data.items || []).reverse().map(mapEvent)
}

export async function createEvent(
  userId: string,
  event: {
    summary: string
    description?: string
    startTime: string
    endTime: string
    attendeeEmails?: string[]
  }
): Promise<CalendarEvent> {
  const calendar = await getAuthedClient(userId)

  const res = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    conferenceDataVersion: 1,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.startTime },
      end: { dateTime: event.endTime },
      attendees: (event.attendeeEmails || []).map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `br-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  })

  return mapEvent(res.data)
}

const ZOOM_RE = /https:\/\/[a-z0-9-]+\.zoom\.us\/j\/[^\s"<>]+/i
const TEAMS_RE = /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s"<>]+/i

export function extractMeetingUrl(event: CalendarEvent): string | null {
  if (event.hangoutLink) return event.hangoutLink
  const sources = [event.location || "", event.description || ""]
  for (const src of sources) {
    const zoom = src.match(ZOOM_RE)
    if (zoom) return zoom[0]
    const teams = src.match(TEAMS_RE)
    if (teams) return teams[0]
  }
  return null
}

export async function registerCalendarWatch(userId: string): Promise<{ channelId: string; resourceId: string; expiry: number }> {
  const calendar = await getAuthedClient(userId)
  const channelId = `gcal-watch-${userId}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.boilerroom.ai"

  const res = await calendar.events.watch({
    calendarId: "primary",
    requestBody: {
      id: channelId,
      type: "web_hook",
      address: `${appUrl}/api/webhooks/gcal`,
      token: userId,
    },
  })

  return {
    channelId: res.data.id!,
    resourceId: res.data.resourceId!,
    expiry: parseInt(res.data.expiration ?? "0"),
  }
}

export async function stopCalendarWatch(userId: string, channelId: string, resourceId: string): Promise<void> {
  const calendar = await getAuthedClient(userId)
  await calendar.channels.stop({ requestBody: { id: channelId, resourceId } })
}

function mapEvent(item: any): CalendarEvent {
  return {
    id: item.id || "",
    summary: item.summary || "(No title)",
    description: item.description,
    location: item.location,
    start: item.start?.dateTime || item.start?.date || "",
    end: item.end?.dateTime || item.end?.date || "",
    attendees: (item.attendees || []).map((a: any) => ({
      email: a.email,
      name: a.displayName,
      responseStatus: a.responseStatus,
    })),
    htmlLink: item.htmlLink || "",
    status: item.status || "confirmed",
    hangoutLink: item.hangoutLink || undefined,
  }
}
