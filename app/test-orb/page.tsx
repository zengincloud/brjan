"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import type { AgentState } from "@/components/ui/orb"

const Orb = dynamic(() => import("@/components/ui/orb").then((m) => m.Orb), { ssr: false })

export default function TestOrbPage() {
  const [state, setState] = useState<AgentState>(null)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black gap-8">
      <div className="w-64 h-64">
        <Orb agentState={state} colors={["#6366f1", "#8b5cf6"]} />
      </div>

      <div className="flex gap-3">
        {(["idle", "listening", "thinking", "talking"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setState(s === "idle" ? null : s)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              (state === null && s === "idle") || state === s
                ? "bg-white text-black border-white"
                : "bg-transparent text-white border-white/30 hover:border-white/60"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <p className="text-white/40 text-sm">State: {state ?? "idle"}</p>
    </div>
  )
}
