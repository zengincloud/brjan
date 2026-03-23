import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  const [
    invitesSent,
    invitesAccepted,
    messagesSent,
    messagesReplied,
    unmatchedCount,
  ] = await Promise.all([
    // Invites sent = campaign prospects with status beyond pending
    prisma.linkedInCampaignProspect.count({
      where: { userId, inviteSentAt: { not: null } },
    }),
    // Accepted
    prisma.linkedInCampaignProspect.count({
      where: { userId, acceptedAt: { not: null } },
    }),
    // Messages sent (outbound messages in DB)
    prisma.linkedInMessage.count({
      where: {
        direction: "outbound",
        conversation: { userId },
      },
    }),
    // Replied = conversations where we sent a message AND received one after
    prisma.linkedInCampaignProspect.count({
      where: { userId, repliedAt: { not: null } },
    }),
    // Unmatched conversations
    prisma.linkedInConversation.count({
      where: { userId, matchStatus: "unmatched" },
    }),
  ])

  return NextResponse.json({
    invitesSent,
    invitesAccepted,
    messagesSent,
    messagesReplied,
    unmatchedCount,
  })
})
