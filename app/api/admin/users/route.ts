import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withSuperAdmin } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

// GET /api/admin/users - List all users
export const GET = withSuperAdmin(async (request: NextRequest, user) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        organization: { select: { id: true, name: true } },
        _count: { select: { calls: true, emails: true, prospects: true } },
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
})

// PATCH /api/admin/users - Update a user's role or org
export const PATCH = withSuperAdmin(async (request: NextRequest, admin) => {
  try {
    const body = await request.json()
    const { userId, role, organizationId } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const updateData: any = {}
    if (role) updateData.role = role
    if (organizationId !== undefined) updateData.organizationId = organizationId || null

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organization: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
})
