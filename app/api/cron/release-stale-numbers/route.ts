import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import twilio from "twilio"

export const dynamic = "force-dynamic"

const STALE_DAYS = 30

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

// GET /api/cron/release-stale-numbers — release any purchased number that
// hasn't placed or received a call in STALE_DAYS, so reps stop paying for
// numbers they aren't using. A number younger than STALE_DAYS is left alone
// even with zero calls, so it isn't released before anyone gets a chance to
// use it.
//
// Invoked by Vercel Cron (see vercel.json), which calls this via GET and
// automatically attaches "Authorization: Bearer $CRON_SECRET".
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)

  const numbers = await prisma.phoneNumber.findMany({ where: { isActive: true } })

  const released: string[] = []
  const errors: { number: string; error: string }[] = []

  for (const number of numbers) {
    if (number.createdAt > cutoff) continue

    const lastCall = await prisma.call.findFirst({
      where: { OR: [{ from: number.number }, { to: number.number }] },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })

    const lastUsedAt = lastCall?.createdAt ?? number.createdAt
    if (lastUsedAt > cutoff) continue

    try {
      await twilioClient.incomingPhoneNumbers(number.twilioSid).remove()
      await prisma.phoneNumber.delete({ where: { id: number.id } })
      released.push(number.number)
    } catch (error: any) {
      console.error(`Failed to release stale number ${number.number}:`, error)
      errors.push({ number: number.number, error: error.message || "Unknown error" })
    }
  }

  return NextResponse.json({ checked: numbers.length, released, errors })
}
