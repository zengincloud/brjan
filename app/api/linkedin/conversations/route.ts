import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export const GET = withAuth(async (request: NextRequest, userId: string) => {
  const { searchParams } = new URL(request.url)
  const matchStatus = searchParams.get("matchStatus") // "unmatched" | "auto_matched" | "manually_matched" | null
  const tag = searchParams.get("tag")
  const search = searchParams.get("search")
  const sort = searchParams.get("sort") || "recent" // recent | oldest | unread

  const where: any = { userId }

  if (matchStatus) where.matchStatus = matchStatus
  if (tag) where.tags = { has: tag }
  if (search) {
    where.participantName = { contains: search, mode: "insensitive" }
  }

  const orderBy: any =
    sort === "unread"
      ? [{ unreadCount: "desc" }, { lastMessageAt: "desc" }]
      : sort === "oldest"
      ? { lastMessageAt: "asc" }
      : { lastMessageAt: "desc" }

  const conversations = await prisma.linkedInConversation.findMany({
    where,
    orderBy,
    include: {
      prospect: {
        select: { id: true, name: true, company: true, title: true },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { direction: true },
      },
    },
  })

  return NextResponse.json({
    conversations: conversations.map(({ messages, ...c }) => ({
      ...c,
      lastMessageDirection: messages?.[0]?.direction ?? null,
    })),
  })
})
