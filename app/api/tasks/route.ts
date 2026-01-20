import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: { id: "asc" },
  })

  return NextResponse.json({ tasks: tasks.map(serializeTask) })
}
