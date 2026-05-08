import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withSuperAdmin } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

export const GET = withSuperAdmin(async (_request: NextRequest) => {
  const rooms = await prisma.salesfloorRoom.findMany({
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ rooms })
})

export const POST = withSuperAdmin(async (request: NextRequest) => {
  const body = await request.json()
  const { name, emoji } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "Room name is required" }, { status: 400 })
  }

  const room = await prisma.salesfloorRoom.create({
    data: {
      name: name.trim(),
      emoji: emoji || "🏠",
    },
  })

  return NextResponse.json({ room })
})
