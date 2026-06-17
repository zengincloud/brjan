import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

// PATCH /api/meeting-templates/:id
export const PATCH = withAuth(async (req: NextRequest, userId: string, { params }: { params: { id: string } }) => {
  const { name, description } = await req.json()
  const template = await prisma.meetingTemplate.findFirst({ where: { id: params.id, userId } })
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.meetingTemplate.update({
    where: { id: params.id },
    data: {
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  })
  return NextResponse.json(updated)
})

// DELETE /api/meeting-templates/:id
export const DELETE = withAuth(async (_req: NextRequest, userId: string, { params }: { params: { id: string } }) => {
  const template = await prisma.meetingTemplate.findFirst({ where: { id: params.id, userId } })
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.meetingTemplate.delete({ where: { id: params.id } })
  return NextResponse.json({ deleted: true })
})
