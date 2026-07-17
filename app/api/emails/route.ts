import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

// GET /api/emails - Get all emails for the current user
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(request.url)
    const prospectId = searchParams.get("prospectId")
    const accountId = searchParams.get("accountId")
    const status = searchParams.get("status")
    const limit = searchParams.get("limit")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "50")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const whereClause: any = { userId }

    // Filter by prospectId if provided
    if (prospectId) {
      whereClause.prospectId = prospectId
    }

    // Filter by accountId if provided
    if (accountId) {
      whereClause.accountId = accountId
    }

    // Filter by status if provided
    if (status) {
      whereClause.status = status
    }

    // Server-side date filtering
    if (from || to) {
      const dateField = status === "sent" ? "sentAt" : "createdAt"
      whereClause[dateField] = {}
      if (from) whereClause[dateField].gte = new Date(from)
      if (to) {
        const endOfDay = new Date(to)
        endOfDay.setHours(23, 59, 59, 999)
        whereClause[dateField].lte = endOfDay
      }
    }

    const take = limit ? parseInt(limit) : pageSize
    const skip = limit ? undefined : (page - 1) * pageSize

    const [emails, totalCount] = await Promise.all([
      prisma.email.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          to: true,
          from: true,
          subject: true,
          bodyText: true,
          bodyHtml: true,
          status: true,
          emailType: true,
          sentAt: true,
          openedAt: true,
          clickedAt: true,
          createdAt: true,
          prospectId: true,
          accountId: true,
          metadata: true,
        },
      }),
      prisma.email.count({ where: whereClause }),
    ])

    return NextResponse.json({ emails, totalCount, page, pageSize })
  } catch (error: any) {
    console.error("Error fetching emails:", error)
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    )
  }
})
