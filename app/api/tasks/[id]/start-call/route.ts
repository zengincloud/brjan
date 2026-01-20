import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const serializeEvent = (event: {
  id: string
  type: string
  taskId: string
  createdAt: Date
  meta: unknown
}) => ({
  ...event,
  createdAt: event.createdAt.toISOString(),
})

export async function POST(_request: Request, context: { params: { id: string } }) {
  const { id } = context.params
  const task = await prisma.task.findUnique({ where: { id } })

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  const event = await prisma.event.create({
    data: {
      type: "call_started",
      taskId: id,
    },
  })

  return NextResponse.json({ event: serializeEvent(event) })
}
