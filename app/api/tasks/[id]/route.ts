import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { advanceSequenceStep } from "@/lib/sequences"

export const dynamic = 'force-dynamic'

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

// PATCH handler with auth to support sequence advancement
export const PATCH = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  const body = await request.json()
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = params
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
    // Get the task first to check for sequence info
    const existingTask = await prisma.task.findFirst({
      where: { id, userId },
    })

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Update the task
    const task = await prisma.task.update({
      where: { id },
      data,
    })

    // If task is being marked as done and it's part of a sequence, advance the sequence
    let sequenceAdvanced = null
    if (status === "done" && existingTask.status !== "done") {
      const contact = existingTask.contact as any
      if (contact?.sequenceId && contact?.prospectId) {
        console.log(`Task completed for sequence ${contact.sequenceName}, advancing prospect ${contact.prospectId}`)

        const advanceResult = await advanceSequenceStep(
          contact.prospectId,
          contact.sequenceId,
          userId
        )

        if (advanceResult.success) {
          sequenceAdvanced = {
            completed: advanceResult.completed,
            nextStep: advanceResult.nextStep,
          }
          console.log(`Sequence advanced:`, advanceResult)
        } else {
          console.error(`Failed to advance sequence:`, advanceResult.error)
        }
      }
    }

    return NextResponse.json({
      task: serializeTask(task),
      sequenceAdvanced,
    })
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }
})

export const DELETE = withAuth(async (request: NextRequest, userId: string, context?: { params: { id: string } }) => {
  const id = context?.params?.id

  if (!id) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
  }

  try {
    // Verify task belongs to user before deleting
    const task = await prisma.task.findFirst({
      where: { id, userId },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    await prisma.task.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
})
