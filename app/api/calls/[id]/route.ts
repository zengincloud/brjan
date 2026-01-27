import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// PATCH /api/calls/[id] - Update call outcome and notes
export const PATCH = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!;
  try {
    const body = await request.json()
    const { outcome, notes, duration, endedAt } = body

    const call = await prisma.call.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    // Update call with outcome, notes, duration, and completion status
    const updatedCall = await prisma.call.update({
      where: {
        id: params.id,
        userId,
      },
      data: {
        outcome,
        notes,
        duration,
        endedAt: endedAt ? new Date(endedAt) : undefined,
        status: "completed",
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ call: updatedCall })
  } catch (error: any) {
    console.error("Error updating call:", error)
    return NextResponse.json(
      { error: "Failed to update call" },
      { status: 500 }
    )
  }
})

// GET /api/calls/[id] - Get call details
export const GET = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!;
  try {
    const call = await prisma.call.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    return NextResponse.json({ call })
  } catch (error: any) {
    console.error("Error fetching call:", error)
    return NextResponse.json(
      { error: "Failed to fetch call" },
      { status: 500 }
    )
  }
})
