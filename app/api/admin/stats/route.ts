import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withSuperAdmin } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

// GET /api/admin/stats - Platform-wide statistics
export const GET = withSuperAdmin(async (request: NextRequest, user) => {
  try {
    const [totalUsers, totalOrgs, totalCalls, totalEmails, totalProspects] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.call.count(),
      prisma.email.count(),
      prisma.prospect.count(),
    ])

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [recentCalls, recentEmails, recentUsers] = await Promise.all([
      prisma.call.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.email.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ])

    return NextResponse.json({
      stats: {
        totalUsers,
        totalOrgs,
        totalCalls,
        totalEmails,
        totalProspects,
        recentCalls,
        recentEmails,
        recentUsers,
      },
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
})
