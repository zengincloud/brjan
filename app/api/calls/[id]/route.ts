import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// PATCH /api/calls/[id] - Update call outcome and notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { outcome, notes } = body

    const call = await prisma.call.findUnique({
      where: { id: params.id },
    })

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    // Update call with outcome and notes
    const updatedCall = await prisma.call.update({
      where: { id: params.id },
      data: {
        outcome,
        notes,
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
}

// GET /api/calls/[id] - Get call details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const call = await prisma.call.findUnique({
      where: { id: params.id },
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
}
