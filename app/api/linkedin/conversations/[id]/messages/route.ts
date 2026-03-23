import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import { sendMessage, getChatMessages } from "@/lib/unipile"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string, context?: any) => {
  const { id } = context?.params || {}

  const conversation = await prisma.linkedInConversation.findFirst({
    where: { id, userId },
    include: { user: { select: { unipileAccountId: true } } },
  })
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  // Refresh messages from Unipile to get correct timestamps
  if (conversation.unipileThreadId && conversation.user?.unipileAccountId) {
    try {
      const accountId = conversation.user.unipileAccountId
      const msgRes = await getChatMessages(conversation.unipileThreadId, accountId)
      const fresh = msgRes.items || msgRes.messages || []

      for (const msg of fresh) {
        const msgId = msg.id || null
        const isOutbound = msg.is_sender || msg.sender_id === null || msg.direction === "outbound"
        const rawTs = msg.created_at || msg.timestamp || msg.date || msg.sent_at || msg.at
        const sentAt = rawTs
          ? new Date(typeof rawTs === "number" ? rawTs * 1000 : rawTs)
          : new Date()
        const fallbackId = `${id}-${rawTs || msgId || Math.random()}`

        await prisma.linkedInMessage.upsert({
          where: { conversationId_linkedinMsgId: { conversationId: id, linkedinMsgId: msgId || fallbackId } },
          create: {
            conversationId: id,
            linkedinMsgId: msgId || fallbackId,
            direction: isOutbound ? "outbound" : "inbound",
            body: msg.text || msg.body || "",
            senderName: isOutbound ? "You" : conversation.participantName,
            status: "delivered",
            sentAt,
          },
          update: { sentAt, body: msg.text || msg.body || "" },
        })
      }
    } catch {
      // Fall through to DB read if Unipile fetch fails
    }
  }

  const messages = await prisma.linkedInMessage.findMany({
    where: { conversationId: id },
    orderBy: [{ sentAt: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({ messages })
})

export const POST = withAuth(async (request: NextRequest, userId: string, context?: any) => {
  const { id } = context?.params || {}
  const { text } = await request.json()

  if (!text?.trim()) {
    return NextResponse.json({ error: "Message text required" }, { status: 400 })
  }

  const conversation = await prisma.linkedInConversation.findFirst({
    where: { id, userId },
  })
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { unipileAccountId: true, firstName: true, lastName: true },
  })

  // Send via Unipile if connected, otherwise queue for extension
  if (user?.unipileAccountId && conversation.unipileThreadId) {
    await sendMessage(conversation.unipileThreadId, text.trim(), user.unipileAccountId)
  }

  // Save message to DB
  const message = await prisma.linkedInMessage.create({
    data: {
      conversationId: id,
      direction: "outbound",
      body: text.trim(),
      senderName: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "You",
      status: "delivered",
      sentAt: new Date(),
    },
  })

  // Update conversation last message
  await prisma.linkedInConversation.update({
    where: { id },
    data: {
      lastMessageText: text.trim(),
      lastMessageAt: new Date(),
    },
  })

  return NextResponse.json({ message })
})
