import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import { syncMeetingsForUser } from "@/lib/meetings/sync-for-user"

export const dynamic = "force-dynamic"

// POST /api/meetings/sync — pro_max only
export const POST = withAuth(async (_request: NextRequest, userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true, role: true },
  })
  if (user?.tier !== "pro_max" && user?.role !== "super_admin") {
    return NextResponse.json({ skipped: true, reason: "upgrade_required" })
  }

  const result = await syncMeetingsForUser(userId)
  return NextResponse.json(result)
})
