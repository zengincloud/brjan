import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { syncMeetingsForUser } from "@/lib/meetings/sync-for-user"

export const dynamic = "force-dynamic"

// POST /api/webhooks/gcal
// Receives Google Calendar push notifications when events change.
// The channel token is set to the userId at watch registration time.
export async function POST(request: NextRequest) {
  const resourceState = request.headers.get("x-goog-resource-state")
  const userId = request.headers.get("x-goog-channel-token")

  // Initial handshake — just acknowledge
  if (resourceState === "sync") {
    return NextResponse.json({ received: true })
  }

  if (!userId) {
    return NextResponse.json({ error: "No channel token" }, { status: 400 })
  }

  // Verify the user exists and has GCal connected
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, tier: true, role: true },
  })

  if (!user) {
    return NextResponse.json({ error: "Unknown user" }, { status: 400 })
  }

  if (user.tier !== "pro_max" && user.role !== "super_admin") {
    return NextResponse.json({ received: true })
  }

  // Run sync in the background — don't block the response
  syncMeetingsForUser(userId).catch((err) =>
    console.error(`GCal webhook: sync failed for user ${userId}:`, err)
  )

  return NextResponse.json({ received: true })
}
