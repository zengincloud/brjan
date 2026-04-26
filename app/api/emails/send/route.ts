import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { TRIAL_LIMITS } from "@/lib/trial-limits"
import sgMail from "@sendgrid/mail"
import { sendEmailViaGmail } from "@/lib/gmail/send"
import { advanceSequenceStep } from "@/lib/sequences"
import { replaceEmailVariables } from "@/lib/template-variables"

export const dynamic = 'force-dynamic'

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM_EMAIL =
  process.env.SENDGRID_FROM_EMAIL || "noreply@yourdomain.com"

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY)
}

// POST /api/emails/send - Send an email (Gmail or SendGrid)
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    // Trial plan: email sending not allowed
    if (!TRIAL_LIMITS.emailsAllowed) {
      const emailUser = await prisma.user.findUnique({ where: { id: userId }, select: { tier: true, role: true } })
      if (emailUser?.tier === 'trial' && emailUser?.role !== 'super_admin') {
        return NextResponse.json(
          { error: "You've run out of credits. Email sending requires an upgraded plan." },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const {
      to,
      cc,
      bcc,
      subject,
      bodyText,
      bodyHtml,
      prospectId,
      accountId,
      templateId,
      emailType = "one_off",
      metadata,
      preferSendGrid = false, // Allow explicit SendGrid preference
    } = body

    // Validation
    if (!to || !subject || !bodyText) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, bodyText" },
        { status: 400 }
      )
    }

    // Check for Gmail integration
    const gmailIntegration = await prisma.gmailIntegration.findUnique({
      where: { userId },
    })

    const useGmail = gmailIntegration?.isActive && !preferSendGrid

    if (!useGmail) {
      return NextResponse.json(
        { error: "No Gmail inbox connected. Please connect your Gmail account in Settings → Integrations before sending emails." },
        { status: 400 }
      )
    }

    const fromEmail = gmailIntegration.gmailEmail

    // Replace template variables if we have a prospect
    let finalSubject = subject
    let finalBodyText = bodyText
    let finalBodyHtml = bodyHtml
    if (prospectId) {
      const prospect = await prisma.prospect.findUnique({
        where: { id: prospectId },
        select: { name: true, email: true, company: true, title: true, phone: true },
      })
      if (prospect) {
        finalSubject = replaceEmailVariables(subject, prospect)
        finalBodyText = replaceEmailVariables(bodyText, prospect)
        if (finalBodyHtml) {
          finalBodyHtml = replaceEmailVariables(bodyHtml, prospect)
        }
      }
    }

    // Create email record in database
    const emailRecord = await prisma.email.create({
      data: {
        userId,
        to,
        cc,
        bcc,
        from: fromEmail,
        subject: finalSubject,
        bodyText: finalBodyText,
        bodyHtml: finalBodyHtml,
        prospectId,
        accountId,
        templateId,
        emailType,
        status: "sending",
        metadata: {
          ...(metadata || {}),
          sentVia: useGmail ? "gmail" : "sendgrid",
        },
      },
    })

    try {
      let externalId: string | undefined

      const result = await sendEmailViaGmail(userId, {
        to,
        cc,
        bcc,
        subject: finalSubject,
        bodyText: finalBodyText,
        bodyHtml: finalBodyHtml,
        from: gmailIntegration.gmailEmail,
      })
      externalId = result.messageId

      // Update email record with success status
      await prisma.email.update({
        where: { id: emailRecord.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          sendgridId: externalId, // Reusing field for both Gmail and SendGrid IDs
        },
      })

      // Update prospect's last activity if applicable
      if (prospectId) {
        await prisma.prospect.update({
          where: { id: prospectId },
          data: {
            lastActivity: new Date(),
            status: "contacted",
          },
        })
      }

      // Advance sequence if this email was part of a sequence
      let sequenceAdvanced = null
      const sequenceId = metadata?.sequenceId
      if (sequenceId && prospectId) {
        console.log(`Email sent for sequence ${metadata?.sequenceName}, advancing prospect ${prospectId}`)
        const advanceResult = await advanceSequenceStep(prospectId, sequenceId, userId)
        if (advanceResult.success) {
          sequenceAdvanced = {
            completed: advanceResult.completed,
            nextStep: advanceResult.nextStep,
          }
          console.log(`Sequence advanced:`, advanceResult)
        } else {
          console.error(`Failed to advance sequence:`, advanceResult.error)
        }
      }

      return NextResponse.json({
        success: true,
        emailId: emailRecord.id,
        externalId,
        sentVia: useGmail ? "gmail" : "sendgrid",
        sequenceAdvanced,
      })
    } catch (sendError: any) {
      console.error("Email send error:", sendError)

      // Update email record with failure status
      await prisma.email.update({
        where: { id: emailRecord.id },
        data: {
          status: "failed",
          failureReason: sendError.message || "Unknown error",
        },
      })

      return NextResponse.json(
        {
          error: "Failed to send email",
          details: sendError.response?.body?.errors || sendError.message,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("Error in email send endpoint:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    )
  }
})
