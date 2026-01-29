import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// GET /api/email-templates/[id] - Get single email template
export const GET = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error("Error fetching email template:", error)
    return NextResponse.json(
      { error: "Failed to fetch email template" },
      { status: 500 }
    )
  }
})

// PATCH /api/email-templates/[id] - Update email template
export const PATCH = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    const body = await request.json()
    const { name, subject, body: templateBody, description, category, isActive } = body

    const template = await prisma.emailTemplate.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const updatedTemplate = await prisma.emailTemplate.update({
      where: {
        id: params.id,
        userId,
      },
      data: {
        name,
        subject,
        body: templateBody,
        description,
        category,
        isActive,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ template: updatedTemplate })
  } catch (error: any) {
    console.error("Error updating email template:", error)
    return NextResponse.json(
      { error: "Failed to update email template" },
      { status: 500 }
    )
  }
})

// DELETE /api/email-templates/[id] - Delete email template
export const DELETE = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    await prisma.emailTemplate.delete({
      where: {
        id: params.id,
        userId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting email template:", error)
    return NextResponse.json(
      { error: "Failed to delete email template" },
      { status: 500 }
    )
  }
})
