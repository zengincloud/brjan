import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { unipileAccountId: true },
  })

  return NextResponse.json({
    connected: !!user?.unipileAccountId,
    accountId: user?.unipileAccountId || null,
  })
})
