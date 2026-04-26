import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import twilio from "twilio"

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export const dynamic = "force-dynamic"

// GET /api/calling/numbers/search?areaCode=415
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const areaCode = request.nextUrl.searchParams.get("areaCode") || ""

    if (!areaCode || areaCode.length !== 3 || !/^\d{3}$/.test(areaCode)) {
      return NextResponse.json({ error: "Valid 3-digit area code required" }, { status: 400 })
    }

    const available = await twilioClient.availablePhoneNumbers("US")
      .local.list({
        areaCode: parseInt(areaCode),
        limit: 10,
        voiceEnabled: true,
      })

    const numbers = available.map((n) => ({
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
      locality: n.locality,
      region: n.region,
      areaCode,
    }))

    return NextResponse.json({ numbers })
  } catch (error: any) {
    console.error("Error searching phone numbers:", error)
    return NextResponse.json(
      { error: error.message || "Failed to search numbers" },
      { status: 500 }
    )
  }
})
