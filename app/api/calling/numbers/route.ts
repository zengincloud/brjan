import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import { checkCredits, deductCredits } from "@/lib/credits"
import twilio from "twilio"

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export const dynamic = "force-dynamic"

// GET /api/calling/numbers — list user's provisioned numbers
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const numbers = await prisma.phoneNumber.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ numbers })
  } catch (error: any) {
    console.error("Error fetching phone numbers:", error)
    return NextResponse.json({ error: "Failed to fetch numbers" }, { status: 500 })
  }
})

// POST /api/calling/numbers — provision a number
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const { phoneNumber, friendlyName, areaCode } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json({ error: "phoneNumber is required" }, { status: 400 })
    }

    // Check if this is the user's first number
    const existingCount = await prisma.phoneNumber.count({ where: { userId } })
    if (existingCount > 0) {
      const creditCheck = await checkCredits(userId, "additional_phone_number")
      if (!creditCheck.allowed) {
        return NextResponse.json({ error: creditCheck.error }, { status: 402 })
      }
    }

    // Purchase the number from Twilio
    const purchased = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber,
      voiceUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/calls/twiml`,
      voiceMethod: "POST",
      statusCallback: `${process.env.NEXT_PUBLIC_SITE_URL}/api/calls/status`,
      statusCallbackMethod: "POST",
    })

    // Save to DB
    const record = await prisma.phoneNumber.create({
      data: {
        userId,
        number: purchased.phoneNumber,
        friendlyName: friendlyName || purchased.friendlyName || phoneNumber,
        areaCode: areaCode || phoneNumber.replace(/\D/g, "").slice(1, 4),
        twilioSid: purchased.sid,
      },
    })

    // Deduct credits for additional numbers (first is free)
    if (existingCount > 0) {
      await deductCredits(userId, "additional_phone_number")
    }

    return NextResponse.json({ phoneNumber: record })
  } catch (error: any) {
    console.error("Error provisioning phone number:", error)
    return NextResponse.json(
      { error: error.message || "Failed to provision number" },
      { status: 500 }
    )
  }
})
