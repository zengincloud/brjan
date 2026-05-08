import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withSuperAdmin } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

export const GET = withSuperAdmin(async (_request: NextRequest, user) => {
  const calls = await prisma.call.findMany({
    where: {
      status: "in_progress",
      user: { organizationId: user.organizationId },
    },
    orderBy: { startedAt: "asc" },
    select: {
      id: true,
      startedAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
      prospect: {
        select: { name: true, company: true },
      },
    },
  })

  return NextResponse.json({ calls })
})
