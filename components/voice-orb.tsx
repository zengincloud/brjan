"use client"

import { useEffect } from "react"
import dynamic from "next/dynamic"
import { useUserRole } from "@/hooks/use-user-role"
import { useVoiceCommand } from "@/hooks/use-voice-command"

const Orb = dynamic(() => import("@/components/ui/orb").then((m) => m.Orb), { ssr: false })

export function VoiceOrb() {
  const { isSuperAdmin } = useUserRole()
  const { agentState, toggleListening, startListening, stopListening } = useVoiceCommand()

  useEffect(() => {
    if (!isSuperAdmin) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault()
        toggleListening()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isSuperAdmin, toggleListening])

  if (!isSuperAdmin) return null

  const label = agentState === "listening"
    ? "HAL6900 listening..."
    : agentState === "thinking"
    ? "HAL6900 thinking..."
    : agentState === "talking"
    ? "HAL6900 speaking..."
    : "HAL6900"

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-20 h-20 cursor-pointer group select-none"
      onMouseDown={startListening}
      onMouseUp={stopListening}
      onTouchStart={startListening}
      onTouchEnd={stopListening}
      onClick={toggleListening}
    >
      <div className={`w-full h-full rounded-full overflow-hidden transition-opacity ${agentState ? "opacity-100" : "opacity-70 hover:opacity-100"}`}>
        <Orb agentState={agentState} colors={["#6366f1", "#8b5cf6"]} />
      </div>
      <p className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs text-white/40 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
        {label}
      </p>
    </div>
  )
}
