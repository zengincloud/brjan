"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Phone,
  PhoneOff,
  Voicemail,
  UserCheck,
  UserX,
  Clock,
  Mic,
  MicOff,
  UserPlus,
  Search,
  X,
  Building2,
  Delete,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Device, Call as TwilioCall } from "@twilio/voice-sdk"
import { cn } from "@/lib/utils"
import { forceHangupCall } from "@/lib/hangup-call"

type CallStatus = "idle" | "calling" | "ringing" | "in_progress" | "completed" | "failed"
type CallOutcome =
  | "connected"
  | "connected_intro_booked"
  | "connected_referral"
  | "connected_not_interested"
  | "connected_info_gathered"
  | "voicemail"
  | "no_answer"
  | "busy"
  | "failed"
  | "gatekeeper"
  | "wrong_number"

type ContactAction = "new" | "existing" | "skip" | null

type ExistingProspect = {
  id: string
  name: string
  email: string | null
  company: string | null
  title: string | null
  phone: string | null
}

type AccountMatch = {
  id: string
  name: string
  industry: string | null
  location: string | null
}

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

  // Post-call state
  const [notes, setNotes] = useState("")
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null)
  const [contactAction, setContactAction] = useState<ContactAction>(null)

  // New contact form
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newTitle, setNewTitle] = useState("")

  // Company autocomplete
  const [companyInput, setCompanyInput] = useState("")
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [accountResults, setAccountResults] = useState<AccountMatch[]>([])
  const [accountSearchLoading, setAccountSearchLoading] = useState(false)
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const accountTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Name match suggestions (did you mean?)
  const [nameSuggestions, setNameSuggestions] = useState<ExistingProspect[]>([])
  const nameTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Existing contact search
  const [prospectSearch, setProspectSearch] = useState("")
  const [prospectResults, setProspectResults] = useState<ExistingProspect[]>([])
  const [selectedProspect, setSelectedProspect] = useState<ExistingProspect | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  // Saving
  const [saving, setSaving] = useState(false)

  const deviceRef = useRef<Device | null>(null)
  const activeCallRef = useRef<TwilioCall | null>(null)
  const prospectTimerRef = useRef<NodeJS.Timeout | null>(null)

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
        setSelectedOutcome(null)
        setContactAction(null)
        setNewName("")
        setNewEmail("")
        setNewTitle("")
        setCompanyInput("")
        setSelectedAccountId(null)
        setAccountResults([])
        setNameSuggestions([])
        setProspectSearch("")
        setProspectResults([])
        setSelectedProspect(null)
        setSaving(false)
      }, 300)
    }
  }, [open])

  // Debounced account search for company field
  useEffect(() => {
    if (!companyInput.trim() || selectedAccountId) {
      setAccountResults([])
      setShowAccountDropdown(false)
      return
    }
    if (accountTimerRef.current) clearTimeout(accountTimerRef.current)
    accountTimerRef.current = setTimeout(async () => {
      setAccountSearchLoading(true)
      try {
        const res = await fetch(`/api/accounts?search=${encodeURIComponent(companyInput.trim())}&pageSize=6`)
        const data = await res.json()
        setAccountResults(data.accounts || [])
        setShowAccountDropdown(true)
      } catch {
        // silently fail
      } finally {
        setAccountSearchLoading(false)
      }
    }, 250)
  }, [companyInput, selectedAccountId])

  // Debounced name suggestion search
  useEffect(() => {
    if (!newName.trim() || newName.length < 2) {
      setNameSuggestions([])
      return
    }
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current)
    nameTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/prospects?search=${encodeURIComponent(newName.trim())}&pageSize=3`)
        const data = await res.json()
        setNameSuggestions(data.prospects || [])
      } catch {
        // silently fail
      }
    }, 300)
  }, [newName])

  // Debounced existing prospect search
  useEffect(() => {
    if (!prospectSearch.trim()) {
      setProspectResults([])
      return
    }
    if (prospectTimerRef.current) clearTimeout(prospectTimerRef.current)
    prospectTimerRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/prospects?search=${encodeURIComponent(prospectSearch)}&pageSize=8`)
        const data = await res.json()
        setProspectResults(data.prospects || [])
      } catch {
        // silently fail
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }, [prospectSearch])

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

  const saveCall = async () => {
    if (!callId || !selectedOutcome) {
      toast({ title: "Select a call outcome", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      let prospectId: string | null = null

      if (contactAction === "new" && newName.trim()) {
        const res = await fetch("/api/prospects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName.trim(),
            phone: phoneNumber.trim(),
            company: companyInput.trim() || undefined,
            email: newEmail.trim() || undefined,
            title: newTitle.trim() || undefined,
            status: "contacted",
            // Pass accountId if user selected an existing account — this pins by UUID, not name
            ...(selectedAccountId && { accountId: selectedAccountId }),
          }),
        })
        if (res.ok) {
          const { prospect } = await res.json()
          prospectId = prospect.id
        } else {
          const err = await res.json()
          console.error("Failed to create prospect:", err.error)
          toast({ title: "Contact not saved", description: err.error || "Failed to create contact", variant: "destructive" })
        }
      } else if (contactAction === "existing" && selectedProspect) {
        prospectId = selectedProspect.id
      }

      const patchRes = await fetch(`/api/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome: selectedOutcome,
          notes,
          duration: callDuration,
          endedAt: new Date().toISOString(),
          ...(prospectId && { prospectId }),
        }),
      })

      if (!patchRes.ok) throw new Error("Failed to save call")

      toast({ title: "Call logged", description: "Call outcome has been recorded." })
      onOpenChange(false)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save call", variant: "destructive" })
    } finally {
      setSaving(false)
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
          {callStatus === "completed" && (
            <div className="space-y-5">
              {/* Call info */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border">
                <span className="text-sm font-medium">{phoneNumber}</span>
                <span className="text-xs text-muted-foreground">Duration: {formatDuration(callDuration)}</span>
              </div>

              {/* Outcome selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Call Outcome</Label>
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Connected</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "connected_intro_booked", label: "Intro Booked", icon: UserCheck },
                      { value: "connected_referral", label: "Referral", icon: UserCheck },
                      { value: "connected_not_interested", label: "Not Interested", icon: UserX },
                      { value: "connected_info_gathered", label: "Info Gathered", icon: UserCheck },
                    ] as { value: CallOutcome; label: string; icon: any }[]).map(({ value, label, icon: Icon }) => (
                      <Button key={value} variant={selectedOutcome === value ? "default" : "outline"} size="sm"
                        onClick={() => setSelectedOutcome(value)} className="justify-start text-xs h-8">
                        <Icon className="mr-1.5 h-3 w-3" />{label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Other</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "voicemail", label: "Voicemail", icon: Voicemail },
                      { value: "no_answer", label: "No Answer", icon: UserX },
                      { value: "busy", label: "Busy", icon: Clock },
                      { value: "gatekeeper", label: "Gatekeeper", icon: UserX },
                      { value: "wrong_number", label: "Wrong Number", icon: PhoneOff },
                      { value: "failed", label: "Failed", icon: PhoneOff },
                    ] as { value: CallOutcome; label: string; icon: any }[]).map(({ value, label, icon: Icon }) => (
                      <Button key={value} variant={selectedOutcome === value ? "default" : "outline"} size="sm"
                        onClick={() => setSelectedOutcome(value)} className="justify-start text-xs h-8">
                        <Icon className="mr-1.5 h-3 w-3" />{label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add call notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Contact association */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Contact</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant={contactAction === "new" ? "default" : "outline"} size="sm"
                    onClick={() => setContactAction(contactAction === "new" ? null : "new")}
                    className="text-xs h-8">
                    <UserPlus className="mr-1.5 h-3 w-3" />New contact
                  </Button>
                  <Button variant={contactAction === "existing" ? "default" : "outline"} size="sm"
                    onClick={() => setContactAction(contactAction === "existing" ? null : "existing")}
                    className="text-xs h-8">
                    <Search className="mr-1.5 h-3 w-3" />Existing
                  </Button>
                  <Button variant={contactAction === "skip" ? "default" : "outline"} size="sm"
                    onClick={() => setContactAction("skip")}
                    className="text-xs h-8">
                    Skip
                  </Button>
                </div>

                {/* New contact form */}
                {contactAction === "new" && (
                  <div className="space-y-2 p-3 rounded-lg bg-secondary/30 border border-border">
                    {/* Name field with duplicate suggestions */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="Full name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      {/* Name match suggestions */}
                      {nameSuggestions.length > 0 && (
                        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 overflow-hidden">
                          <p className="text-[10px] text-amber-400 uppercase tracking-wide font-medium px-2.5 pt-2 pb-1">
                            Possible matches in your contacts
                          </p>
                          {nameSuggestions.map((s) => (
                            <button
                              key={s.id}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-secondary/50 transition-colors flex items-center justify-between group"
                              onClick={() => {
                                setSelectedProspect(s)
                                setContactAction("existing")
                              }}
                            >
                              <span>
                                <span className="text-[13px] font-medium">{s.name}</span>
                                {(s.title || s.company) && (
                                  <span className="text-[11px] text-muted-foreground ml-2">
                                    {[s.title, s.company].filter(Boolean).join(" · ")}
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-amber-400 opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                                Use this one →
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Company field with account autocomplete */}
                      <div className="space-y-1.5 relative">
                        <Label className="text-xs">Company</Label>
                        <div className="relative">
                          {selectedAccountId && (
                            <Building2 className="absolute left-2 top-2 h-3.5 w-3.5 text-accent pointer-events-none" />
                          )}
                          <Input
                            placeholder="Company name"
                            value={companyInput}
                            onChange={(e) => {
                              setCompanyInput(e.target.value)
                              setSelectedAccountId(null)
                            }}
                            className={cn("h-8 text-sm", selectedAccountId && "pl-7 border-accent/50")}
                          />
                        </div>
                        {/* Account dropdown */}
                        {showAccountDropdown && !selectedAccountId && (
                          <div className="absolute z-50 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
                            {accountSearchLoading ? (
                              <p className="text-xs text-muted-foreground px-3 py-2">Searching...</p>
                            ) : accountResults.length === 0 ? (
                              <p className="text-xs text-muted-foreground px-3 py-2">No existing accounts — will create new</p>
                            ) : (
                              <>
                                {accountResults.map((a) => (
                                  <button
                                    key={a.id}
                                    className="w-full text-left px-3 py-2 hover:bg-secondary/50 border-b border-border last:border-0 transition-colors"
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      setCompanyInput(a.name)
                                      setSelectedAccountId(a.id)
                                      setShowAccountDropdown(false)
                                    }}
                                  >
                                    <p className="text-[13px] font-medium">{a.name}</p>
                                    {(a.industry || a.location) && (
                                      <p className="text-[11px] text-muted-foreground">
                                        {[a.industry, a.location].filter(Boolean).join(" · ")}
                                      </p>
                                    )}
                                  </button>
                                ))}
                                <div className="px-3 py-1.5 border-t border-border">
                                  <p className="text-[10px] text-muted-foreground">
                                    Not seeing the right one? Keep typing or leave blank to create new.
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {selectedAccountId && (
                          <p className="text-[10px] text-accent mt-0.5">Pinned to existing account</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Title</Label>
                        <Input
                          placeholder="Job title"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Email</Label>
                      <Input
                        placeholder="email@company.com"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Existing contact search */}
                {contactAction === "existing" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, or company..."
                        value={prospectSearch}
                        onChange={(e) => { setProspectSearch(e.target.value); setSelectedProspect(null) }}
                        className="h-8 text-sm pl-8"
                        autoFocus={!selectedProspect}
                      />
                    </div>

                    {selectedProspect && (
                      <div className="flex items-center justify-between p-2.5 rounded-md bg-primary/10 border border-primary/30">
                        <div>
                          <p className="text-sm font-medium">{selectedProspect.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[selectedProspect.title, selectedProspect.company].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedProspect(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {!selectedProspect && prospectSearch.trim() && (
                      <div className="rounded-md border border-border overflow-hidden">
                        {searchLoading ? (
                          <p className="text-xs text-muted-foreground px-3 py-2">Searching...</p>
                        ) : prospectResults.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-3 py-2">No results found</p>
                        ) : (
                          prospectResults.map((p) => (
                            <button
                              key={p.id}
                              className="w-full text-left px-3 py-2 hover:bg-secondary/50 border-b border-border last:border-0 transition-colors"
                              onClick={() => { setSelectedProspect(p); setProspectSearch("") }}
                            >
                              <p className="text-sm font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {[p.title, p.company].filter(Boolean).join(" · ")}
                                {p.phone && <span className="ml-2 text-muted-foreground/70">{p.phone}</span>}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Save */}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={saving}>
                  Discard
                </Button>
                <Button
                  className="flex-1"
                  onClick={saveCall}
                  disabled={
                    !selectedOutcome ||
                    saving ||
                    (contactAction === "new" && !newName.trim()) ||
                    (contactAction === "existing" && !selectedProspect)
                  }
                >
                  {saving ? "Saving..." : "Save Call"}
                </Button>
              </div>
            </div>
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
