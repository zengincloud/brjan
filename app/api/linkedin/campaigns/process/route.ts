import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendInvite, sendMessage as sendUnipileMessage, startChat } from "@/lib/unipile"

export const dynamic = "force-dynamic"

const DAILY_INVITE_LIMIT = 20

export async function POST(request: NextRequest) {
  // Simple secret check for cron calls
  const secret = request.headers.get("x-cron-secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get all active campaigns grouped by user
  const activeCampaigns = await prisma.linkedInCampaign.findMany({
    where: { status: "active" },
    include: {
      user: { select: { id: true, unipileAccountId: true } },
      prospects: {
        where: { status: "pending" },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  const results: { userId: string; campaignId: string; sent: number; errors: string[] }[] = []

  // Process per user — enforce daily limit across all their campaigns
  const userProspects = new Map<string, typeof activeCampaigns[0][]>()
  for (const campaign of activeCampaigns) {
    const uid = campaign.userId
    if (!userProspects.has(uid)) userProspects.set(uid, [])
    userProspects.get(uid)!.push(campaign)
  }

  for (const [userId, campaigns] of userProspects) {
    const user = campaigns[0].user
    if (!user?.unipileAccountId) continue

    // Count invites already sent today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const sentToday = await prisma.linkedInCampaignProspect.count({
      where: {
        userId,
        inviteSentAt: { gte: todayStart },
      },
    })

    let remaining = DAILY_INVITE_LIMIT - sentToday
    if (remaining <= 0) continue

    for (const campaign of campaigns) {
      if (remaining <= 0) break
      const errors: string[] = []
      let sent = 0

      for (const prospect of campaign.prospects) {
        if (remaining <= 0) break

        try {
          await sendInvite(
            user.unipileAccountId!,
            prospect.linkedinProfileId,
            campaign.inviteMessage || undefined
          )

          await prisma.linkedInCampaignProspect.update({
            where: { id: prospect.id },
            data: { status: "invited", inviteSentAt: new Date() },
          })

          sent++
          remaining--
        } catch (err: any) {
          errors.push(`${prospect.name}: ${err.message}`)
          await prisma.linkedInCampaignProspect.update({
            where: { id: prospect.id },
            data: { status: "failed" },
          })
        }
      }

      results.push({ userId, campaignId: campaign.id, sent, errors })

      // If all prospects exhausted, mark campaign completed
      const pendingCount = await prisma.linkedInCampaignProspect.count({
        where: { campaignId: campaign.id, status: "pending" },
      })
      if (pendingCount === 0) {
        await prisma.linkedInCampaign.update({
          where: { id: campaign.id },
          data: { status: "completed" },
        })
      }
    }
  }

  // Process follow-up messages for accepted prospects
  const followUpResults = await processFollowUps()

  return NextResponse.json({ results, followUps: followUpResults })
}

async function processFollowUps() {
  const results: { prospectId: string; sent: boolean; error?: string }[] = []

  // Find accepted prospects with follow-up message due
  const accepted = await prisma.linkedInCampaignProspect.findMany({
    where: {
      status: "accepted",
      acceptedAt: { not: null },
    },
    include: {
      campaign: {
        select: { followUpMessage: true, followUpDelayDays: true },
      },
    },
  })

  for (const prospect of accepted) {
    if (!prospect.campaign.followUpMessage) continue
    if (!prospect.acceptedAt) continue

    // Check if delay has passed
    const sendAfter = new Date(prospect.acceptedAt)
    sendAfter.setDate(sendAfter.getDate() + prospect.campaign.followUpDelayDays)
    if (new Date() < sendAfter) continue

    const user = await prisma.user.findUnique({
      where: { id: prospect.userId },
      select: { unipileAccountId: true },
    })
    if (!user?.unipileAccountId) continue

    try {
      // Start a new chat or send message
      await startChat(
        user.unipileAccountId,
        prospect.linkedinProfileId,
        prospect.campaign.followUpMessage
      )

      await prisma.linkedInCampaignProspect.update({
        where: { id: prospect.id },
        data: { status: "messaged", messageSentAt: new Date() },
      })

      results.push({ prospectId: prospect.id, sent: true })
    } catch (err: any) {
      results.push({ prospectId: prospect.id, sent: false, error: err.message })
    }
  }

  return results
}
