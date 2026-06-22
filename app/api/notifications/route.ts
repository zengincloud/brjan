import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// GET /api/notifications — unread notifications for the current user
export const GET = withAuth(async (_req: NextRequest, userId: string) => {
  const notifications = await prisma.notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  return NextResponse.json(notifications)
})

// PATCH /api/notifications — mark all (or specific ids) as read
export const PATCH = withAuth(async (req: NextRequest, userId: string) => {
  const body = await req.json().catch(() => ({}))
  const ids: string[] | undefined = body.ids

  if (ids?.length) {
    await prisma.notification.updateMany({
      where: { userId, id: { in: ids } },
      data: { read: true },
    })
  } else {
    await prisma.notification.updateMany({
      where: { userId },
      data: { read: true },
    })
  }

  return NextResponse.json({ ok: true })
})
