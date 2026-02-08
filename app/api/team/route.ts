import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuthUser } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

// GET /api/team - List members of current user's organization
export const GET = withAuthUser(async (request: NextRequest, user) => {
  try {
    if (!user.organizationId) {
      return NextResponse.json({ members: [] })
    }

    const members = await prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            calls: true,
            emails: true,
            prospects: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error("Error fetching team:", error)
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 })
  }
})
