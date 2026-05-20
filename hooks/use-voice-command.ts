"use client"

import { useCallback, useRef, useState } from "react"
import { useVoiceAction, VoiceAction } from "@/hooks/use-voice-action"
import type { AgentState } from "@/components/ui/orb"

export function useVoiceCommand() {
  const [agentState, setAgentState] = useState<AgentState>(null)
  const recognitionRef = useRef<any>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const currentAudioUrlRef = useRef<string | null>(null)
  const pendingTranscriptRef = useRef<string>("")
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
    recognitionRef.current?.abort()
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

  const processTranscript = useCallback(async (transcript: string) => {
    setAgentState("thinking")
    try {
      const commandRes = await fetch("/api/voice/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      })
      if (!commandRes.ok) { await speak("Something went wrong."); return }

      const voiceAction: VoiceAction = await commandRes.json()
      const message = execute(voiceAction)
      await speak(message)
    } catch {
      setAgentState(null)
    }
  }, [execute, speak])

  const toggleListening = useCallback(() => {
    // Interrupt HAL mid-response
    if (agentState === "talking" || agentState === "thinking") {
      interrupt()
      return
    }

    // Second press — stop recording and process
    if (agentState === "listening") {
      recognitionRef.current?.stop()
      return
    }

    // First press — start recording via Web Speech API
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser")
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.continuous = true   // keep listening until second press
    recognition.interimResults = false
    recognition.lang = "en-US"
    pendingTranscriptRef.current = ""

    recognition.onstart = () => setAgentState("listening")

    recognition.onresult = (event: any) => {
      // Accumulate results in case of multiple segments
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          pendingTranscriptRef.current += event.results[i][0].transcript + " "
        }
      }
    }

    recognition.onend = () => {
      const transcript = pendingTranscriptRef.current.trim()
      pendingTranscriptRef.current = ""
      if (transcript) {
        processTranscript(transcript)
      } else {
        setAgentState(null)
      }
    }

    recognition.onerror = (e: any) => {
      if (e.error !== "aborted") setAgentState(null)
    }

    recognition.start()
  }, [agentState, interrupt, processTranscript])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { agentState, toggleListening, startListening: toggleListening, stopListening }
}
