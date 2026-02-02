import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

// GET /api/organization - Get the user's organization
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        organizationId: true,
        organization: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      organization: user.organization,
      userInfo: {
        role: user.role,
        organizationId: user.organizationId,
      },
    })
  } catch (error: any) {
    console.error("Error fetching organization:", error)
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    )
  }
})

// POST /api/organization - Create a new organization
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Only allow if user doesn't have an organization yet
    if (user.organizationId) {
      return NextResponse.json(
        { error: "User already belongs to an organization" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, description, targetAudience, painPoints, valueProposition, industry, website } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      )
    }

    // Create organization and assign user as owner
    const organization = await prisma.organization.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        targetAudience: targetAudience?.trim() || null,
        painPoints: painPoints?.trim() || null,
        valueProposition: valueProposition?.trim() || null,
        industry: industry?.trim() || null,
        website: website?.trim() || null,
      },
    })

    // Update user to be owner of the organization
    await prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: organization.id,
        role: "owner",
      },
    })

    return NextResponse.json({ organization })
  } catch (error: any) {
    console.error("Error creating organization:", error)
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    )
  }
})

// PATCH /api/organization - Update organization
export const PATCH = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, organizationId: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: "User does not belong to an organization" },
        { status: 400 }
      )
    }

    // Only owners and managers can update
    if (user.role !== "owner" && user.role !== "manager") {
      return NextResponse.json(
        { error: "Only owners and managers can update organization settings" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, targetAudience, painPoints, valueProposition, industry, website } = body

    const organization = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        name: name?.trim() || undefined,
        description: description?.trim() || null,
        targetAudience: targetAudience?.trim() || null,
        painPoints: painPoints?.trim() || null,
        valueProposition: valueProposition?.trim() || null,
        industry: industry?.trim() || null,
        website: website?.trim() || null,
      },
    })

    return NextResponse.json({ organization })
  } catch (error: any) {
    console.error("Error updating organization:", error)
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    )
  }
})
