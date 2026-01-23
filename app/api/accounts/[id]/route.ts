import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/accounts/[id] - Get a single account
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const account = await prisma.account.findUnique({
      where: { id: params.id },
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json({ account })
  } catch (error) {
    console.error("Error fetching account:", error)
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 })
  }
}

// PATCH /api/accounts/[id] - Update an account
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()

    const account = await prisma.account.update({
      where: { id: params.id },
      data: {
        ...body,
        lastActivity: new Date(),
      },
    })

    return NextResponse.json({ account })
  } catch (error: any) {
    console.error("Error updating account:", error)

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    if (error.code === "P2002") {
      return NextResponse.json({ error: "An account with this name already exists" }, { status: 409 })
    }

    return NextResponse.json({ error: "Failed to update account" }, { status: 500 })
  }
}

// DELETE /api/accounts/[id] - Delete an account
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.account.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting account:", error)

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
