import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// PATCH /api/linkedin-templates/[id] - Update LinkedIn DM template
export const PATCH = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    const body = await request.json()
    const { name, body: templateBody, description, category, isActive } = body

    const template = await prisma.linkedinTemplate.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const updatedTemplate = await prisma.linkedinTemplate.update({
      where: {
        id: params.id,
        userId,
      },
      data: {
        name,
        body: templateBody,
        description,
        category,
        isActive,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ template: updatedTemplate })
  } catch (error: any) {
    console.error("Error updating linkedin template:", error)
    return NextResponse.json(
      { error: "Failed to update linkedin template" },
      { status: 500 }
    )
  }
})

// DELETE /api/linkedin-templates/[id] - Delete LinkedIn DM template
export const DELETE = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    const template = await prisma.linkedinTemplate.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    await prisma.linkedinTemplate.delete({
      where: {
        id: params.id,
        userId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting linkedin template:", error)
    return NextResponse.json(
      { error: "Failed to delete linkedin template" },
      { status: 500 }
    )
  }
})
