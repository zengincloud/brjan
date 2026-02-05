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

    const calls = await prisma.call.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit) : undefined,
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
          },
        },
      },
    })

    return NextResponse.json({ calls })
  } catch (error: any) {
    console.error("Error fetching calls:", error)
    return NextResponse.json(
      { error: "Failed to fetch calls" },
      { status: 500 }
    )
  }
})
