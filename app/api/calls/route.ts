import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// GET /api/calls - Get all calls for the current user
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(request.url)
    const prospectId = searchParams.get("prospectId")
    const limit = searchParams.get("limit")
    const hasRecording = searchParams.get("hasRecording")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "50")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const whereClause: any = { userId }

    // Filter by prospectId if provided
    if (prospectId) {
      whereClause.prospectId = prospectId
    }

    // Filter by calls with recordings
    if (hasRecording === "true") {
      whereClause.recordingUrl = {
        not: null,
      }
    }

    // Server-side date filtering
    if (from || to) {
      whereClause.createdAt = {}
      if (from) whereClause.createdAt.gte = new Date(from)
      if (to) {
        const endOfDay = new Date(to)
        endOfDay.setHours(23, 59, 59, 999)
        whereClause.createdAt.lte = endOfDay
      }
    }

    const take = limit ? parseInt(limit) : pageSize
    const skip = limit ? undefined : (page - 1) * pageSize

    const [calls, totalCount] = await Promise.all([
      prisma.call.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          from: true,
          to: true,
          status: true,
          outcome: true,
          duration: true,
          notes: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
          recordingUrl: true,
          recordingDuration: true,
          transcription: true,
          transcriptionStatus: true,
          prospect: {
            select: {
              id: true,
              name: true,
              email: true,
              company: true,
              title: true,
              accountId: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.call.count({ where: whereClause }),
    ])

    return NextResponse.json({ calls, totalCount, page, pageSize })
  } catch (error: any) {
    console.error("Error fetching calls:", error)
    return NextResponse.json(
      { error: "Failed to fetch calls" },
      { status: 500 }
    )
  }
})
