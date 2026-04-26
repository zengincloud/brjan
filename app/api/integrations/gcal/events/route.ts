import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { listUpcomingEvents, listPastEvents } from "@/lib/gcal/client"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  const type = request.nextUrl.searchParams.get("type") || "upcoming"

  try {
    const events =
      type === "past"
        ? await listPastEvents(userId)
        : await listUpcomingEvents(userId)

    return NextResponse.json({ events })
  } catch (error: any) {
    if (error.message === "GCal not connected or token expired") {
      return NextResponse.json({ error: "not_connected" }, { status: 403 })
    }
    console.error("GCal events error:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
})
