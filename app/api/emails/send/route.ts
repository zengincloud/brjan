import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import sgMail from "@sendgrid/mail"

const prisma = new PrismaClient()

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@yourdomain.com"

if (!SENDGRID_API_KEY) {
  console.error("SENDGRID_API_KEY is not set in environment variables")
}

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY)
}

// POST /api/emails/send - Send an email via SendGrid
export async function POST(request: NextRequest) {
  try {
    if (!SENDGRID_API_KEY) {
      return NextResponse.json(
        { error: "SendGrid API key not configured" },
        { status: 500 }
      )
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
    } = body

    // Validation
    if (!to || !subject || !bodyText) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, bodyText" },
        { status: 400 }
      )
    }

    // Prepare email for SendGrid
    const msg: any = {
      to,
      from: SENDGRID_FROM_EMAIL,
      subject,
      text: bodyText,
    }

    // Add optional fields
    if (cc) msg.cc = cc
    if (bcc) msg.bcc = bcc
    if (bodyHtml) msg.html = bodyHtml

    // Create email record in database (draft status initially)
    const emailRecord = await prisma.email.create({
      data: {
        to,
        cc,
        bcc,
        from: SENDGRID_FROM_EMAIL,
        subject,
        bodyText,
        bodyHtml,
        prospectId,
        accountId,
        templateId,
        emailType,
        status: "sending",
        metadata,
      },
    })

    // Send email via SendGrid
    try {
      const [response] = await sgMail.send(msg)

      console.log("SendGrid response:", {
        statusCode: response.statusCode,
        headers: response.headers,
      })

      // Update email record with success status
      await prisma.email.update({
        where: { id: emailRecord.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          sendgridId: response.headers["x-message-id"] as string,
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

      return NextResponse.json({
        success: true,
        emailId: emailRecord.id,
        sendgridId: response.headers["x-message-id"],
        statusCode: response.statusCode,
      })
    } catch (sendError: any) {
      console.error("SendGrid send error:", sendError)

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
}
