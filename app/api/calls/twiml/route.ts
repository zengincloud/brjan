import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

const VoiceResponse = twilio.twiml.VoiceResponse

// POST /api/calls/twiml - Generate TwiML for call handling
export async function POST(request: NextRequest) {
  try {
    // Twilio sends parameters in the request body as form data
    const formData = await request.formData()
    const url = new URL(request.url)

    // Try to get from both body and query params
    let to = formData.get('To') as string || url.searchParams.get('To')
    let callId = formData.get('callId') as string || url.searchParams.get('callId')

    // Log for debugging
    console.log('TwiML request received:', {
      to,
      callId,
      bodyParams: Object.fromEntries(formData.entries()),
      queryParams: Object.fromEntries(url.searchParams.entries())
    })

    const twiml = new VoiceResponse()

    if (to) {
      console.log('Dialing number:', to)

      // Dial the prospect's phone number from the browser
      const dial = twiml.dial({
        timeout: 30,
        answerOnBridge: true, // Only charge when prospect answers
        callerId: process.env.TWILIO_PHONE_NUMBER, // Use Twilio number as caller ID
      })

      dial.number(to)
    } else {
      console.log('No phone number provided, using fallback')

      // Fallback for testing without phone number
      twiml.say({
        voice: "alice",
      }, "This is a test call from your sales platform. Hello!")

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
