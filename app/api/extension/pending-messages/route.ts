import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withExtensionAuth } from "@/lib/auth/extension-middleware"

export const dynamic = 'force-dynamic'

// GET /api/extension/pending-messages
// Returns messages queued from the web app that the extension needs to send via LinkedIn.
export const GET = withExtensionAuth(async (request: NextRequest, userId: string) => {
  try {
    // Also recover messages stuck in "sending" for more than 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
    await prisma.linkedInPendingMessage.updateMany({
      where: {
        userId,
        status: "sending",
        updatedAt: { lt: twoMinutesAgo },
      },
      data: { status: "pending" },
    })

    const pendingMessages = await prisma.linkedInPendingMessage.findMany({
      where: {
        userId,
        status: "pending",
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    })

    // Mark them as "sending" so they aren't picked up again
    if (pendingMessages.length > 0) {
      await prisma.linkedInPendingMessage.updateMany({
        where: {
          id: { in: pendingMessages.map((m) => m.id) },
        },
        data: { status: "sending" },
      })
    }

    return NextResponse.json({
      messages: pendingMessages.map((m) => ({
        id: m.id,
        linkedinThreadId: m.linkedinThreadId,
        body: m.body,
      })),
    })
  } catch (error: any) {
    console.error("Extension pending-messages error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch pending messages" },
      { status: 500 }
    )
  }
})

// POST /api/extension/pending-messages
// Report the result of sending a pending message (success or failure).
export const POST = withExtensionAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { messageId, success, errorMessage } = body

    if (!messageId) {
      return NextResponse.json(
        { error: "messageId is required" },
        { status: 400 }
      )
    }

    const pending = await prisma.linkedInPendingMessage.findFirst({
      where: { id: messageId, userId },
    })

    if (!pending) {
      return NextResponse.json(
        { error: "Pending message not found" },
        { status: 404 }
      )
    }

    if (success) {
      await prisma.linkedInPendingMessage.update({
        where: { id: messageId },
        data: { status: "sent" },
      })

      // Also record it as a sent message in the conversation
      const conversation = await prisma.linkedInConversation.findUnique({
        where: {
          userId_linkedinThreadId: {
            userId,
            linkedinThreadId: pending.linkedinThreadId,
          },
        },
      })

      if (conversation) {
        await prisma.linkedInMessage.create({
          data: {
            conversationId: conversation.id,
            direction: "outbound",
            body: pending.body,
            senderName: "You",
            status: "delivered",
          },
        })

        await prisma.linkedInConversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageText: pending.body,
            lastMessageAt: new Date(),
          },
        })
      }
    } else {
      await prisma.linkedInPendingMessage.update({
        where: { id: messageId },
        data: {
          status: "failed",
          errorMessage: errorMessage || "Failed to send",
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Extension pending-messages report error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to report message status" },
      { status: 500 }
    )
  }
})
