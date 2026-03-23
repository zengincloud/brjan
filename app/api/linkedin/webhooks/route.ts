import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get("x-webhook-secret")
  if (process.env.UNIPILE_WEBHOOK_SECRET && secret !== process.env.UNIPILE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const event = await request.json()
  const { type, data } = event

  if (type === "new_message") {
    await handleNewMessage(data)
  } else if (type === "invitation_accepted") {
    await handleInvitationAccepted(data)
  }

  return NextResponse.json({ ok: true })
}

async function handleNewMessage(data: any) {
  const { chat_id, message } = data

  // Find the conversation by unipileThreadId
  const conversation = await prisma.linkedInConversation.findFirst({
    where: { unipileThreadId: chat_id },
    include: { prospect: { select: { id: true } } },
  })

  if (!conversation) return

  // Avoid duplicates — skip if we already have this message
  if (message.id) {
    const existing = await prisma.linkedInMessage.findFirst({
      where: { conversationId: conversation.id, linkedinMsgId: message.id },
    })
    if (existing) return
  }

  await prisma.linkedInMessage.create({
    data: {
      conversationId: conversation.id,
      linkedinMsgId: message.id || null,
      direction: message.sender_id === conversation.participantLinkedin ? "inbound" : "outbound",
      body: message.text || "",
      senderName: message.sender_name || "",
      sentAt: new Date(message.created_at || Date.now()),
      status: "delivered",
    },
  })

  // Update conversation last message + unread count
  const isInbound = message.sender_id === conversation.participantLinkedin
  await prisma.linkedInConversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageText: message.text || "",
      lastMessageAt: new Date(message.created_at || Date.now()),
      ...(isInbound && { unreadCount: { increment: 1 } }),
    },
  })

}

async function handleInvitationAccepted(data: any) {
  const { account_id, provider_id } = data

  // Find the user with this unipile account
  const user = await prisma.user.findFirst({
    where: { unipileAccountId: account_id },
  })
  if (!user) return

  // Find the campaign prospect by linkedinProfileId
  const campaignProspect = await prisma.linkedInCampaignProspect.findFirst({
    where: {
      userId: user.id,
      linkedinProfileId: provider_id,
      status: "invited",
    },
    include: {
      campaign: { select: { id: true, followUpMessage: true, followUpDelayDays: true } },
    },
  })

  if (!campaignProspect) return

  await prisma.linkedInCampaignProspect.update({
    where: { id: campaignProspect.id },
    data: { status: "accepted", acceptedAt: new Date() },
  })
}
