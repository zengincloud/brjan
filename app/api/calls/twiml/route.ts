import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

const VoiceResponse = twilio.twiml.VoiceResponse

// POST /api/calls/twiml - Generate TwiML for call handling
export async function POST(request: NextRequest) {
  try {
    // Get the URL to check for query params
    const url = new URL(request.url)
    const clientName = url.searchParams.get('clientName')

    const twiml = new VoiceResponse()

    if (clientName) {
      // Connect to Twilio Client (browser)
      twiml.say({
        voice: "alice",
      }, "Connecting your call.")

      // Add a ring tone before connecting
      twiml.play({}, 'http://com.twilio.sounds.music.s3.amazonaws.com/MARKOVICHAMP-Borghestral.mp3')

      const dial = twiml.dial({
        timeout: 30,
        answerOnBridge: true, // Only charge when prospect answers
      })
      dial.client(clientName)
    } else {
      // Fallback for testing without client
      twiml.say({
        voice: "alice",
      }, "This is a test call from your sales platform. Hello!")

      // Pause for 2 seconds
      twiml.pause({ length: 2 })

      twiml.say({
        voice: "alice",
      }, "This call will now end. Goodbye!")

      twiml.hangup()
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
