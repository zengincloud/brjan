import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withSuperAdmin } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

// GET /api/admin/organizations - List all organizations
export const GET = withSuperAdmin(async (request: NextRequest, user) => {
  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true } },
      },
    })

    return NextResponse.json({ organizations })
  } catch (error) {
    console.error("Error fetching organizations:", error)
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 })
  }
})

// POST /api/admin/organizations - Create a new organization
export const POST = withSuperAdmin(async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    const { name, description, industry, website } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const organization = await prisma.organization.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        industry: industry?.trim() || null,
        website: website?.trim() || null,
      },
    })

    return NextResponse.json({ organization })
  } catch (error) {
    console.error("Error creating organization:", error)
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 })
  }
})
