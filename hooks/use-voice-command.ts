"use client"

import { useCallback, useRef, useState } from "react"
import { useVoiceAction, VoiceAction } from "@/hooks/use-voice-action"
import type { AgentState } from "@/components/ui/orb"

export function useVoiceCommand() {
  const [agentState, setAgentState] = useState<AgentState>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const currentAudioUrlRef = useRef<string | null>(null)
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([])
  const { execute } = useVoiceAction()

  const interrupt = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current)
      currentAudioUrlRef.current = null
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    setAgentState(null)
  }, [])

  const speak = useCallback(async (text: string) => {
    if (!text) { setAgentState(null); return }
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
      currentAudioRef.current = audio
      currentAudioUrlRef.current = url
      audio.onended = () => {
        URL.revokeObjectURL(url)
        currentAudioRef.current = null
        currentAudioUrlRef.current = null
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
      if (!transcribeRes.ok) { await speak("Sorry, I couldn't hear that clearly."); return }

      const { transcript } = await transcribeRes.json()
      if (!transcript?.trim()) { await speak("I didn't catch that."); return }

      historyRef.current = [...historyRef.current, { role: "user", content: transcript }].slice(-10)

      const commandRes = await fetch("/api/voice/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          history: historyRef.current.slice(0, -1),
          currentPath: window.location.pathname,
        }),
      })
      if (!commandRes.ok) { await speak("Something went wrong."); return }

      const voiceAction: VoiceAction = await commandRes.json()
      const message = execute(voiceAction)

      if (message) {
        historyRef.current = [...historyRef.current, { role: "assistant", content: message }].slice(-10)
      }

      await speak(message)
    } catch {
      setAgentState(null)
    }
  }, [execute, speak])

  const toggleListening = useCallback(async () => {
    if (agentState === "talking" || agentState === "thinking") {
      interrupt()
      return
    }

    if (agentState === "listening") {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop()
      }
      return
    }

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
  }, [agentState, interrupt, processAudio])

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }, [])

  return { agentState, toggleListening, startListening: toggleListening, stopListening }
}
