import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

// ElevenLabs premade voices — available on all plans
const CHARACTER_VOICE_IDS: Record<string, string> = {
  mike_reynolds: "xKhbyU7E3bC6T89Kn26c", // Sheldon Cooper — easy
  jessica_park:  "NbkKnEAZ7Bqw4EAkVEaz", // Adele Adkins — medium
  derek_walsh:   "gE0owC0H9C8SzfDyIUtB", // Ivanna Kissenhog — hard
}

export const POST = withAuth<{ params: { id: string } }>(
  async (request: NextRequest, userId: string, context) => {
    const { id } = context!.params
    const { text } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 })
    }

    const mockCall = await prisma.mockCall.findUnique({
      where: { id, userId },
      select: { character: true },
    })

    if (!mockCall) {
      return NextResponse.json({ error: "Mock call not found" }, { status: 404 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 500 })
    }

    const voiceId = CHARACTER_VOICE_IDS[mockCall.character] ?? CHARACTER_VOICE_IDS.mike_reynolds

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("ElevenLabs TTS error:", error)
      return NextResponse.json({ error: "Speech synthesis failed" }, { status: 500 })
    }

    const audioBuffer = await response.arrayBuffer()
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    })
  }
)
