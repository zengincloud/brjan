import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { prisma } from "@/lib/prisma"
import { phonesMatch } from "@/lib/phone"

export const dynamic = "force-dynamic"

const VoiceResponse = twilio.twiml.VoiceResponse

async function findMatchingProspect(userId: string, callerNumber: string) {
  const prospects = await prisma.prospect.findMany({
    where: { userId },
    select: { id: true, name: true, company: true, title: true, phone: true, wizaData: true },
  })

  for (const p of prospects) {
    if (phonesMatch(p.phone, callerNumber)) return p
    const extraPhones = (p.wizaData as any)?.phones
    if (Array.isArray(extraPhones)) {
      const hit = extraPhones.some((entry: any) => {
        const number = typeof entry === "string" ? entry : entry?.number
        return phonesMatch(number, callerNumber)
      })
      if (hit) return p
    }
  }
  return null
}

/**
 * POST /api/calls/twiml
 *
 * TwiML App webhook. Handles four kinds of requests, distinguished by
 * their params:
 *
 *   role = "listener" (super admin listen-in):
 *     - Joins the existing conference muted. Does NOT end the conference on exit.
 *
 *   callId + to (rep-initiated outbound, browser SDK calling out):
 *     - Puts the rep's browser into a named conference (conf-{callId})
 *     - Simultaneously dials the prospect via REST API into the same conference
 *     - Conference is recorded from start
 *
 *   no callId, Direction=inbound (real PSTN call hitting a purchased number):
 *     - Looks up which rep owns the dialed number
 *     - Tries to attribute the caller to one of that rep's prospects by phone match
 *     - Creates a Call row and rings the rep's browser via <Dial><Client>,
 *       passing prospect attribution as custom parameters
 *
 *   DialCallStatus present (action callback for the inbound dial above):
 *     - If the rep never answered, marks the call as missed and plays a message
 *
 * NOTE: The Twilio TwiML App (AP2406cb7ed1d9a98173e21577d073ef53) Voice Request URL
 * must be set to https://app.boilerroom.ai/api/calls/twiml in the Twilio console,
 * as must the Voice Request URL on every purchased phone number.
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    let to: string | null = null
    let callId: string | null = null
    let callerId: string | null = null
    let role: string | null = null
    let from: string | null = null
    let direction: string | null = null
    let callSid: string | null = null
    let dialCallStatus: string | null = null

    try {
      const formData = await request.formData()
      to = formData.get("To") as string
      callId = formData.get("callId") as string
      callerId = formData.get("callerId") as string
      role = formData.get("role") as string
      from = formData.get("From") as string
      direction = formData.get("Direction") as string
      callSid = formData.get("CallSid") as string
      dialCallStatus = formData.get("DialCallStatus") as string
    } catch {
      // fall through to query params
    }

    // Fallback to query params
    if (!to) to = url.searchParams.get("To")
    if (!callId) callId = url.searchParams.get("callId")
    if (!callerId) callerId = url.searchParams.get("callerId")
    if (!role) role = url.searchParams.get("role")

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.boilerroom.ai"
    const twiml = new VoiceResponse()

    console.log("[twiml] request:", { to, from, callId, role, callerId, direction, dialCallStatus })

    // ── Dial action callback: the rep's leg of an inbound call just ended ──
    if (dialCallStatus && callId) {
      const answered = dialCallStatus === "completed" || dialCallStatus === "answered"
      if (!answered) {
        await prisma.call.update({
          where: { id: callId },
          data: { status: "no_answer", outcome: "no_answer", endedAt: new Date() },
        }).catch((err) => console.error("[twiml] failed to mark missed call:", err))
        twiml.say({ voice: "alice" }, "Sorry, no one is available to take your call right now. Please try again later.")
      }
      twiml.hangup()
      return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } })
    }

    // ── Genuine inbound PSTN call (no callId — Twilio dialed one of our numbers) ──
    if (!callId && direction === "inbound" && from && to) {
      const owner = await prisma.phoneNumber.findFirst({ where: { number: to, isActive: true } })

      if (!owner) {
        twiml.say({ voice: "alice" }, "This number is not configured to receive calls.")
        twiml.hangup()
        return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } })
      }

      const matched = await findMatchingProspect(owner.userId, from)

      const inboundCall = await prisma.call.create({
        data: {
          from,
          to,
          twilioSid: callSid || undefined,
          status: "ringing",
          userId: owner.userId,
          prospectId: matched?.id,
          metadata: { direction: "inbound" },
        },
      })

      const dial = twiml.dial({
        timeout: 20,
        action: `${baseUrl}/api/calls/twiml?callId=${inboundCall.id}`,
        method: "POST",
      })
      const client = dial.client({}, `user_${owner.userId}`)
      client.parameter({ name: "callId", value: inboundCall.id })
      client.parameter({ name: "callerNumber", value: from })
      if (matched) {
        client.parameter({ name: "prospectId", value: matched.id })
        client.parameter({ name: "prospectName", value: matched.name })
        if (matched.company) client.parameter({ name: "prospectCompany", value: matched.company })
        if (matched.title) client.parameter({ name: "prospectTitle", value: matched.title })
      }

      return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } })
    }

    if (!callId) {
      twiml.say("Configuration error: missing call ID.")
      twiml.hangup()
      return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } })
    }

    const conferenceName = `conf-${callId}`

    if (role === "listener") {
      // ── Supervisor listen-in ──────────────────────────────────────────────
      // Join the existing conference muted. Don't end the conference on exit.
      const dial = twiml.dial()
      dial.conference(conferenceName, {
        beep: "false",
        startConferenceOnEnter: "false",
        endConferenceOnExit: "false",
        muted: "true",
      } as any)
    } else if (to) {
      // ── Rep outbound call ─────────────────────────────────────────────────
      const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
      const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!
      const fromNumber = callerId || process.env.TWILIO_PHONE_NUMBER || ""

      // Dial the prospect into the same conference via REST API (fire and forget)
      twilio(ACCOUNT_SID, AUTH_TOKEN)
        .calls.create({
          to,
          from: fromNumber,
          twiml: `<Response><Dial><Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true">${conferenceName}</Conference></Dial></Response>`,
          statusCallback: `${baseUrl}/api/calls/status?callId=${callId}`,
          statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
          statusCallbackMethod: "POST",
        })
        .catch((err: Error) => console.error("[twiml] prospect dial failed:", err))

      // Rep's browser joins the conference (and starts the recording)
      const dial = twiml.dial()
      dial.conference(conferenceName, {
        beep: "false",
        startConferenceOnEnter: "true",
        endConferenceOnExit: "true",
        record: "record-from-start",
        recordingStatusCallback: `${baseUrl}/api/calls/recording-status?callId=${callId}`,
        recordingStatusCallbackEvent: "completed",
      } as any)
    } else {
      // ── No phone number — test/fallback ───────────────────────────────────
      twiml.say({ voice: "alice" }, "Test call from Boilerroom. No prospect number provided.")
      twiml.hangup()
    }

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    })
  } catch (error: any) {
    console.error("[twiml] error:", error)
    const twiml = new VoiceResponse()
    twiml.say("An error occurred. Please try again.")
    twiml.hangup()
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
      status: 500,
    })
  }
}
