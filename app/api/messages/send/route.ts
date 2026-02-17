import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// POST /api/messages/send — queue a message for the extension to send via LinkedIn
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { conversationId, message } = body

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: "conversationId and message are required" },
        { status: 400 }
      )
    }

    // Get the conversation to find the LinkedIn thread ID
    const conversation = await prisma.linkedInConversation.findFirst({
      where: { id: conversationId, userId },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    // Queue the message for the extension to send
    const pendingMessage = await prisma.linkedInPendingMessage.create({
      data: {
        userId,
        linkedinThreadId: conversation.linkedinThreadId,
        body: message,
      },
    })

    return NextResponse.json({
      success: true,
      pendingMessage: {
        id: pendingMessage.id,
        status: pendingMessage.status,
      },
    })
  } catch (error: any) {
    console.error("Send message API error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    )
  }
})
