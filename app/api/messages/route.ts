import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/messages — list LinkedIn conversations or fetch a single thread
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId")

    if (conversationId) {
      const conversation = await prisma.linkedInConversation.findFirst({
        where: { id: conversationId, userId },
        include: {
          messages: {
            orderBy: { sentAt: "asc" },
          },
          prospect: {
            select: { id: true, name: true, email: true, company: true },
          },
        },
      })

      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        )
      }

      // Fetch pending/sending/failed messages for this thread
      const pendingMessages = await prisma.linkedInPendingMessage.findMany({
        where: {
          userId,
          linkedinThreadId: conversation.linkedinThreadId,
          status: { in: ["pending", "sending", "failed"] },
        },
        orderBy: { createdAt: "asc" },
      })

      // Mark as read
      await prisma.linkedInConversation.update({
        where: { id: conversation.id },
        data: { unreadCount: 0 },
      })

      return NextResponse.json({
        conversation: {
          ...conversation,
          pendingMessages: pendingMessages.map((m) => ({
            id: m.id,
            body: m.body,
            status: m.status,
            errorMessage: m.errorMessage,
            createdAt: m.createdAt.toISOString(),
          })),
        },
      })
    }

    // List all conversations
    const conversations = await prisma.linkedInConversation.findMany({
      where: { userId },
      orderBy: { lastMessageAt: "desc" },
      include: {
        prospect: {
          select: { id: true, name: true, email: true, company: true },
        },
      },
    })

    return NextResponse.json({ conversations })
  } catch (error: any) {
    console.error("Messages API error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    )
  }
})
