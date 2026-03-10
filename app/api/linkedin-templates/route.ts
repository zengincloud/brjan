import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// GET /api/linkedin-templates - Get all LinkedIn DM templates for the current user
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    const whereClause: any = { userId, isActive: true }

    if (category) {
      whereClause.category = category
    }

    const templates = await prisma.linkedinTemplate.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({ templates })
  } catch (error: any) {
    console.error("Error fetching linkedin templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch linkedin templates" },
      { status: 500 }
    )
  }
})

// POST /api/linkedin-templates - Create new LinkedIn DM template
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { name, body: templateBody, description, category } = body

    if (!name || !templateBody) {
      return NextResponse.json(
        { error: "Name and body are required" },
        { status: 400 }
      )
    }

    const template = await prisma.linkedinTemplate.create({
      data: {
        name,
        body: templateBody,
        description,
        category: category || "general",
        userId,
      },
    })

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error("Error creating linkedin template:", error)
    return NextResponse.json(
      { error: "Failed to create linkedin template" },
      { status: 500 }
    )
  }
})
