"use client"

import { useCallback, useRef, useState } from "react"
import { useVoiceAction, VoiceAction } from "@/hooks/use-voice-action"
import type { AgentState } from "@/components/ui/orb"

export function useVoiceCommand() {
  const [agentState, setAgentState] = useState<AgentState>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const { execute } = useVoiceAction()

  const speak = useCallback(async (text: string) => {
    setAgentState("talking")
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) { setAgentState(null); return }
      const audioBlob = await res.blob()
      const url = URL.createObjectURL(audioBlob)
      const audio = new Audio(url)
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setAgentState(null)
      }
      await audio.play()
    } catch {
      setAgentState(null)
    }
  }, [])

  const processAudio = useCallback(async (audioBlob: Blob) => {
    setAgentState("thinking")
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      const transcribeRes = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
      })
      if (!transcribeRes.ok) {
        await speak("Sorry, I couldn't hear that clearly.")
        return
      }
      const { transcript } = await transcribeRes.json()
      if (!transcript?.trim()) {
        await speak("I didn't catch that.")
        return
      }

      const commandRes = await fetch("/api/voice/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      })
      if (!commandRes.ok) {
        await speak("Something went wrong.")
        return
      }

      const voiceAction: VoiceAction = await commandRes.json()
      const message = execute(voiceAction)
      await speak(message)
    } catch {
      setAgentState(null)
    }
  }, [execute, speak])

  const startListening = useCallback(async () => {
    if (agentState !== null) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        processAudio(blob)
      }

      recorder.start()
      setAgentState("listening")
    } catch {
      setAgentState(null)
    }
  }, [agentState, processAudio])

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }, [])

  return { agentState, startListening, stopListening }
}
