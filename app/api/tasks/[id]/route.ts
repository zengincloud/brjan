import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const statusEnum = z.enum(["to_do", "in_progress", "done"])
const priorityEnum = z.enum(["high", "medium", "low"])

const bodySchema = z
  .object({
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    dueDate: z.string().datetime().nullable().optional(),
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
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

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const body = await request.json()
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = context.params
  const { status, priority, dueDate, title, description } = parsed.data

  const data: {
    status?: "to_do" | "in_progress" | "done"
    priority?: "high" | "medium" | "low"
    dueDate?: Date | null
    title?: string
    description?: string
  } = {}

  if (status) data.status = status
  if (priority) data.priority = priority
  if (typeof dueDate !== "undefined") {
    data.dueDate = dueDate ? new Date(dueDate) : null
  }
  if (title) data.title = title
  if (description) data.description = description

  try {
    const task = await prisma.task.update({
      where: { id },
      data,
    })

    return NextResponse.json({ task: serializeTask(task) })
  } catch (error) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }
}
