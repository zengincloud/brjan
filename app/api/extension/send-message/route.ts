import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withExtensionAuth } from "@/lib/auth/extension-middleware"

export const dynamic = 'force-dynamic'

// POST /api/extension/send-message
// Called from the web app to queue a message for the extension to send via LinkedIn.
export const POST = withExtensionAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { linkedinThreadId, body: messageBody } = body

    if (!linkedinThreadId || !messageBody) {
      return NextResponse.json(
        { error: "linkedinThreadId and body are required" },
        { status: 400 }
      )
    }

    // Verify the conversation belongs to this user
    const conversation = await prisma.linkedInConversation.findUnique({
      where: {
        userId_linkedinThreadId: {
          userId,
          linkedinThreadId,
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    // Queue the message
    const pendingMessage = await prisma.linkedInPendingMessage.create({
      data: {
        userId,
        linkedinThreadId,
        body: messageBody,
      },
    })

    return NextResponse.json({
      success: true,
      pendingMessage: {
        id: pendingMessage.id,
        linkedinThreadId: pendingMessage.linkedinThreadId,
        body: pendingMessage.body,
        status: pendingMessage.status,
      },
    })
  } catch (error: any) {
    console.error("Extension send-message error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to queue message" },
      { status: 500 }
    )
  }
})
