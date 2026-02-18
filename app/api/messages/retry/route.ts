import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// POST /api/messages/retry — retry a failed pending message
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { pendingMessageId } = body

    if (!pendingMessageId) {
      return NextResponse.json(
        { error: "pendingMessageId is required" },
        { status: 400 }
      )
    }

    const pending = await prisma.linkedInPendingMessage.findFirst({
      where: { id: pendingMessageId, userId, status: "failed" },
    })

    if (!pending) {
      return NextResponse.json(
        { error: "Failed message not found" },
        { status: 404 }
      )
    }

    await prisma.linkedInPendingMessage.update({
      where: { id: pendingMessageId },
      data: { status: "pending", errorMessage: null },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Retry message API error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to retry message" },
      { status: 500 }
    )
  }
})
