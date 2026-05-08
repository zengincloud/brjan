import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { withSuperAdmin } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

// GET — list who's on the floor (org-scoped, super admin only)
export const GET = withSuperAdmin(async (_request: NextRequest, user) => {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)

  const present = await prisma.salesfloorPresence.findMany({
    where: {
      lastSeen: { gte: twoMinutesAgo },
      user: { organizationId: user.organizationId },
    },
    select: {
      lastSeen: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          role: true,
        },
      },
    },
    orderBy: { lastSeen: "desc" },
  })

  return NextResponse.json({ present })
})

// POST — upsert own presence (any authenticated user on the dialer)
export const POST = withAuth(async (_request: NextRequest, userId: string) => {
  await prisma.salesfloorPresence.upsert({
    where: { userId },
    create: { userId, lastSeen: new Date() },
    update: { lastSeen: new Date() },
  })
  return NextResponse.json({ ok: true })
})

// DELETE — leave the floor
export const DELETE = withAuth(async (_request: NextRequest, userId: string) => {
  await prisma.salesfloorPresence.deleteMany({ where: { userId } })
  return NextResponse.json({ ok: true })
})
