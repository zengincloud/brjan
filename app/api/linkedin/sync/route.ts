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

    // Fetch ALL prospects for matching (URL + name/company fallback)
    const prospects = await prisma.prospect.findMany({
      where: { userId },
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

    // Only fetch 1 page (50 most recent chats) — sync is fast, not exhaustive
    const res = await getChats(accountId)
    allChats = res.items || res.chats || []

    let synced = 0
    let matched = 0
    let unmatched = 0

    for (const chat of allChats) {
      try {
        // Try to get attendees from the chat object first (avoids a separate API call per chat)
        // Unipile sometimes embeds attendees in the chat list response
        let attendees: any[] = chat.attendees || chat.participants || chat.members || []

        if (attendees.length === 0) {
          // Fall back to separate API call only if not embedded
          const attendeesRes = await getChatAttendees(chat.id, accountId)
          attendees = attendeesRes.items || attendeesRes.attendees || []
        }

        // Find the other participant (not the account owner)
        const participant = attendees.find((a: any) => !a.is_me) || attendees[0]
        if (!participant) continue

        const participantLinkedin = participant.provider_url || participant.linkedin_url || null
        // display_name from Unipile can include status/headline ("Name Status is offline Job @ Co")
        // prefer `name` field; if only display_name, strip everything after "Status is"
        const rawName = participant.name || participant.display_name || "Unknown"
        const participantName = rawName.replace(/\s+Status is\s.*/i, "").trim()
        const participantTitle = participant.headline || participant.occupation || participant.title || null
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

        const threadId = chat.id

        // Check if an existing conversation already exists for this participant
        // (could have been created by Chrome extension with a different threadId)
        const existingByLinkedin = participantLinkedin
          ? await prisma.linkedInConversation.findFirst({
              where: { userId, participantLinkedin },
            })
          : null

        // Fallback: match by first name against Chrome extension convos with no LinkedIn URL
        // (extension often doesn't capture the LinkedIn URL, leaving participantLinkedin null)
        const firstName = participantName.split(" ")[0]
        const existingByName = !existingByLinkedin && firstName
          ? await prisma.linkedInConversation.findFirst({
              where: {
                userId,
                participantLinkedin: null,
                participantName: { contains: firstName, mode: "insensitive" },
              },
            })
          : null

        const existingToUpdate = existingByLinkedin || existingByName

        // If found by LinkedIn URL or name but with a different threadId, update it rather than duplicate
        if (existingToUpdate && existingToUpdate.linkedinThreadId !== threadId) {
          await prisma.linkedInConversation.update({
            where: { id: existingToUpdate.id },
            data: {
              linkedinThreadId: threadId,
              unipileThreadId: chat.id,
              participantName,
              participantTitle,
              participantAvatar,
              participantLinkedin,
              lastMessageText: chat.last_message?.text || existingToUpdate.lastMessageText,
              lastMessageAt: chat.last_message?.created_at ? new Date(chat.last_message.created_at) : existingToUpdate.lastMessageAt,
              unreadCount: chat.unread_count || 0,
              ...(matchStatus === "auto_matched" ? { matchStatus, prospectId } : {}),
            },
          })
          synced++
          if (matchStatus === "auto_matched") matched++
          else unmatched++
          continue
        }

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

        synced++
        if (matchStatus === "auto_matched") matched++
        else unmatched++
      } catch (err) {
        console.error("Error syncing chat:", chat.id, err)
      }
    }

    // One-time cleanup: merge orphan Chrome extension conversations into matched Unipile ones
    // Find all conversations with a participantLinkedin set, then absorb any same-name orphans
    try {
      const withUrl = await prisma.linkedInConversation.findMany({
        where: { userId, participantLinkedin: { not: null } },
        select: { id: true, participantName: true },
      })
      for (const conv of withUrl) {
        const firstName = conv.participantName.split(" ")[0]
        if (!firstName) continue
        const orphans = await prisma.linkedInConversation.findMany({
          where: {
            userId,
            participantLinkedin: null,
            id: { not: conv.id },
            participantName: { contains: firstName, mode: "insensitive" },
          },
          select: { id: true },
        })
        for (const orphan of orphans) {
          await prisma.linkedInMessage.updateMany({
            where: { conversationId: orphan.id },
            data: { conversationId: conv.id },
          })
          await prisma.linkedInConversation.delete({ where: { id: orphan.id } })
        }
      }
    } catch {
      // Don't fail if cleanup fails
    }

    return NextResponse.json({ synced, matched, unmatched })
  } catch (error: any) {
    console.error("LinkedIn sync error:", error)
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 })
  }
})
