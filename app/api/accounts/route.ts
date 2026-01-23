import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/accounts - Get all accounts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const sequence = searchParams.get("sequence")
    const status = searchParams.get("status")

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { industry: { contains: search } },
        { location: { contains: search } },
      ]
    }

    if (sequence) {
      where.sequence = sequence
    }

    if (status) {
      where.status = status
    }

    const accounts = await prisma.account.findMany({
      where,
      orderBy: { lastActivity: "desc" },
    })

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error("Error fetching accounts:", error)
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
  }
}

// POST /api/accounts - Create a new account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { name, industry, location, website, employees, status, sequence, sequenceStep, contacts } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const account = await prisma.account.create({
      data: {
        name,
        industry,
        location,
        website,
        employees: employees ? parseInt(employees) : null,
        status,
        sequence,
        sequenceStep,
        contacts: contacts ? parseInt(contacts) : 0,
      },
    })

    return NextResponse.json({ account }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating account:", error)

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json({ error: "An account with this name already exists" }, { status: 409 })
    }

    return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
  }
}
