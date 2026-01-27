import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

// GET /api/prospects - Get all prospects
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const sequence = searchParams.get("sequence")
    const status = searchParams.get("status")

    const where: any = {
      userId, // Filter by current user
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
      ]
    }

    if (sequence) {
      where.sequence = sequence
    }

    if (status) {
      where.status = status
    }

    const prospects = await prisma.prospect.findMany({
      where,
      orderBy: { lastActivity: "desc" },
    })

    return NextResponse.json({ prospects })
  } catch (error) {
    console.error("Error fetching prospects:", error)
    return NextResponse.json({ error: "Failed to fetch prospects" }, { status: 500 })
  }
})

// POST /api/prospects - Create a new prospect
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()

    const { name, email, title, company, phone, location, linkedin, status, sequence, sequenceStep, pdlData } = body

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    const prospect = await prisma.prospect.create({
      data: {
        name,
        email,
        title,
        company,
        phone,
        location,
        linkedin,
        status,
        sequence,
        sequenceStep,
        pdlData,
        userId, // Associate with current user
      },
    })

    return NextResponse.json({ prospect }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating prospect:", error)

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A prospect with this email already exists" }, { status: 409 })
    }

    return NextResponse.json({ error: "Failed to create prospect" }, { status: 500 })
  }
})
