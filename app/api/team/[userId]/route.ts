import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuthUser } from "@/lib/auth/api-middleware"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// PATCH /api/team/[userId] - Update a team member's role
export const PATCH = withAuthUser(async (request: NextRequest, user, context: any) => {
  try {
    const { userId: targetUserId } = await context.params
    const body = await request.json()
    const { role } = body

    if (!user.organizationId) {
      return NextResponse.json({ error: "You don't belong to an organization" }, { status: 400 })
    }

    // Only owners, managers, and super_admins can change roles
    if (user.role !== "owner" && user.role !== "manager" && user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Can't change your own role
    if (targetUserId === user.id) {
      return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 })
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, organizationId: user.organizationId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found in your organization" }, { status: 404 })
    }

    // Don't allow changing super_admin roles from team settings
    if (targetUser.role === "super_admin") {
      return NextResponse.json({ error: "Cannot change a super admin's role" }, { status: 403 })
    }

    const validRoles = ["owner", "manager", "member"]
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error("Error updating team member:", error)
    return NextResponse.json({ error: "Failed to update team member" }, { status: 500 })
  }
})

// DELETE /api/team/[userId] - Delete a user entirely
export const DELETE = withAuthUser(async (request: NextRequest, user, context: any) => {
  try {
    const { userId: targetUserId } = await context.params
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get("permanent") === "true"

    if (!user.organizationId) {
      return NextResponse.json({ error: "You don't belong to an organization" }, { status: 400 })
    }

    if (user.role !== "owner" && user.role !== "super_admin") {
      return NextResponse.json({ error: "Only owners can remove members" }, { status: 403 })
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 })
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, organizationId: user.organizationId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found in your organization" }, { status: 404 })
    }

    if (targetUser.role === "super_admin") {
      return NextResponse.json({ error: "Cannot remove a super admin" }, { status: 403 })
    }

    if (permanent) {
      // Permanently delete the user and all their data
      // Prisma cascade will handle related records (calls, emails, prospects, tasks, etc.)
      await prisma.user.delete({
        where: { id: targetUserId },
      })

      // Also delete from Supabase Auth
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
    } else {
      // Just remove from org
      await prisma.user.update({
        where: { id: targetUserId },
        data: { organizationId: null, role: "member" },
      })

      return NextResponse.json({ message: "Member removed from organization" })
    }
  } catch (error) {
    console.error("Error removing/deleting team member:", error)
    return NextResponse.json({ error: "Failed to remove team member" }, { status: 500 })
  }
})
