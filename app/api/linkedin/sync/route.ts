import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import { getChats, getChatMessages, getChatAttendees, normalizeLinkedInUrl } from "@/lib/unipile"

export const dynamic = "force-dynamic"

export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { unipileAccountId: true },
    })

    if (!user?.unipileAccountId) {
      return NextResponse.json({ error: "LinkedIn not connected" }, { status: 400 })
    }

    const accountId = user.unipileAccountId

    // Fetch all user's existing prospects that have a LinkedIn URL (for matching)
    const prospects = await prisma.prospect.findMany({
      where: { userId, linkedin: { not: null } },
      select: { id: true, name: true, company: true, linkedin: true },
    })

    // Build lookup maps for matching
    const urlToProspect = new Map<string, string>() // normalized URL → prospectId
    const nameCompanyToProspect = new Map<string, string>() // "name||company" → prospectId

    for (const p of prospects) {
      if (p.linkedin) {
        urlToProspect.set(normalizeLinkedInUrl(p.linkedin), p.id)
      }
      if (p.name && p.company) {
        nameCompanyToProspect.set(`${p.name.toLowerCase()}||${p.company.toLowerCase()}`, p.id)
      }
    }

    // Fetch chats from Unipile
    let allChats: any[] = []
    let cursor: string | undefined

    do {
      const res = await getChats(accountId, cursor)
      const items = res.items || res.chats || []
      allChats = allChats.concat(items)
      cursor = res.cursor || res.next_cursor
    } while (cursor && allChats.length < 500) // Safety cap

    let synced = 0
    let matched = 0
    let unmatched = 0

    for (const chat of allChats) {
      try {
        // Get attendees to find participant info
        const attendeesRes = await getChatAttendees(chat.id)
        const attendees = attendeesRes.items || attendeesRes.attendees || []

        // Find the other participant (not the account owner)
        const participant = attendees.find((a: any) => !a.is_me) || attendees[0]
        if (!participant) continue

        const participantLinkedin = participant.provider_url || participant.linkedin_url || null
        const participantName = participant.display_name || participant.name || "Unknown"
        const participantTitle = participant.headline || participant.title || null
        const participantAvatar = participant.picture_url || participant.avatar || null

        // Try to match to an existing prospect
        let prospectId: string | null = null
        let matchStatus: "auto_matched" | "unmatched" = "unmatched"

        if (participantLinkedin) {
          const normalized = normalizeLinkedInUrl(participantLinkedin)
          const found = urlToProspect.get(normalized)
          if (found) {
            prospectId = found
            matchStatus = "auto_matched"
          }
        }

        // Fallback: name + company exact match
        if (!prospectId && participantName) {
          const company = participant.company_name || participant.company || ""
          if (company) {
            const key = `${participantName.toLowerCase()}||${company.toLowerCase()}`
            const found = nameCompanyToProspect.get(key)
            if (found) {
              prospectId = found
              matchStatus = "auto_matched"
            }
          }
        }

        // Upsert the conversation using a placeholder linkedinThreadId if none
        const threadId = chat.id // Use Unipile chat ID as the thread identifier

        const conversation = await prisma.linkedInConversation.upsert({
          where: { userId_linkedinThreadId: { userId, linkedinThreadId: threadId } },
          create: {
            userId,
            linkedinThreadId: threadId,
            unipileThreadId: chat.id,
            participantName,
            participantTitle,
            participantAvatar,
            participantLinkedin,
            lastMessageText: chat.last_message?.text || null,
            lastMessageAt: chat.last_message?.created_at ? new Date(chat.last_message.created_at) : null,
            unreadCount: chat.unread_count || 0,
            matchStatus,
            prospectId,
          },
          update: {
            unipileThreadId: chat.id,
            participantName,
            participantTitle,
            participantAvatar,
            participantLinkedin,
            lastMessageText: chat.last_message?.text || null,
            lastMessageAt: chat.last_message?.created_at ? new Date(chat.last_message.created_at) : null,
            unreadCount: chat.unread_count || 0,
            // Only update match status if currently unmatched
            ...(matchStatus === "auto_matched" ? { matchStatus, prospectId } : {}),
          },
        })

        // Sync last 20 messages
        try {
          const msgRes = await getChatMessages(chat.id)
          const messages = (msgRes.items || msgRes.messages || []).slice(0, 20)

          for (const msg of messages) {
            const msgId = msg.id || null
            const isOutbound = msg.is_sender || msg.direction === "outbound"

            await prisma.linkedInMessage.upsert({
              where: { conversationId_linkedinMsgId: { conversationId: conversation.id, linkedinMsgId: msgId || `${conversation.id}-${msg.created_at}` } },
              create: {
                conversationId: conversation.id,
                linkedinMsgId: msgId,
                direction: isOutbound ? "outbound" : "inbound",
                body: msg.text || msg.body || "",
                senderName: isOutbound ? "You" : participantName,
                status: "delivered",
                sentAt: msg.created_at ? new Date(msg.created_at) : new Date(),
              },
              update: {},
            })
          }
        } catch {
          // Don't fail the whole sync if messages fail for one chat
        }

        synced++
        if (matchStatus === "auto_matched") matched++
        else unmatched++
      } catch (err) {
        console.error("Error syncing chat:", chat.id, err)
      }
    }

    return NextResponse.json({ synced, matched, unmatched })
  } catch (error: any) {
    console.error("LinkedIn sync error:", error)
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 })
  }
})
