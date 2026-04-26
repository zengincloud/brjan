import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import twilio from "twilio"

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export const dynamic = "force-dynamic"

// Canadian area codes (not exhaustive but covers all current ones)
const CANADIAN_AREA_CODES = new Set([
  204, 226, 236, 249, 250, 263, 289,
  306, 343, 354, 365, 367, 368, 382,
  403, 416, 418, 428, 431, 437, 438, 450,
  506, 514, 519, 548, 579, 581, 584,
  604, 613, 639, 647, 672, 683,
  705, 709, 742, 753,
  778, 780, 782, 807, 819, 825, 867, 873, 902, 905,
])

// GET /api/calling/numbers/search?areaCode=415
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const areaCode = request.nextUrl.searchParams.get("areaCode") || ""

    if (!areaCode || areaCode.length !== 3 || !/^\d{3}$/.test(areaCode)) {
      return NextResponse.json({ error: "Valid 3-digit area code required" }, { status: 400 })
    }

    const country = CANADIAN_AREA_CODES.has(parseInt(areaCode)) ? "CA" : "US"

    const available = await twilioClient.availablePhoneNumbers(country)
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
