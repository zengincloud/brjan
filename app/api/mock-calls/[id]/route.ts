import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

export const GET = withAuth<{ params: { id: string } }>(
  async (_request: NextRequest, userId: string, context) => {
    const { id } = context!.params

    const mockCall = await prisma.mockCall.findUnique({
      where: { id, userId },
    })

    if (!mockCall) {
      return NextResponse.json({ error: "Mock call not found" }, { status: 404 })
    }

    return NextResponse.json({ mockCall })
  }
)
