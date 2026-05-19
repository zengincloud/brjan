import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const PATCH = withAuth<{ params: { id: string } }>(async (request: NextRequest, userId: string, context) => {
  const { id } = context!.params
  const body = await request.json()
  const result = await prisma.todo.updateMany({
    where: { id, userId },
    data: {
      ...(body.completed !== undefined && { completed: body.completed }),
      ...(body.title !== undefined && { title: body.title }),
    },
  })
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const todo = await prisma.todo.findUnique({ where: { id } })
  return NextResponse.json({ todo })
})

export const DELETE = withAuth<{ params: { id: string } }>(async (_request: NextRequest, userId: string, context) => {
  const { id } = context!.params
  await prisma.todo.deleteMany({ where: { id, userId } })
  return NextResponse.json({ success: true })
})
