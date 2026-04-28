import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

export const POST = withSuperAdmin(async (request: NextRequest) => {
  const formData = await request.formData()
  const audio = formData.get("audio") as File | null

  if (!audio) {
    return NextResponse.json({ error: "audio is required" }, { status: 400 })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 })
  }

  const body = new FormData()
  body.append("file", audio)
  body.append("model_id", "scribe_v2")

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body,
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("ElevenLabs STT error:", error)
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 })
  }

  const data = await response.json()
  return NextResponse.json({ transcript: data.text })
})
