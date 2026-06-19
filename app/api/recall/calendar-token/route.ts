import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

const RECALL_API_KEY = process.env.RECALL_API_KEY
const RECALL_BASE_URL = process.env.RECALL_BASE_URL ?? "https://us-west-2.recall.ai/api/v1"

// POST /api/recall/calendar-token
// Generates a short-lived Recall calendar auth token for the current user.
// Token is scoped to this user_id so Recall won't create duplicate calendar accounts.
export const POST = withAuth(async (_req: NextRequest, userId: string) => {
  const res = await fetch(`${RECALL_BASE_URL}/calendar/authenticate/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${RECALL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error("Recall calendar authenticate failed:", text)
    return NextResponse.json({ error: "Failed to generate calendar token" }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json({ token: data.token ?? data.recall_calendar_auth_token ?? data })
})
