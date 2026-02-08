import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuthUser } from "@/lib/auth/api-middleware"
import { randomBytes } from "crypto"

export const dynamic = "force-dynamic"

// GET /api/invitations - List invitations
export const GET = withAuthUser(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get("organizationId")

    const whereClause: any = {}

    if (user.role === "super_admin" && orgId) {
      whereClause.organizationId = orgId
    } else if (user.role === "super_admin") {
      // Super admin sees all invitations
    } else if (user.organizationId) {
      // Org owners/managers see their org's invitations
      whereClause.organizationId = user.organizationId
    } else {
      return NextResponse.json({ invitations: [] })
    }

    const invitations = await prisma.invitation.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        organization: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error("Error fetching invitations:", error)
    return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 })
  }
})

// POST /api/invitations - Send an invitation
export const POST = withAuthUser(async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    const { email, role = "member", organizationId } = body

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Determine which org to invite to
    let targetOrgId: string
    if (user.role === "super_admin" && organizationId) {
      targetOrgId = organizationId
    } else if (user.organizationId && (user.role === "owner" || user.role === "manager" || user.role === "super_admin")) {
      targetOrgId = user.organizationId
    } else {
      return NextResponse.json({ error: "You cannot send invitations" }, { status: 403 })
    }

    // Check if user already exists in the org
    const existingUser = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), organizationId: targetOrgId },
    })
    if (existingUser) {
      return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 })
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.invitation.findFirst({
      where: { email: email.trim().toLowerCase(), organizationId: targetOrgId, status: "pending" },
    })
    if (existingInvite) {
      return NextResponse.json({ error: "An invitation has already been sent to this email" }, { status: 400 })
    }

    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const invitation = await prisma.invitation.create({
      data: {
        email: email.trim().toLowerCase(),
        role: role as any,
        token,
        organizationId: targetOrgId,
        invitedById: user.id,
        expiresAt,
      },
      include: {
        organization: { select: { name: true } },
      },
    })

    // Send invite email via SendGrid
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    const inviteLink = `${siteUrl}/invite/${token}`

    try {
      const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: email.trim() }] }],
          from: { email: process.env.SENDGRID_FROM_EMAIL || "noreply@boilerroom.ai", name: "Boilerroom" },
          subject: `You've been invited to join ${invitation.organization.name} on Boilerroom`,
          content: [
            {
              type: "text/html",
              value: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>You've been invited!</h2>
                  <p>${user.firstName || user.email} has invited you to join <strong>${invitation.organization.name}</strong> on Boilerroom.</p>
                  <p><a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
                  <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
                </div>
              `,
            },
          ],
        }),
      })

      if (!sgResponse.ok) {
        console.error("SendGrid error:", await sgResponse.text())
      }
    } catch (emailError) {
      console.error("Error sending invite email:", emailError)
    }

    return NextResponse.json({ invitation, inviteLink })
  } catch (error) {
    console.error("Error creating invitation:", error)
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 })
  }
})
