import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

const VoiceResponse = twilio.twiml.VoiceResponse

// POST /api/calls/twiml - Generate TwiML for call handling
export async function POST(request: NextRequest) {
  try {
    const twiml = new VoiceResponse()

    // Connect the call to the user's browser/phone
    // For now, we'll just dial - in production you'd connect to a SIP client or phone
    twiml.say({
      voice: "alice",
    }, "Connecting your call. Please wait.")

    // Dial instruction (Twilio will bridge the call)
    twiml.dial().number({
      // This would be the agent's phone or SIP endpoint
      // For now, it just connects through
    }, "")

    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    })
  } catch (error: any) {
    console.error("Error generating TwiML:", error)

    const twiml = new VoiceResponse()
    twiml.say("An error occurred. Please try again later.")
    twiml.hangup()

    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
      status: 500,
    })
  }
}
