import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  const days = parseInt(request.nextUrl.searchParams.get("days") || "30", 10)
  const since = new Date(Date.now() - days * 86_400_000)

  const [sent, failed, opened, clicked] = await Promise.all([
    prisma.email.count({ where: { userId, status: "sent", sentAt: { gte: since } } }),
    prisma.email.count({ where: { userId, status: "failed", updatedAt: { gte: since } } }),
    prisma.email.count({ where: { userId, status: "sent", openedAt: { not: null }, sentAt: { gte: since } } }),
    prisma.email.count({ where: { userId, status: "sent", clickedAt: { not: null }, sentAt: { gte: since } } }),
  ])

  const total = sent + failed
  const deliveryRate = total > 0 ? Math.round((sent / total) * 100) : null
  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : null
  const clickRate = sent > 0 ? Math.round((clicked / sent) * 100) : null
  const bounceRate = total > 0 ? Math.round((failed / total) * 100) : null

  // Daily breakdown for the chart (last `days` days)
  const dailyRaw = await prisma.email.findMany({
    where: { userId, status: { in: ["sent", "failed"] }, sentAt: { gte: since } },
    select: { status: true, sentAt: true, openedAt: true },
  })

  const dailyMap: Record<string, { sent: number; failed: number; opened: number }> = {}
  for (const e of dailyRaw) {
    const day = (e.sentAt ?? new Date()).toISOString().slice(0, 10)
    if (!dailyMap[day]) dailyMap[day] = { sent: 0, failed: 0, opened: 0 }
    if (e.status === "sent") dailyMap[day].sent++
    if (e.status === "failed") dailyMap[day].failed++
    if (e.openedAt) dailyMap[day].opened++
  }

  const daily = Object.entries(dailyMap)
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({
    period: days,
    totals: { sent, failed, opened, clicked, total },
    rates: { deliveryRate, openRate, clickRate, bounceRate },
    daily,
  })
})
