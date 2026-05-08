import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

export const dynamic = "force-dynamic"

const VoiceResponse = twilio.twiml.VoiceResponse

/**
 * POST /api/calls/twiml
 *
 * TwiML App webhook — called by Twilio whenever the browser SDK initiates a call.
 * This endpoint now routes calls through Twilio Conferences, enabling listen-in
 * and future whisper coaching.
 *
 * Two modes controlled by the `role` param:
 *
 *   role = undefined (rep):
 *     - Puts the rep's browser into a named conference (conf-{callId})
 *     - Simultaneously dials the prospect via Twilio REST API into the same conference
 *     - Conference is recorded from start
 *
 *   role = "listener" (super admin listen-in):
 *     - Joins the existing conference muted
 *     - Does NOT end the conference on exit
 *
 * NOTE: The Twilio TwiML App (AP2406cb7ed1d9a98173e21577d073ef53) Voice Request URL
 * must be set to https://app.boilerroom.ai/api/calls/twiml in the Twilio console.
 */
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    let to: string | null = null
    let callId: string | null = null
    let callerId: string | null = null
    let role: string | null = null

    try {
      const formData = await request.formData()
      to = formData.get("To") as string
      callId = formData.get("callId") as string
      callerId = formData.get("callerId") as string
      role = formData.get("role") as string
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

    console.log("[twiml] request:", { to, callId, role, callerId })

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
