import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withSuperAdmin } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

// GET /api/admin/organizations/[id] - Get organization detail with members
export const GET = withSuperAdmin(async (request: NextRequest, user, context: any) => {
  try {
    const { id } = await context.params

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
            _count: { select: { calls: true, emails: true, prospects: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { users: true } },
      },
    })

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    return NextResponse.json({ organization })
  } catch (error) {
    console.error("Error fetching organization:", error)
    return NextResponse.json({ error: "Failed to fetch organization" }, { status: 500 })
  }
})

// PATCH /api/admin/organizations/[id] - Update organization
export const PATCH = withSuperAdmin(async (request: NextRequest, user, context: any) => {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { name, description, industry, website } = body

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        name: name?.trim() || undefined,
        description: description?.trim() || null,
        industry: industry?.trim() || null,
        website: website?.trim() || null,
      },
    })

    return NextResponse.json({ organization })
  } catch (error) {
    console.error("Error updating organization:", error)
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 })
  }
})

// DELETE /api/admin/organizations/[id] - Delete organization
export const DELETE = withSuperAdmin(async (request: NextRequest, user, context: any) => {
  try {
    const { id } = await context.params

    // Unassign all users first
    await prisma.user.updateMany({
      where: { organizationId: id },
      data: { organizationId: null, role: "member" },
    })

    await prisma.organization.delete({ where: { id } })

    return NextResponse.json({ message: "Organization deleted" })
  } catch (error) {
    console.error("Error deleting organization:", error)
    return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 })
  }
})
