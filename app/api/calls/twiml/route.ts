import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

const VoiceResponse = twilio.twiml.VoiceResponse

// POST /api/calls/twiml - Generate TwiML for call handling
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = new URLSearchParams(body)

    // Get the SDR's phone number from query params (we'll pass this when initiating the call)
    const sdrPhone = params.get('SdrPhone')

    const twiml = new VoiceResponse()

    if (!sdrPhone) {
      // If no SDR phone, just say something for testing
      twiml.say({
        voice: "alice",
      }, "This is a test call from your sales platform. The SDR phone number was not configured. Goodbye.")
      twiml.hangup()
    } else {
      // Bridge the call to the SDR
      twiml.say({
        voice: "alice",
      }, "Connecting your call.")

      // Dial the SDR's phone number to bridge the call
      const dial = twiml.dial({
        timeout: 30,
        callerId: params.get('To'), // Show prospect's number on SDR's caller ID
      })
      dial.number(sdrPhone)
    }

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
