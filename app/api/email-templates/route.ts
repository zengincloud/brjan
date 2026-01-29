import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// GET /api/email-templates - Get all email templates for the current user
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    const whereClause: any = { userId, isActive: true }

    if (category) {
      whereClause.category = category
    }

    const templates = await prisma.emailTemplate.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({ templates })
  } catch (error: any) {
    console.error("Error fetching email templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch email templates" },
      { status: 500 }
    )
  }
})

// POST /api/email-templates - Create new email template
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { name, subject, body: templateBody, description, category } = body

    if (!name || !subject || !templateBody) {
      return NextResponse.json(
        { error: "Name, subject, and body are required" },
        { status: 400 }
      )
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        body: templateBody,
        description,
        category: category || "general",
        userId,
      },
    })

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error("Error creating email template:", error)
    return NextResponse.json(
      { error: "Failed to create email template" },
      { status: 500 }
    )
  }
})
