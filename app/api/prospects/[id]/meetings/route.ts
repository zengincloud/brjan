import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

type Params = { params: { id: string } }

export const GET = withAuth(async (_req: NextRequest, userId: string, { params }: Params) => {
  const prospect = await prisma.prospect.findFirst({
    where: { id: params.id, userId },
    select: { id: true, email: true },
  })
  if (!prospect) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Meetings directly linked to this prospect
  const linked = await prisma.meeting.findMany({
    where: { userId, prospectId: prospect.id },
    orderBy: { startedAt: "desc" },
    select: {
      id: true, title: true, startedAt: true, endedAt: true, duration: true,
      summary: true, actionItems: true, attendees: true, meetingUrl: true,
      prospectId: true, accountId: true,
      prospect: { select: { id: true, name: true } },
      account: { select: { id: true, name: true } },
    },
  })

  // Meetings where prospect's email appears in attendees JSON (not yet linked)
  let byEmail: typeof linked = []
  if (prospect.email) {
    const all = await prisma.meeting.findMany({
      where: { userId, prospectId: null },
      orderBy: { startedAt: "desc" },
      select: {
        id: true, title: true, startedAt: true, endedAt: true, duration: true,
        summary: true, actionItems: true, attendees: true, meetingUrl: true,
        prospectId: true, accountId: true,
        prospect: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
      },
    })
    const email = prospect.email.toLowerCase()
    byEmail = all.filter((m) => {
      const attendees = m.attendees as { email?: string }[] | null
      return attendees?.some((a) => a.email?.toLowerCase() === email)
    })
  }

  const seen = new Set(linked.map((m) => m.id))
  const meetings = [...linked, ...byEmail.filter((m) => !seen.has(m.id))]
  return NextResponse.json(meetings)
})
