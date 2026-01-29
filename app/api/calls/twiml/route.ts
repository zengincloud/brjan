import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

const VoiceResponse = twilio.twiml.VoiceResponse

// POST /api/calls/twiml - Generate TwiML for call handling
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    let to: string | null = null
    let callId: string | null = null

    // Try to read formData safely
    try {
      const formData = await request.formData()
      to = formData.get('To') as string
      callId = formData.get('callId') as string
    } catch (e) {
      console.log('Could not read formData, using query params')
    }

    // Fallback to query params if formData failed
    if (!to) to = url.searchParams.get('To')
    if (!callId) callId = url.searchParams.get('callId')

    // Get base URL for callbacks
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.boilerroom.ai'

    // Log for debugging
    console.log('TwiML request received:', {
      to,
      callId,
      baseUrl,
    })

    const twiml = new VoiceResponse()

    if (to) {
      console.log('Dialing number:', to)

      // Dial the prospect's phone number from the browser
      const dial = twiml.dial({
        timeout: 30,
        answerOnBridge: true, // Only charge when prospect answers
        callerId: process.env.TWILIO_PHONE_NUMBER, // Use Twilio number as caller ID
        record: 'record-from-answer-dual', // Record both sides from when call is answered
        recordingStatusCallback: `${baseUrl}/api/calls/recording-status`,
        recordingStatusCallbackEvent: ['completed'],
        transcribe: true,
        transcribeCallback: `${baseUrl}/api/calls/transcription-status`,
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
