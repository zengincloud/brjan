import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const bodySchema = z.object({
  to: z.string().email(),
  name: z.string().optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
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

const serializeTask = (task: {
  id: string
  title: string
  description: string
  type: string
  status: string
  priority: string
  dueDate: Date | null
  createdAt: Date
  contact: unknown
  company: unknown
}) => ({
  ...task,
  dueDate: task.dueDate ? task.dueDate.toISOString() : null,
  createdAt: task.createdAt.toISOString(),
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
      type: "email_sent",
      taskId: id,
      meta: {
        to: parsed.data.to,
        name: parsed.data.name,
        subject: parsed.data.subject,
        body: parsed.data.body,
      },
    },
  })

  return NextResponse.json({ event: serializeEvent(event), task: serializeTask(task) })
}
