import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { sendEmailViaGmail } from "@/lib/gmail/send"

export const dynamic = "force-dynamic"

export const POST = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!
  const { to, subject, bodyText } = await request.json()

  if (!to || !subject || !bodyText) {
    return NextResponse.json({ error: "to, subject, and bodyText are required" }, { status: 400 })
  }

  const meeting = await prisma.meeting.findUnique({
    where: { id: params.id, userId },
  })

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
  }

  const gmailIntegration = await prisma.gmailIntegration.findUnique({ where: { userId } })
  if (!gmailIntegration?.isActive) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 400 })
  }

  await sendEmailViaGmail(userId, {
    to,
    subject,
    bodyText,
    from: gmailIntegration.gmailEmail,
  })

  // Record the email and mark follow-up sent
  await Promise.all([
    prisma.email.create({
      data: {
        userId,
        to,
        from: gmailIntegration.gmailEmail,
        subject,
        bodyText,
        prospectId: meeting.prospectId,
        accountId: meeting.accountId,
        emailType: "one_off",
        status: "sent",
        sentAt: new Date(),
        metadata: { source: "meeting_followup", meetingId: meeting.id },
      },
    }),
    prisma.meeting.update({
      where: { id: meeting.id },
      data: { followUpSentAt: new Date() },
    }),
  ])

  return NextResponse.json({ success: true })
})
