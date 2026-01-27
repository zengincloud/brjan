import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

// GET /api/accounts/[id] - Get a single account
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { supabaseId: supabaseUser.id } })
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const account = await prisma.account.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
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
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { supabaseId: supabaseUser.id } })
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()

    // Verify ownership before updating
    const existingAccount = await prisma.account.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

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
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { supabaseId: supabaseUser.id } })
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Verify ownership before deleting
    const existingAccount = await prisma.account.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

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
