import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withSuperAdmin } from "@/lib/auth/api-middleware"
import { TIER_CONFIG, type TierKey } from "@/lib/tier-config"
import { createClient } from "@supabase/supabase-js"

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
        tier: true,
        creditsUsed: true,
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
    const { userId, role, organizationId, tier } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const updateData: any = {}
    if (role) updateData.role = role
    if (organizationId !== undefined) updateData.organizationId = organizationId || null

    // Handle tier change: reset credits and set next reset date
    if (tier && tier in TIER_CONFIG) {
      updateData.tier = tier
      updateData.creditsUsed = 0
      if (tier === "trial") {
        updateData.creditsResetAt = null
      } else {
        const nextReset = new Date()
        nextReset.setDate(nextReset.getDate() + 30)
        updateData.creditsResetAt = nextReset
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tier: true,
        creditsUsed: true,
        organization: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
})

// DELETE /api/admin/users - Permanently delete a user
export const DELETE = withSuperAdmin(async (request: NextRequest, admin) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    if (userId === admin.id) {
      return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (targetUser.role === "super_admin") {
      return NextResponse.json({ error: "Cannot delete a super admin" }, { status: 403 })
    }

    // Delete from database (cascade handles related records)
    await prisma.user.delete({
      where: { id: userId },
    })

    // Delete from Supabase Auth
    try {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await supabaseAdmin.auth.admin.deleteUser(targetUser.supabaseId)
    } catch (err) {
      console.error("Failed to delete Supabase auth user (DB user already deleted):", err)
    }

    return NextResponse.json({ message: "User permanently deleted" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
})
