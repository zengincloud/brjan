"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Phone, PhoneOff, Mic, MicOff, Delete } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Device, Call as TwilioCall } from "@twilio/voice-sdk"
import { cn } from "@/lib/utils"
import { forceHangupCall } from "@/lib/hangup-call"
import { CallOutcomePanel } from "@/components/call-outcome-panel"

type CallStatus = "idle" | "calling" | "ringing" | "in_progress" | "completed" | "failed"

const DIALPAD_KEYS = [
  { key: "1", letters: "" },
  { key: "2", letters: "ABC" },
  { key: "3", letters: "DEF" },
  { key: "4", letters: "GHI" },
  { key: "5", letters: "JKL" },
  { key: "6", letters: "MNO" },
  { key: "7", letters: "PQRS" },
  { key: "8", letters: "TUV" },
  { key: "9", letters: "WXYZ" },
  { key: "*", letters: "" },
  { key: "0", letters: "+" },
  { key: "#", letters: "" },
] as const

export function QuickDialDialog({
  open,
  onOpenChange,
  phoneNumbers,
  selectedPhone,
  onSelectedPhoneChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  phoneNumbers: { id: string; label: string }[]
  selectedPhone: string
  onSelectedPhoneChange: (phone: string) => void
}) {
  const { toast } = useToast()

  // Call state
  const [phoneNumber, setPhoneNumber] = useState("")
  const [callStatus, setCallStatus] = useState<CallStatus>("idle")
  const [callId, setCallId] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [deviceReady, setDeviceReady] = useState(false)

  // Notes taken during the live call, handed off to CallOutcomePanel on completion
  const [notes, setNotes] = useState("")

  const deviceRef = useRef<Device | null>(null)
  const activeCallRef = useRef<TwilioCall | null>(null)

  // Initialize Twilio Device when dialog opens
  useEffect(() => {
    if (!open) return

    const initDevice = async () => {
      try {
        const response = await fetch("/api/calls/token")
        if (!response.ok) throw new Error("Failed to fetch access token")
        const data = await response.json()

        const device = new Device(data.token, {
          logLevel: 1,
          codecPreferences: ["opus", "pcmu"],
        })

        device.on("registered", () => setDeviceReady(true))
        device.on("error", (error) => {
          console.error("Twilio Device error:", error)
          toast({ title: "Device Error", description: error.message || "Failed to initialize calling device", variant: "destructive" })
        })

        await device.register()
        deviceRef.current = device
      } catch (error: any) {
        console.error("Failed to initialize device:", error)
        toast({ title: "Initialization Error", description: "Failed to initialize calling device. Please refresh.", variant: "destructive" })
      }
    }

    initDevice()

    return () => {
      if (deviceRef.current) {
        deviceRef.current.unregister()
        deviceRef.current.destroy()
        deviceRef.current = null
      }
    }
  }, [open, toast])

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (callStatus === "in_progress" && startTime) {
      interval = setInterval(() => setCallDuration(Math.floor((Date.now() - startTime) / 1000)), 1000)
    }
    return () => clearInterval(interval)
  }, [callStatus, startTime])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPhoneNumber("")
        setCallStatus("idle")
        setCallId(null)
        setCallDuration(0)
        setStartTime(null)
        setIsMuted(false)
        setNotes("")
      }, 300)
    }
  }, [open])

  const pressKey = (key: string) => setPhoneNumber((prev) => prev + key)
  const backspace = () => setPhoneNumber((prev) => prev.slice(0, -1))

  const makeCall = async () => {
    const cleaned = phoneNumber.trim()
    if (!cleaned) { toast({ title: "Enter a phone number", variant: "destructive" }); return }
    if (!deviceRef.current || !deviceReady) {
      toast({ title: "Not Ready", description: "Calling device is still initializing.", variant: "destructive" })
      return
    }
    if (!selectedPhone) {
      toast({ title: "No caller ID selected", description: "Get a phone number before placing calls.", variant: "destructive" })
      return
    }

    setCallStatus("calling")

    try {
      const response = await fetch("/api/calls/make", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: cleaned, from: selectedPhone }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to make call")

      setCallId(data.callId)

      const call = await deviceRef.current.connect({ params: { To: cleaned, callId: data.callId, callerId: selectedPhone } })
      activeCallRef.current = call

      call.on("accept", async () => {
        setCallStatus("ringing")
        setStartTime(Date.now())
        const twilioCallSid = call.parameters.CallSid
        if (twilioCallSid && data.callId) {
          try {
            await fetch(`/api/calls/${data.callId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ twilioSid: twilioCallSid, status: "ringing", startedAt: new Date().toISOString() }),
            })
          } catch {}
        }
      })

      call.on("disconnect", () => { setCallStatus("completed"); activeCallRef.current = null; forceHangupCall(data.callId) })
      call.on("cancel", () => { setCallStatus("failed"); activeCallRef.current = null; forceHangupCall(data.callId) })
      call.on("reject", () => { setCallStatus("failed"); activeCallRef.current = null; forceHangupCall(data.callId) })
      call.on("error", (error) => {
        console.error("Call error:", error)
        setCallStatus("failed")
        activeCallRef.current = null
        forceHangupCall(data.callId)
        toast({ title: "Call Error", description: error.message || "An error occurred during the call", variant: "destructive" })
      })
      call.on("sample", () => setCallStatus((prev) => prev === "ringing" ? "in_progress" : prev))
    } catch (error: any) {
      setCallStatus("failed")
      toast({ title: "Call failed", description: error.message || "Failed to initiate call", variant: "destructive" })
    }
  }

  const endCall = () => {
    if (activeCallRef.current) activeCallRef.current.disconnect()
    setCallStatus("completed")
  }

  const toggleMute = () => {
    if (activeCallRef.current) {
      activeCallRef.current.mute(!isMuted)
      setIsMuted(!isMuted)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const isCallActive = callStatus === "calling" || callStatus === "ringing" || callStatus === "in_progress"

  const handleOpenChange = (value: boolean) => {
    if (!value && isCallActive) return
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Quick Dial
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Phase 1: Phone input + dialpad row */}
          {callStatus === "idle" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone-input">Phone Number</Label>
                <div className="relative">
                  <Input
                    id="phone-input"
                    placeholder="+1 555 000 0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && makeCall()}
                    autoFocus
                    className="text-center text-lg tracking-wide h-11 pr-9"
                  />
                  {phoneNumber && (
                    <button
                      type="button"
                      onClick={backspace}
                      aria-label="Delete last digit"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Delete className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dialpad grid */}
              <div className="grid grid-cols-3 gap-2.5 justify-items-center py-1">
                {DIALPAD_KEYS.map(({ key, letters }) => (
                  <button
                    key={key}
                    onClick={() => pressKey(key)}
                    className="flex flex-col items-center justify-center h-14 w-14 rounded-full border border-border bg-secondary/40 hover:bg-secondary active:scale-95 transition-all"
                  >
                    <span className="text-lg font-medium text-foreground leading-none">{key}</span>
                    {letters && (
                      <span className="text-[9px] text-muted-foreground tracking-wide mt-0.5">{letters}</span>
                    )}
                  </button>
                ))}
              </div>

              {phoneNumbers.length > 0 ? (
                <div className="space-y-1.5">
                  <Label htmlFor="caller-id-select" className="text-xs">Caller ID</Label>
                  <Select value={selectedPhone} onValueChange={onSelectedPhoneChange}>
                    <SelectTrigger id="caller-id-select">
                      <SelectValue placeholder="Select phone number" />
                    </SelectTrigger>
                    <SelectContent>
                      {phoneNumbers.map((phone) => (
                        <SelectItem key={phone.id} value={phone.id}>
                          {phone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  You don't have a phone number yet — get one from the dialer before calling.
                </p>
              )}

              <Button
                onClick={makeCall}
                className="w-full"
                size="lg"
                disabled={!deviceReady || !phoneNumber.trim() || !selectedPhone}
              >
                <Phone className="mr-2 h-4 w-4" />
                {deviceReady ? "Call" : "Initializing..."}
              </Button>
            </div>
          )}

          {/* Phase 2: Active call */}
          {isCallActive && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
                <div>
                  <p className="text-sm font-medium">{phoneNumber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {callStatus === "calling" && "Connecting..."}
                    {callStatus === "ringing" && "Ringing..."}
                    {callStatus === "in_progress" && formatDuration(callDuration)}
                  </p>
                </div>
                <span className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  callStatus === "in_progress" ? "bg-[hsl(100,78%,44%)]" : "bg-yellow-400"
                )} />
              </div>

              <div className="space-y-2">
                {callStatus === "in_progress" && (
                  <Button onClick={toggleMute} variant="outline" className="w-full">
                    {isMuted ? <><MicOff className="mr-2 h-4 w-4" /> Unmute</> : <><Mic className="mr-2 h-4 w-4" /> Mute</>}
                  </Button>
                )}
                <Button onClick={endCall} variant="destructive" className="w-full" size="lg">
                  <PhoneOff className="mr-2 h-4 w-4" />
                  End Call
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Take notes during the call..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Phase 3: Post-call */}
          {callStatus === "completed" && callId && (
            <CallOutcomePanel
              callId={callId}
              phoneNumber={phoneNumber}
              duration={callDuration}
              initialNotes={notes}
              onSaved={() => onOpenChange(false)}
              onDiscard={() => onOpenChange(false)}
            />
          )}

          {/* Failed state */}
          {callStatus === "failed" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
                <p className="text-sm text-destructive font-medium">Call failed</p>
                <p className="text-xs text-muted-foreground mt-1">The call could not be connected.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => { setCallStatus("idle"); setCallId(null); setCallDuration(0) }}>
                  Try Again
                </Button>
                <Button onClick={() => onOpenChange(false)}>Close</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
