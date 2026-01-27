import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

// GET /api/prospects/[id] - Get single prospect
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prospect = await prisma.prospect.findFirst({
      where: {
        id: params.id,
        userId: user.id, // Verify ownership
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    return NextResponse.json({ prospect })
  } catch (error: any) {
    console.error("Error fetching prospect:", error)
    return NextResponse.json({ error: "Failed to fetch prospect" }, { status: 500 })
  }
}

// PATCH /api/prospects/[id] - Update prospect
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, title, company, location, linkedin, status } = body

    // Check if prospect exists and belongs to user
    const existingProspect = await prisma.prospect.findFirst({
      where: {
        id: params.id,
        userId: user.id, // Verify ownership
      },
    })

    if (!existingProspect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    // Validation
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    // Check if email is being changed and if new email already exists for this user
    if (email !== existingProspect.email) {
      const emailExists = await prisma.prospect.findFirst({
        where: {
          email,
          userId: user.id,
        },
      })

      if (emailExists) {
        return NextResponse.json({ error: "Email already exists for another prospect" }, { status: 400 })
      }
    }

    // Update prospect
    const updatedProspect = await prisma.prospect.update({
      where: { id: params.id },
      data: {
        name,
        email,
        phone: phone || null,
        title: title || null,
        company: company || null,
        location: location || null,
        linkedin: linkedin || null,
        status: status || existingProspect.status,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ prospect: updatedProspect })
  } catch (error: any) {
    console.error("Error updating prospect:", error)
    return NextResponse.json(
      {
        error: "Failed to update prospect",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/prospects/[id] - Delete prospect
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prospect = await prisma.prospect.findFirst({
      where: {
        id: params.id,
        userId: user.id, // Verify ownership
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    await prisma.prospect.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting prospect:", error)
    return NextResponse.json({ error: "Failed to delete prospect" }, { status: 500 })
  }
}
