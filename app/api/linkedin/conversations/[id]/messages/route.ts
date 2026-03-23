import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import { sendMessage } from "@/lib/unipile"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string, context?: any) => {
  const { id } = context?.params || {}

  const conversation = await prisma.linkedInConversation.findFirst({
    where: { id, userId },
  })
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  const messages = await prisma.linkedInMessage.findMany({
    where: { conversationId: id },
    orderBy: { sentAt: "asc" },
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
