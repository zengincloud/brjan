import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// POST /api/emails/queue - Queue an email for later sending
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const {
      to,
      subject,
      bodyText,
      bodyHtml,
      prospectId,
      prospectName,
      accountId,
      templateId,
    } = body

    // Validation
    if (!to || !subject || !bodyText) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, bodyText" },
        { status: 400 }
      )
    }

    // Get the user's email for the "from" field
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { gmailIntegration: true },
    })

    const fromEmail = user?.gmailIntegration?.gmailEmail || user?.email || "noreply@boilerroom.ai"

    // Create email record with draft status (queued for later)
    const emailRecord = await prisma.email.create({
      data: {
        userId,
        to,
        from: fromEmail,
        subject,
        bodyText,
        bodyHtml,
        prospectId,
        accountId,
        templateId,
        emailType: "one_off",
        status: "draft", // Draft status means it's saved but not sent
        metadata: {
          queuedAt: new Date().toISOString(),
          prospectName: prospectName || null,
          source: "dialer",
        },
      },
    })

    return NextResponse.json({
      success: true,
      emailId: emailRecord.id,
      message: "Email queued successfully",
    })
  } catch (error: any) {
    console.error("Error queuing email:", error)
    return NextResponse.json(
      {
        error: "Failed to queue email",
        details: error.message,
      },
      { status: 500 }
    )
  }
})

// GET /api/emails/queue - Get all queued emails for the user
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const queuedEmails = await prisma.email.findMany({
      where: {
        userId,
        status: "draft",
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ emails: queuedEmails })
  } catch (error: any) {
    console.error("Error fetching queued emails:", error)
    return NextResponse.json(
      { error: "Failed to fetch queued emails" },
      { status: 500 }
    )
  }
})
