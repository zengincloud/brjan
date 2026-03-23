import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string, context?: any) => {
  const { id: prospectId } = context?.params || {}

  // Verify prospect belongs to user
  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, userId },
  })
  if (!prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
  }

  const conversations = await prisma.linkedInConversation.findMany({
    where: { prospectId, userId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      messages: {
        orderBy: { sentAt: "asc" },
        select: {
          id: true,
          direction: true,
          body: true,
          senderName: true,
          sentAt: true,
        },
      },
    },
  })

  return NextResponse.json({ conversations })
})
