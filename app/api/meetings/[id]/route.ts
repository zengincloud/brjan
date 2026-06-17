import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

type Params = { params: { id: string } }

// GET /api/meetings/:id — full detail including transcript
export const GET = withAuth(async (_req: NextRequest, userId: string, { params }: Params) => {
  const meeting = await prisma.meeting.findFirst({
    where: { id: params.id, userId },
    include: {
      prospect: { select: { id: true, name: true, email: true, title: true } },
      account: { select: { id: true, name: true } },
    },
  })
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(meeting)
})

// PATCH /api/meetings/:id — link prospect/account, update title
export const PATCH = withAuth(async (req: NextRequest, userId: string, { params }: Params) => {
  const meeting = await prisma.meeting.findFirst({ where: { id: params.id, userId } })
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if ("prospectId" in body) data.prospectId = body.prospectId || null
  if ("accountId" in body) data.accountId = body.accountId || null
  if ("title" in body && body.title?.trim()) data.title = body.title.trim()

  // Auto-set accountId from prospect if not provided
  if (data.prospectId && !data.accountId) {
    const prospect = await prisma.prospect.findUnique({
      where: { id: data.prospectId as string },
      select: { accountId: true },
    })
    if (prospect?.accountId) data.accountId = prospect.accountId
  }

  const updated = await prisma.meeting.update({
    where: { id: params.id },
    data,
    include: {
      prospect: { select: { id: true, name: true, email: true } },
      account: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(updated)
})
