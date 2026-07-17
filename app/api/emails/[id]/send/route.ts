import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { TRIAL_LIMITS } from "@/lib/trial-limits"
import { sendEmailViaGmail } from "@/lib/gmail/send"
import { advanceSequenceStep } from "@/lib/sequences"

export const dynamic = "force-dynamic"

// POST /api/emails/[id]/send - Send an existing (draft) email in place.
// If the email belongs to a sequence step, advances the prospect to the next step on success.
export const POST = withAuth<{ params: { id: string } }>(async (
  request: NextRequest,
  userId: string,
  context
) => {
  const { params } = context!

  try {
    if (!TRIAL_LIMITS.emailsAllowed) {
      const emailUser = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true, role: true } })
      if (emailUser?.tier === "trial" && emailUser?.role !== "super_admin") {
        return NextResponse.json(
          { error: "You've run out of credits. Email sending requires an upgraded plan." },
          { status: 403 }
        )
      }
    }

    const body = await request.json().catch(() => ({}))
    const { subject, bodyText, bodyHtml } = body as { subject?: string; bodyText?: string; bodyHtml?: string }

    const email = await prisma.email.findFirst({ where: { id: params.id, userId } })
    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
    }
    if (email.status === "sent") {
      return NextResponse.json({ error: "This email has already been sent" }, { status: 400 })
    }

    const gmailIntegration = await prisma.gmailIntegration.findUnique({ where: { userId } })
    if (!gmailIntegration?.isActive) {
      return NextResponse.json(
        { error: "No Gmail inbox connected. Please connect your Gmail account in Settings → Integrations before sending emails." },
        { status: 400 }
      )
    }

    const finalSubject = subject ?? email.subject
    const finalBodyText = bodyText ?? email.bodyText
    const finalBodyHtml = bodyHtml ?? email.bodyHtml ?? undefined

    // Persist any edits made in the review dialog before attempting to send
    await prisma.email.update({
      where: { id: email.id },
      data: {
        subject: finalSubject,
        bodyText: finalBodyText,
        bodyHtml: finalBodyHtml,
        status: "sending",
      },
    })

    try {
      const result = await sendEmailViaGmail(userId, {
        to: email.to,
        cc: email.cc || undefined,
        bcc: email.bcc || undefined,
        subject: finalSubject,
        bodyText: finalBodyText,
        bodyHtml: finalBodyHtml,
        from: gmailIntegration.gmailEmail,
      })

      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          sendgridId: result.messageId,
        },
      })

      if (email.prospectId) {
        await prisma.prospect.update({
          where: { id: email.prospectId },
          data: { lastActivity: new Date(), status: "contacted" },
        })
      }

      let sequenceAdvanced = null
      const meta = (email.metadata as any) || {}
      if (meta.sequenceId && email.prospectId) {
        const advanceResult = await advanceSequenceStep(email.prospectId, meta.sequenceId, userId)
        if (advanceResult.success) {
          sequenceAdvanced = { completed: advanceResult.completed, nextStep: advanceResult.nextStep }
        } else {
          console.error("Failed to advance sequence after send:", advanceResult.error)
        }
      }

      return NextResponse.json({ success: true, emailId: email.id, sequenceAdvanced })
    } catch (sendError: any) {
      console.error("Email send error:", sendError)
      await prisma.email.update({
        where: { id: email.id },
        data: { status: "failed", failureReason: sendError.message || "Unknown error" },
      })
      return NextResponse.json({ error: "Failed to send email", details: sendError.message }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error sending draft email:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
})
