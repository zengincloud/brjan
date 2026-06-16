import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { listUpcomingEvents, listPastEvents, listEventsInRange } from "@/lib/gcal/client"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  const type = request.nextUrl.searchParams.get("type") || "upcoming"
  const timeMin = request.nextUrl.searchParams.get("timeMin")
  const timeMax = request.nextUrl.searchParams.get("timeMax")

  try {
    let events
    if (timeMin && timeMax) {
      events = await listEventsInRange(userId, timeMin, timeMax)
    } else if (type === "past") {
      events = await listPastEvents(userId)
    } else {
      events = await listUpcomingEvents(userId)
    }

    return NextResponse.json({ events })
  } catch (error: any) {
    if (error.message === "GCal not connected or token expired") {
      return NextResponse.json({ error: "not_connected" }, { status: 403 })
    }
    console.error("GCal events error:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
})
