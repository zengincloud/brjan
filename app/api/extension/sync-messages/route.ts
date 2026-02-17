import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withExtensionAuth } from "@/lib/auth/extension-middleware"

export const dynamic = 'force-dynamic'

// POST /api/extension/sync-messages
// Receives scraped LinkedIn conversations + messages from the extension.
// Upserts conversations and inserts new messages (dedup by linkedinMsgId).
export const POST = withExtensionAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { conversations } = body as {
      conversations: {
        linkedinThreadId: string
        participantName: string
        participantTitle?: string
        participantAvatar?: string
        participantLinkedin?: string
        messages: {
          linkedinMsgId: string
          direction: "inbound" | "outbound"
          body: string
          senderName: string
          sentAt: string
        }[]
      }[]
    }

    if (!conversations || !Array.isArray(conversations)) {
      return NextResponse.json(
        { error: "conversations array is required" },
        { status: 400 }
      )
    }

    let syncedConversations = 0
    let syncedMessages = 0

    for (const conv of conversations) {
      // Upsert conversation
      const conversation = await prisma.linkedInConversation.upsert({
        where: {
          userId_linkedinThreadId: {
            userId,
            linkedinThreadId: conv.linkedinThreadId,
          },
        },
        update: {
          participantName: conv.participantName,
          participantTitle: conv.participantTitle || undefined,
          participantAvatar: conv.participantAvatar || undefined,
          participantLinkedin: conv.participantLinkedin || undefined,
        },
        create: {
          userId,
          linkedinThreadId: conv.linkedinThreadId,
          participantName: conv.participantName,
          participantTitle: conv.participantTitle,
          participantAvatar: conv.participantAvatar,
          participantLinkedin: conv.participantLinkedin,
        },
      })

      // Try to auto-link to a prospect by LinkedIn URL
      if (conv.participantLinkedin && !conversation.prospectId) {
        const prospect = await prisma.prospect.findFirst({
          where: {
            userId,
            linkedin: {
              contains: conv.participantLinkedin.replace(
                /^https?:\/\/(www\.)?linkedin\.com/,
                ""
              ),
            },
          },
          select: { id: true },
        })
        if (prospect) {
          await prisma.linkedInConversation.update({
            where: { id: conversation.id },
            data: { prospectId: prospect.id },
          })
        }
      }

      syncedConversations++

      // Insert messages (skip duplicates)
      for (const msg of conv.messages) {
        try {
          await prisma.linkedInMessage.upsert({
            where: {
              conversationId_linkedinMsgId: {
                conversationId: conversation.id,
                linkedinMsgId: msg.linkedinMsgId,
              },
            },
            update: {},
            create: {
              conversationId: conversation.id,
              linkedinMsgId: msg.linkedinMsgId,
              direction: msg.direction,
              body: msg.body,
              senderName: msg.senderName,
              sentAt: new Date(msg.sentAt),
            },
          })
          syncedMessages++
        } catch {
          // Skip duplicate or invalid messages
        }
      }

      // Update conversation metadata
      const lastMessage = await prisma.linkedInMessage.findFirst({
        where: { conversationId: conversation.id },
        orderBy: { sentAt: "desc" },
      })
      if (lastMessage) {
        const unreadCount = await prisma.linkedInMessage.count({
          where: {
            conversationId: conversation.id,
            direction: "inbound",
            sentAt: { gt: conversation.updatedAt },
          },
        })
        await prisma.linkedInConversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageText: lastMessage.body,
            lastMessageAt: lastMessage.sentAt,
            unreadCount,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      syncedConversations,
      syncedMessages,
    })
  } catch (error: any) {
    console.error("Extension sync-messages error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync messages" },
      { status: 500 }
    )
  }
})
