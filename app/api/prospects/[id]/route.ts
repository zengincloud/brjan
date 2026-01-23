import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/prospects/[id] - Get a single prospect
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prospect = await prisma.prospect.findUnique({
      where: { id: params.id },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    return NextResponse.json({ prospect })
  } catch (error) {
    console.error("Error fetching prospect:", error)
    return NextResponse.json({ error: "Failed to fetch prospect" }, { status: 500 })
  }
}

// PATCH /api/prospects/[id] - Update a prospect
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()

    const prospect = await prisma.prospect.update({
      where: { id: params.id },
      data: {
        ...body,
        lastActivity: new Date(),
      },
    })

    return NextResponse.json({ prospect })
  } catch (error: any) {
    console.error("Error updating prospect:", error)

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    if (error.code === "P2002") {
      return NextResponse.json({ error: "A prospect with this email already exists" }, { status: 409 })
    }

    return NextResponse.json({ error: "Failed to update prospect" }, { status: 500 })
  }
}

// DELETE /api/prospects/[id] - Delete a prospect
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.prospect.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting prospect:", error)

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    return NextResponse.json({ error: "Failed to delete prospect" }, { status: 500 })
  }
}
