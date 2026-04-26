import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { createEvent } from "@/lib/gcal/client"

export const dynamic = "force-dynamic"

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { summary, description, startTime, endTime, attendeeEmails } = body

    if (!summary || !startTime || !endTime) {
      return NextResponse.json({ error: "summary, startTime, and endTime are required" }, { status: 400 })
    }

    const event = await createEvent(userId, { summary, description, startTime, endTime, attendeeEmails })
    return NextResponse.json({ event })
  } catch (error: any) {
    if (error.message === "GCal not connected or token expired") {
      return NextResponse.json({ error: "not_connected" }, { status: 403 })
    }
    console.error("GCal create event error:", error)
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
  }
})
