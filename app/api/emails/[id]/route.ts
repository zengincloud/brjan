import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// DELETE /api/emails/[id] - Delete an email (draft)
export const DELETE = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!

  try {
    // Verify the email belongs to the user
    const email = await prisma.email.findFirst({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!email) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 404 }
      )
    }

    // Delete the email
    await prisma.email.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting email:", error)
    return NextResponse.json(
      { error: "Failed to delete email" },
      { status: 500 }
    )
  }
})

// PATCH /api/emails/[id] - Update an email (draft)
export const PATCH = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!

  try {
    const body = await request.json()
    const { subject, bodyText, bodyHtml, status } = body

    // Verify the email belongs to the user
    const email = await prisma.email.findFirst({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!email) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 404 }
      )
    }

    // Update the email
    const updatedEmail = await prisma.email.update({
      where: { id: params.id },
      data: {
        ...(subject !== undefined && { subject }),
        ...(bodyText !== undefined && { bodyText }),
        ...(bodyHtml !== undefined && { bodyHtml }),
        ...(status !== undefined && { status }),
      },
    })

    return NextResponse.json({ email: updatedEmail })
  } catch (error: any) {
    console.error("Error updating email:", error)
    return NextResponse.json(
      { error: "Failed to update email" },
      { status: 500 }
    )
  }
})
