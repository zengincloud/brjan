import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import sgMail from "@sendgrid/mail"
import { sendEmailViaGmail } from "@/lib/gmail/send"
import { advanceSequenceStep } from "@/lib/sequences"

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
    const fromEmail = useGmail
      ? gmailIntegration.gmailEmail
      : SENDGRID_FROM_EMAIL

    // Validate that we have at least one email provider configured
    if (!useGmail && !SENDGRID_API_KEY) {
      return NextResponse.json(
        { error: "No email provider configured. Please connect Gmail or configure SendGrid." },
        { status: 500 }
      )
    }

    // Create email record in database
    const emailRecord = await prisma.email.create({
      data: {
        userId,
        to,
        cc,
        bcc,
        from: fromEmail,
        subject,
        bodyText,
        bodyHtml,
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

      if (useGmail) {
        // Send via Gmail
        const result = await sendEmailViaGmail(userId, {
          to,
          cc,
          bcc,
          subject,
          bodyText,
          bodyHtml,
          from: gmailIntegration.gmailEmail,
        })
        externalId = result.messageId
      } else {
        // Send via SendGrid
        const msg: any = {
          to,
          from: SENDGRID_FROM_EMAIL,
          subject,
          text: bodyText,
        }

        if (cc) msg.cc = cc
        if (bcc) msg.bcc = bcc
        if (bodyHtml) msg.html = bodyHtml

        const [response] = await sgMail.send(msg)
        externalId = response.headers["x-message-id"] as string
      }

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

      // If Gmail fails and SendGrid is available, try fallback
      if (useGmail && SENDGRID_API_KEY && !preferSendGrid) {
        console.log("Gmail send failed, attempting SendGrid fallback...")

        try {
          const msg: any = {
            to,
            from: SENDGRID_FROM_EMAIL,
            subject,
            text: bodyText,
          }

          if (cc) msg.cc = cc
          if (bcc) msg.bcc = bcc
          if (bodyHtml) msg.html = bodyHtml

          const [response] = await sgMail.send(msg)

          await prisma.email.update({
            where: { id: emailRecord.id },
            data: {
              status: "sent",
              sentAt: new Date(),
              from: SENDGRID_FROM_EMAIL,
              sendgridId: response.headers["x-message-id"] as string,
              metadata: {
                ...(metadata || {}),
                sentVia: "sendgrid",
                gmailFallback: true,
                gmailError: sendError.message,
              },
            },
          })

          if (prospectId) {
            await prisma.prospect.update({
              where: { id: prospectId },
              data: {
                lastActivity: new Date(),
                status: "contacted",
              },
            })
          }

          // Advance sequence on fallback success too
          let sequenceAdvanced = null
          const sequenceId = metadata?.sequenceId
          if (sequenceId && prospectId) {
            const advanceResult = await advanceSequenceStep(prospectId, sequenceId, userId)
            if (advanceResult.success) {
              sequenceAdvanced = {
                completed: advanceResult.completed,
                nextStep: advanceResult.nextStep,
              }
            }
          }

          return NextResponse.json({
            success: true,
            emailId: emailRecord.id,
            externalId: response.headers["x-message-id"],
            sentVia: "sendgrid",
            fallback: true,
            sequenceAdvanced,
          })
        } catch (fallbackError: any) {
          console.error("SendGrid fallback also failed:", fallbackError)
        }
      }

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
