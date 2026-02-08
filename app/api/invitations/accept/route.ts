import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuthUser } from "@/lib/auth/api-middleware"
import { checkTeammateLimit } from "@/lib/teammate-limits"

export const dynamic = "force-dynamic"

// POST /api/invitations/accept - Accept an invitation by token
export const POST = withAuthUser(async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { organization: { select: { id: true, name: true } } },
    })

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "This invitation has already been used" }, { status: 400 })
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "expired" },
      })
      return NextResponse.json({ error: "This invitation has expired" }, { status: 400 })
    }

    // Check email matches
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: `This invitation was sent to ${invitation.email}. Please log in with that email.` },
        { status: 403 }
      )
    }

    // Re-check teammate limit at acceptance time (org may have filled since invite was sent)
    if (user.role !== "super_admin") {
      const limitCheck = await checkTeammateLimit(invitation.organizationId)
      if (!limitCheck.allowed) {
        return NextResponse.json({ error: "This organization is now full. The owner needs to upgrade their plan." }, { status: 403 })
      }
    }

    // Assign user to the organization with the invited role
    // Don't downgrade super_admins
    const newRole = user.role === "super_admin" ? "super_admin" : invitation.role

    await prisma.user.update({
      where: { id: user.id },
      data: {
        organizationId: invitation.organizationId,
        role: newRole,
      },
    })

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    })

    return NextResponse.json({
      message: "Invitation accepted",
      organization: invitation.organization,
    })
  } catch (error) {
    console.error("Error accepting invitation:", error)
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 })
  }
})
