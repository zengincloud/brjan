import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

const RECALL_API_KEY = process.env.RECALL_API_KEY
const RECALL_BASE_URL = process.env.RECALL_BASE_URL ?? "https://us-west-2.recall.ai/api/v1"

// GET /api/recall/calendar-status
// Returns whether the current user has a connected Google Calendar on Recall.
export const GET = withAuth(async (_req: NextRequest, userId: string) => {
  // Generate a token for this user to query their calendar status
  const authRes = await fetch(`${RECALL_BASE_URL}/calendar/authenticate/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${RECALL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId }),
  })

  if (!authRes.ok) {
    return NextResponse.json({ connected: false })
  }

  const authData = await authRes.json()
  console.log("[calendar-status] auth response:", JSON.stringify(authData))
  const calendarToken = authData.token ?? authData.recall_calendar_auth_token ?? authData

  if (!calendarToken || typeof calendarToken !== "string") {
    return NextResponse.json({ connected: false })
  }

  // Check if user has any connected calendars
  const calRes = await fetch(`${RECALL_BASE_URL}/calendar/user/`, {
    headers: {
      Authorization: `Token ${RECALL_API_KEY}`,
      "x-recallcalendarauthtoken": calendarToken,
    },
  })

  if (!calRes.ok) {
    return NextResponse.json({ connected: false })
  }

  const calData = await calRes.json()
  console.log("[calendar-status] Recall response:", JSON.stringify(calData))
  const connected = !!(calData.google_oauth_token || calData.microsoft_oauth_token || calData.connected || calData.google_calendar || calData.calendars?.length)
  return NextResponse.json({ connected, data: calData })
})
