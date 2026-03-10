import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withExtensionAuth } from "@/lib/auth/extension-middleware"

export const dynamic = 'force-dynamic'

// GET /api/extension/linkedin-templates?participantName=John+Doe
export const GET = withExtensionAuth(async (request: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(request.url)
    const participantName = searchParams.get("participantName")

    // Fetch all active templates
    const templates = await prisma.linkedinTemplate.findMany({
      where: { userId, isActive: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        body: true,
        category: true,
      },
    })

    // Optionally resolve prospect data for variable substitution
    let prospect: {
      name: string
      email?: string | null
      company?: string | null
      title?: string | null
      phone?: string | null
    } | null = null

    if (participantName) {
      // Strategy 1: Look up via linked conversation -> prospect
      const conversation = await prisma.linkedInConversation.findFirst({
        where: {
          userId,
          participantName: { contains: participantName, mode: "insensitive" },
        },
        include: {
          prospect: {
            select: {
              name: true,
              email: true,
              company: true,
              title: true,
              phone: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      })

      if (conversation?.prospect) {
        prospect = conversation.prospect
      } else {
        // Strategy 2: Direct prospect name match
        const directMatch = await prisma.prospect.findFirst({
          where: {
            userId,
            name: { contains: participantName, mode: "insensitive" },
          },
          select: {
            name: true,
            email: true,
            company: true,
            title: true,
            phone: true,
          },
          orderBy: { updatedAt: "desc" },
        })
        if (directMatch) {
          prospect = directMatch
        }
      }

      // Strategy 3: Fallback stub from participant name
      if (!prospect) {
        prospect = { name: participantName }
      }
    }

    return NextResponse.json({ templates, prospect })
  } catch (error: any) {
    console.error("Extension linkedin-templates error:", error)
    return NextResponse.json(
      { error: "Failed to fetch linkedin templates" },
      { status: 500 }
    )
  }
})
