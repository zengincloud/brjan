import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const PATCH = withAuth(async (request: NextRequest, userId: string, context?: any) => {
  const { id } = context?.params || {}
  const { prospectId } = await request.json()

  const conversation = await prisma.linkedInConversation.findFirst({
    where: { id, userId },
  })
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }

  if (prospectId) {
    // Verify prospect belongs to this user
    const prospect = await prisma.prospect.findFirst({
      where: { id: prospectId, userId },
      select: { id: true, name: true, company: true },
    })
    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    const updated = await prisma.linkedInConversation.update({
      where: { id },
      data: { prospectId, matchStatus: "manually_matched" },
      include: { prospect: { select: { id: true, name: true, company: true, title: true } } },
    })
    return NextResponse.json({ conversation: updated })
  } else {
    // Unmatch
    const updated = await prisma.linkedInConversation.update({
      where: { id },
      data: { prospectId: null, matchStatus: "unmatched" },
    })
    return NextResponse.json({ conversation: updated })
  }
})
