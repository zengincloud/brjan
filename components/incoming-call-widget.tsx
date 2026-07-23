"use client"

import { useEffect, useRef, useState } from "react"
import { Device, Call as TwilioCall } from "@twilio/voice-sdk"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react"
import { CallOutcomePanel } from "@/components/call-outcome-panel"

type WidgetState = "idle" | "ringing" | "in_progress" | "wrap_up"

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function IncomingCallWidget() {
  const deviceRef = useRef<Device | null>(null)
  const activeCallRef = useRef<TwilioCall | null>(null)

  const [state, setState] = useState<WidgetState>("idle")
  const [callId, setCallId] = useState<string | null>(null)
  const [callerNumber, setCallerNumber] = useState("")
  const [prospectId, setProspectId] = useState<string | null>(null)
  const [prospectName, setProspectName] = useState<string | null>(null)
  const [prospectCompany, setProspectCompany] = useState<string | null>(null)
  const [prospectTitle, setProspectTitle] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [isMuted, setIsMuted] = useState(false)

  // Register a single persistent Device for the whole app session so calls
  // can ring this rep no matter which page they're on.
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const res = await fetch("/api/calls/token")
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return

        const device = new Device(data.token, { logLevel: 1, codecPreferences: ["opus", "pcmu"] })

        device.on("incoming", (call) => {
          activeCallRef.current = call
          setCallId(call.customParameters.get("callId") || null)
          setCallerNumber(call.customParameters.get("callerNumber") || call.parameters.From || "")
          setProspectId(call.customParameters.get("prospectId") || null)
          setProspectName(call.customParameters.get("prospectName") || null)
          setProspectCompany(call.customParameters.get("prospectCompany") || null)
          setProspectTitle(call.customParameters.get("prospectTitle") || null)
          setState("ringing")

          call.on("accept", () => {
            setState("in_progress")
            setStartTime(Date.now())
          })
          call.on("disconnect", () => {
            activeCallRef.current = null
            setState((prev) => (prev === "ringing" ? "idle" : "wrap_up"))
          })
          call.on("cancel", () => {
            activeCallRef.current = null
            setState("idle")
          })
          call.on("reject", () => {
            activeCallRef.current = null
            setState("idle")
          })
        })

        device.on("error", (error) => {
          console.error("Incoming call device error:", error)
        })

        await device.register()
        deviceRef.current = device
      } catch (err) {
        console.error("Failed to initialize incoming-call device:", err)
      }
    }

    init()

    return () => {
      cancelled = true
      if (deviceRef.current) {
        deviceRef.current.unregister()
        deviceRef.current.destroy()
        deviceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (state === "in_progress" && startTime) {
      interval = setInterval(() => setDuration(Math.floor((Date.now() - startTime) / 1000)), 1000)
    }
    return () => clearInterval(interval)
  }, [state, startTime])

  const reset = () => {
    setState("idle")
    setCallId(null)
    setCallerNumber("")
    setProspectId(null)
    setProspectName(null)
    setProspectCompany(null)
    setProspectTitle(null)
    setDuration(0)
    setStartTime(null)
    setIsMuted(false)
  }

  const accept = () => {
    activeCallRef.current?.accept()
    if (callId) {
      fetch(`/api/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress", startedAt: new Date().toISOString() }),
      }).catch(() => {})
    }
  }

  const decline = () => {
    activeCallRef.current?.reject()
    activeCallRef.current = null
    setState("idle")
  }

  const hangup = () => activeCallRef.current?.disconnect()

  const toggleMute = () => {
    if (!activeCallRef.current) return
    activeCallRef.current.mute(!isMuted)
    setIsMuted(!isMuted)
  }

  if (state === "idle") return null

  const displayName = prospectName || "Unknown caller"
  const subtitle = [prospectTitle, prospectCompany].filter(Boolean).join(" · ")

  return (
    <>
      {(state === "ringing" || state === "in_progress") && (
        <div className="fixed bottom-6 right-28 z-50 w-80 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
          {state === "ringing" && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[hsl(100,78%,44%)] animate-pulse" />
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Incoming call</p>
              </div>
              <div>
                <p className="text-sm font-semibold">{displayName}</p>
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">{callerNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="destructive" onClick={decline}>
                  <PhoneOff className="mr-1.5 h-4 w-4" />
                  Decline
                </Button>
                <Button onClick={accept}>
                  <Phone className="mr-1.5 h-4 w-4" />
                  Accept
                </Button>
              </div>
            </div>
          )}

          {state === "in_progress" && (
            <div className="p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold">{displayName}</p>
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {callerNumber} · {formatDuration(duration)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={toggleMute}>
                  {isMuted ? <MicOff className="mr-1.5 h-4 w-4" /> : <Mic className="mr-1.5 h-4 w-4" />}
                  {isMuted ? "Unmute" : "Mute"}
                </Button>
                <Button variant="destructive" onClick={hangup}>
                  <PhoneOff className="mr-1.5 h-4 w-4" />
                  Hang up
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {state === "wrap_up" && callId && (
        <Dialog open onOpenChange={(v) => { if (!v) reset() }}>
          <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {displayName}
              </DialogTitle>
            </DialogHeader>
            <CallOutcomePanel
              callId={callId}
              phoneNumber={callerNumber}
              duration={duration}
              knownProspect={prospectId && prospectName ? { id: prospectId, name: prospectName } : null}
              onSaved={reset}
              onDiscard={reset}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
