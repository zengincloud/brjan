import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const bodySchema = z.object({
  outcome: z.string().min(1),
  notes: z.string().optional(),
})

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

export async function POST(request: Request, context: { params: { id: string } }) {
  const parsed = bodySchema.safeParse(await request.json())

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = context.params
  const task = await prisma.task.findUnique({ where: { id } })

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  const event = await prisma.event.create({
    data: {
      type: "call_completed",
      taskId: id,
      meta: {
        outcome: parsed.data.outcome,
        notes: parsed.data.notes,
      },
    },
  })

  return NextResponse.json({ event: serializeEvent(event) })
}
