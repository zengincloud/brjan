import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

// GET /api/meeting-templates
export const GET = withAuth(async (_req: NextRequest, userId: string) => {
  const templates = await prisma.meetingTemplate.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(templates)
})

// POST /api/meeting-templates
export const POST = withAuth(async (req: NextRequest, userId: string) => {
  const { name, description } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }
  const template = await prisma.meetingTemplate.create({
    data: { userId, name: name.trim(), description: description ?? "" },
  })
  return NextResponse.json(template, { status: 201 })
})
