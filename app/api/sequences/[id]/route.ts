import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// GET /api/sequences/[id] - Get single sequence with steps
export const GET = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    const sequence = await prisma.sequence.findUnique({
      where: {
        id: params.id,
        userId,
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        },
        prospectSequences: {
          include: {
            prospect: {
              select: {
                id: true,
                name: true,
                email: true,
                company: true,
                title: true,
              }
            }
          }
        },
        accountSequences: {
          include: {
            account: {
              select: {
                id: true,
                name: true,
                industry: true,
                location: true,
              }
            }
          }
        },
        _count: {
          select: {
            prospectSequences: true,
            accountSequences: true,
          }
        }
      },
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    return NextResponse.json({ sequence })
  } catch (error: any) {
    console.error("Error fetching sequence:", error)
    return NextResponse.json(
      { error: "Failed to fetch sequence" },
      { status: 500 }
    )
  }
})

// PATCH /api/sequences/[id] - Update sequence
export const PATCH = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    const body = await request.json()
    const { name, description, status, isActive } = body

    const sequence = await prisma.sequence.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    const updatedSequence = await prisma.sequence.update({
      where: {
        id: params.id,
        userId,
      },
      data: {
        name,
        description,
        status,
        isActive,
        updatedAt: new Date(),
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        },
      }
    })

    return NextResponse.json({ sequence: updatedSequence })
  } catch (error: any) {
    console.error("Error updating sequence:", error)
    return NextResponse.json(
      { error: "Failed to update sequence" },
      { status: 500 }
    )
  }
})

// DELETE /api/sequences/[id] - Delete sequence
export const DELETE = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  try {
    const sequence = await prisma.sequence.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    await prisma.sequence.delete({
      where: {
        id: params.id,
        userId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting sequence:", error)
    return NextResponse.json(
      { error: "Failed to delete sequence" },
      { status: 500 }
    )
  }
})
