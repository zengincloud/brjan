import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withExtensionAuth } from "@/lib/auth/extension-middleware"

export const dynamic = 'force-dynamic'

// GET /api/extension/conversations
// Returns the user's LinkedIn conversations for the web app inbox.
// Supports ?conversationId=xxx to fetch messages for a specific thread.
export const GET = withExtensionAuth(async (request: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId")

    if (conversationId) {
      // Fetch messages for a specific conversation
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

      // Mark as read
      await prisma.linkedInConversation.update({
        where: { id: conversation.id },
        data: { unreadCount: 0 },
      })

      return NextResponse.json({ conversation })
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
    console.error("Extension conversations error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch conversations" },
      { status: 500 }
    )
  }
})
