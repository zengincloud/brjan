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
  maxResults = 20
): Promise<CalendarEvent[]> {
  const calendar = await getAuthedClient(userId)

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults,
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
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.startTime },
      end: { dateTime: event.endTime },
      attendees: (event.attendeeEmails || []).map((email) => ({ email })),
    },
  })

  return mapEvent(res.data)
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
