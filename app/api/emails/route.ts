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

    const emails = await prisma.email.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit) : undefined,
      select: {
        id: true,
        to: true,
        from: true,
        subject: true,
        bodyText: true,
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
    })

    return NextResponse.json({ emails })
  } catch (error: any) {
    console.error("Error fetching emails:", error)
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    )
  }
})
