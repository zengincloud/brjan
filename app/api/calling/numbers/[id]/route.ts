import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import twilio from "twilio"

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export const dynamic = "force-dynamic"

// DELETE /api/calling/numbers/[id] — release a number
export const DELETE = withAuth(async (request: NextRequest, userId: string, { params }: { params: { id: string } }) => {
  try {
    const record = await prisma.phoneNumber.findUnique({
      where: { id: params.id },
    })

    if (!record || record.userId !== userId) {
      return NextResponse.json({ error: "Number not found" }, { status: 404 })
    }

    // Release from Twilio
    await twilioClient.incomingPhoneNumbers(record.twilioSid).remove()

    // Delete from DB
    await prisma.phoneNumber.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error releasing phone number:", error)
    return NextResponse.json(
      { error: error.message || "Failed to release number" },
      { status: 500 }
    )
  }
})
