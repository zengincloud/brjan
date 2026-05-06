import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = "force-dynamic"

export const POST = withAuth<{ params: { id: string } }>(
  async (request: NextRequest, userId: string, context) => {
    const { id } = context!.params

    const mockCall = await prisma.mockCall.findUnique({
      where: { id, userId },
      select: { id: true, status: true },
    })

    if (!mockCall) {
      return NextResponse.json({ error: "Mock call not found" }, { status: 404 })
    }

    if (mockCall.status === "completed") {
      return NextResponse.json({ error: "Call has ended" }, { status: 400 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 500 })
    }

    const formData = await request.formData()
    const audio = formData.get("audio") as File | null

    if (!audio) {
      return NextResponse.json({ error: "audio is required" }, { status: 400 })
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
    return NextResponse.json({ transcript: data.text ?? "" })
  }
)
