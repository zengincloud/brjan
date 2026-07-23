"use client"

import { useEffect, useRef, useState } from "react"
import { Device, Call as TwilioCall } from "@twilio/voice-sdk"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff, Mic, MicOff, UserCheck, UserX, Voicemail } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

type WidgetState = "idle" | "ringing" | "in_progress" | "wrap_up"

type CallOutcome =
  | "connected"
  | "connected_intro_booked"
  | "connected_referral"
  | "connected_not_interested"
  | "connected_info_gathered"
  | "voicemail"
  | "gatekeeper"
  | "wrong_number"

const OUTCOME_OPTIONS: { value: CallOutcome; label: string; icon: any }[] = [
  { value: "connected_intro_booked", label: "Intro Booked", icon: UserCheck },
  { value: "connected_referral", label: "Referral", icon: UserCheck },
  { value: "connected_info_gathered", label: "Info Gathered", icon: UserCheck },
  { value: "connected_not_interested", label: "Not Interested", icon: UserX },
  { value: "voicemail", label: "Voicemail", icon: Voicemail },
  { value: "gatekeeper", label: "Gatekeeper", icon: UserX },
  { value: "wrong_number", label: "Wrong Number", icon: PhoneOff },
]

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function IncomingCallWidget() {
  const { toast } = useToast()
  const deviceRef = useRef<Device | null>(null)
  const activeCallRef = useRef<TwilioCall | null>(null)

  const [state, setState] = useState<WidgetState>("idle")
  const [callId, setCallId] = useState<string | null>(null)
  const [callerNumber, setCallerNumber] = useState("")
  const [prospectName, setProspectName] = useState<string | null>(null)
  const [prospectCompany, setProspectCompany] = useState<string | null>(null)
  const [prospectTitle, setProspectTitle] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null)
  const [saving, setSaving] = useState(false)

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
    setProspectName(null)
    setProspectCompany(null)
    setProspectTitle(null)
    setDuration(0)
    setStartTime(null)
    setIsMuted(false)
    setSelectedOutcome(null)
    setSaving(false)
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

  const saveDisposition = async () => {
    if (!callId || !selectedOutcome) return
    setSaving(true)
    try {
      await fetch(`/api/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome: selectedOutcome, duration, endedAt: new Date().toISOString() }),
      })
      toast({ title: "Call logged" })
    } catch {
      toast({ title: "Failed to save call outcome", variant: "destructive" })
    } finally {
      reset()
    }
  }

  if (state === "idle") return null

  const displayName = prospectName || "Unknown caller"
  const subtitle = [prospectTitle, prospectCompany].filter(Boolean).join(" · ")

  return (
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

      {state === "wrap_up" && (
        <div className="p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold">{displayName}</p>
            <p className="text-xs text-muted-foreground">Call ended · {formatDuration(duration)}</p>
          </div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Disposition</p>
          <div className="grid grid-cols-2 gap-1.5">
            {OUTCOME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                size="sm"
                variant={selectedOutcome === value ? "default" : "outline"}
                className="justify-start text-xs h-8"
                onClick={() => setSelectedOutcome(value)}
              >
                <Icon className="mr-1.5 h-3 w-3" />
                {label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={reset} disabled={saving}>
              Skip
            </Button>
            <Button className="flex-1" onClick={saveDisposition} disabled={!selectedOutcome || saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
