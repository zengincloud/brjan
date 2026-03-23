import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import { deleteAccount } from "@/lib/unipile"

export const DELETE = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { unipileAccountId: true },
    })

    if (user?.unipileAccountId) {
      try {
        await deleteAccount(user.unipileAccountId)
      } catch {
        // Best-effort — still clear locally even if Unipile fails
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { unipileAccountId: null },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error disconnecting LinkedIn:", error)
    return NextResponse.json({ error: error.message || "Failed to disconnect" }, { status: 500 })
  }
})
