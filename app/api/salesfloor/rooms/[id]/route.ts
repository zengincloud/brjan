import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withSuperAdmin } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

export const DELETE = withSuperAdmin(async (_request: NextRequest, _user, context: any) => {
  try {
    const { id } = await context.params
    await prisma.salesfloorRoom.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }
})
