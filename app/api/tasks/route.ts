import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { TaskType, TaskStatus, TaskPriority } from "@prisma/client"

export const dynamic = 'force-dynamic'

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

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { title, description, type, priority, dueDate, contact, company } = body

    if (!title || !description || !type || !priority) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        type: type as TaskType,
        status: TaskStatus.to_do,
        priority: priority as TaskPriority,
        dueDate: dueDate ? new Date(dueDate) : null,
        contact: contact || null,
        company: company || null,
        userId,
      },
    })

    return NextResponse.json({ task: serializeTask(task) })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    )
  }
})

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  const { searchParams } = new URL(request.url)
  const view = searchParams.get("view")

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const baseWhere: any = {
    userId, // Filter by current user
  }

  const where =
    view === "today"
      ? {
          ...baseWhere,
          dueDate: { lte: endOfToday },
          status: { not: "done" },
        }
      : view === "overdue"
        ? {
            ...baseWhere,
            dueDate: { lt: startOfToday },
            status: { not: "done" },
          }
        : view === "upcoming"
          ? {
              ...baseWhere,
              dueDate: { gte: now, lte: sevenDaysOut },
              status: { not: "done" },
            }
          : baseWhere

  const orderBy: any =
    view === "today" || view === "overdue" || view === "upcoming" ? { dueDate: "asc" } : { id: "asc" }

  const tasks = await prisma.task.findMany({
    where,
    orderBy,
  })

  return NextResponse.json({ tasks: tasks.map(serializeTask) })
})
