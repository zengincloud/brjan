import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (_request: NextRequest, userId: string) => {
  const todos = await prisma.todo.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ todos })
})

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  const { title } = await request.json()
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }
  const todo = await prisma.todo.create({
    data: { title: title.trim(), userId },
  })
  return NextResponse.json({ todo })
})
