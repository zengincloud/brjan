"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Play,
  Pause,
  SkipForward,
  Voicemail,
  UserCheck,
  UserX,
  Building2,
  Clock,
  TrendingUp,
  Mail,
  Sparkles,
  History,
  ChevronDown,
  ChevronUp,
  Settings,
  Edit2,
  Check,
  X,
  FileText,
  MessageSquare,
  Lightbulb,
  Save,
  Users,
  Rocket,
  CalendarCheck,
  Handshake,
  Star,
  Target,
  Mic,
  MicOff,
  Loader2,
  MoreVertical,
  Globe,
  MapPin,
  Linkedin,
} from "lucide-react"
import { SendEmailDialog } from "@/components/send-email-dialog"
import { Calendar } from "lucide-react"
import { Device, Call as TwilioCall } from "@twilio/voice-sdk"
import { formatDistanceToNow } from "date-fns"
import { useUserRole } from "@/hooks/use-user-role"
import { useSessionState } from "@/hooks/use-session-state"

type CallStatus = "idle" | "ringing" | "connected" | "completed"

type CallSlot = {
  id: string
  status: CallStatus
  contact: {
    name: string
    company: string
    phone: string
    title: string
    email: string
    linkedin?: string | null
    location?: string | null
    companyDescription?: string | null
    aiNotes: string
    priorCalls: { date: string; outcome: string; notes: string }[]
    lastEmailSent: string
    sequenceStage: string
    sequence: string
    pov?: {
      opportunity: string
      industryContext: string
      howToHelp: string
      angle: string
    } | null
    accountInfo?: {
      pov?: any
    } | null
  } | null
  startTime: number | null
  notes: string
  callId?: string
  twilioSid?: string
  taskId?: string | null
  queueItemId?: string
  prospectId?: string | null
  sequenceId?: string | null
  pendingOutcome?: string
  pendingPipelineStage?: string
}

type SessionStats = {
  totalCalls: number
  connected: number
  voicemail: number
  noAnswer: number
  pipeline: number
  callsPerHour: number
}

type DialerProspect = {
  id: string
  taskId?: string | null
  prospectId?: string | null
  name: string
  company: string
  phone: string
  title: string
  email: string
  linkedin?: string | null
  location?: string | null
  companyDescription?: string | null
  industry?: string
  companySize?: string
  businessDescription?: string
  whatTheySell?: string
  aiNotes?: string
  priorCalls?: { date: string; outcome: string; notes: string }[]
  lastEmailSent?: string | null
  sequenceStage?: string
  sequence?: string | null
  sequenceId?: string | null
  callScript?: string
  correspondenceHistory?: { date: string; type: string; from: string; summary: string }[]
  pov?: {
    opportunity: string
    industryContext: string
    howToHelp: string
    angle: string
  }
  accountInfo?: {
    id: string
    industry?: string | null
    website?: string | null
    employees?: number | null
    location?: string | null
    linkedin?: string | null
    insights?: any
    pov?: any
  } | null
  priority?: string
  dueDate?: Date | string | null
  addedAt?: Date | string | null
  status?: string
}

export default function DialerPage() {
  const { toast } = useToast()
  useUserRole() // Keep hook for auth check
  const [sessionActive, setSessionActive] = useSessionState("dialer_session_active", false)
  const [sessionPaused, setSessionPaused] = useSessionState("dialer_session_paused", false)
  const [selectedSequence, setSelectedSequence] = useSessionState<string>("dialer_sequence", "all")
  const [sortBy, setSortBy] = useSessionState<string>("dialer_sort", "due_date")
  const [selectedPhone, setSelectedPhone] = useSessionState<string>("dialer_phone", "+16282253832")
  const [callSlots, setCallSlots] = useSessionState<CallSlot[]>("dialer_call_slots", [
    { id: "1", status: "idle", contact: null, startTime: null, notes: "", pendingOutcome: undefined, pendingPipelineStage: undefined },
  ])
  const [stats, setStats] = useSessionState<SessionStats>("dialer_stats", {
    totalCalls: 0,
    connected: 0,
    voicemail: 0,
    noAnswer: 0,
    pipeline: 0,
    callsPerHour: 0,
  })
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set())
  const [queueSize, setQueueSize] = useSessionState("dialer_queue_size", 0)
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null)
  const [editedPhone, setEditedPhone] = useState<string>("")
  const [prospectNotes, setProspectNotes] = useState<{ [key: string]: string }>({})
  const [accountNotes, setAccountNotes] = useState<{ [key: string]: string }>({})
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailProspect, setEmailProspect] = useState<{ id: string; name: string; email: string; title?: string; company?: string } | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteType, setEditingNoteType] = useState<"prospect" | "account" | null>(null)
  const [apiProspects, setApiProspects] = useState<DialerProspect[]>([])
  const [loadingProspects, setLoadingProspects] = useState(true)
  const [fetchedSequences, setFetchedSequences] = useState<{ id: string; name: string }[]>([])
  const [selectedTimezones, setSelectedTimezones] = useState<string[]>([])

  // Twilio state
  const [deviceReady, setDeviceReady] = useState(false)
  const [deviceError, setDeviceError] = useState<string | null>(null)
  const [currentProspectIndex, setCurrentProspectIndex] = useSessionState("dialer_prospect_index", 0)
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [showOutcomeButtons, setShowOutcomeButtons] = useState(false)

  // Keep a ref to the latest callSlots so async functions always read fresh state
  const callSlotsRef = useRef(callSlots)
  callSlotsRef.current = callSlots

  // Twilio refs
  const deviceRef = useRef<Device | null>(null)
  const activeCallRef = useRef<TwilioCall | null>(null)
  const callStartTimeRef = useRef<number | null>(null)

  // Audio refs for session sounds
  const audioContextRef = useRef<AudioContext | null>(null)
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const ringOscillatorRef = useRef<OscillatorNode | null>(null)
  const ringGainRef = useRef<GainNode | null>(null)

  // Play ringing sound (phone ring pattern)
  const playRingingSound = useCallback(() => {
    try {
      // Stop any existing ringing first
      stopRingingSound()

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return

      audioContextRef.current = new AudioContextClass()
      const ctx = audioContextRef.current

      // Create oscillator and gain for ringing
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.value = 440 // A4 note
      oscillator.type = 'sine'
      gainNode.gain.value = 0

      oscillator.start()
      ringOscillatorRef.current = oscillator
      ringGainRef.current = gainNode

      // Create ringing pattern: ring for 0.4s, pause for 0.2s, ring for 0.4s, pause for 2s
      let ringPhase = 0
      const ringPattern = () => {
        if (!audioContextRef.current || !ringGainRef.current) return

        const now = audioContextRef.current.currentTime
        if (ringPhase === 0) {
          ringGainRef.current.gain.setValueAtTime(0.15, now)
          setTimeout(() => {
            if (ringGainRef.current && audioContextRef.current) {
              ringGainRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime)
            }
          }, 400)
          ringPhase = 1
        } else if (ringPhase === 1) {
          ringGainRef.current.gain.setValueAtTime(0.15, now)
          setTimeout(() => {
            if (ringGainRef.current && audioContextRef.current) {
              ringGainRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime)
            }
          }, 400)
          ringPhase = 0
        }
      }

      // Start ring pattern
      ringPattern()
      ringIntervalRef.current = setInterval(ringPattern, 600)
    } catch (e) {
      console.log("Could not play ringing sound:", e)
    }
  }, [])

  // Stop ringing sound
  const stopRingingSound = useCallback(() => {
    try {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current)
        ringIntervalRef.current = null
      }
      if (ringOscillatorRef.current) {
        ringOscillatorRef.current.stop()
        ringOscillatorRef.current = null
      }
      if (ringGainRef.current) {
        ringGainRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    } catch (e) {
      console.log("Could not stop ringing sound:", e)
    }
  }, [])

  // Play hangup sound (busy tone)
  const playHangupSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return

      const ctx = new AudioContextClass()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.value = 480 // Busy tone frequency
      oscillator.type = 'sine'
      gainNode.gain.value = 0.15

      oscillator.start()

      // Play for 0.5 seconds then stop
      setTimeout(() => {
        oscillator.stop()
        ctx.close()
      }, 500)
    } catch (e) {
      console.log("Could not play hangup sound:", e)
    }
  }, [])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopRingingSound()
    }
  }, [stopRingingSound])

  // Fetch real sequences from API
  useEffect(() => {
    const fetchSequences = async () => {
      try {
        const response = await fetch("/api/sequences")
        if (response.ok) {
          const data = await response.json()
          setFetchedSequences(
            (data.sequences || []).map((s: any) => ({ id: s.id, name: s.name }))
          )
        }
      } catch (error) {
        console.error("Error fetching sequences:", error)
      }
    }
    fetchSequences()
  }, [])

  // Available sequences — "All Sequences" + real sequences from DB
  const sequences = [
    { id: "all", name: "All Sequences" },
    ...fetchedSequences,
  ]

  // Available phone numbers (including Twilio-provided number)
  const phoneNumbers = [
    { id: "+16282253832", label: "+1 (628) 225-3832 (Twilio)" },
    { id: "+1 (555) 000-0001", label: "+1 (555) 000-0001 (Main)" },
    { id: "+1 (555) 000-0002", label: "+1 (555) 000-0002 (Sales)" },
    { id: "+1 (555) 000-0003", label: "+1 (555) 000-0003 (Support)" },
  ]

  // Fetch prospects from API
  useEffect(() => {
    const fetchProspects = async () => {
      try {
        setLoadingProspects(true)
        const params = new URLSearchParams()
        if (selectedSequence !== 'all') {
          params.append('sequenceId', selectedSequence)
        }
        const response = await fetch(`/api/dialer/queue?${params}`)
        if (response.ok) {
          const data = await response.json()
          setApiProspects(data.queue || [])
        }
      } catch (error) {
        console.error('Error fetching dialer queue:', error)
      } finally {
        setLoadingProspects(false)
      }
    }

    fetchProspects()
  }, [selectedSequence])

  // Initialize Twilio Device
  useEffect(() => {
    const initDevice = async () => {
      try {
        const response = await fetch("/api/calls/token")
        if (!response.ok) {
          throw new Error("Failed to fetch access token")
        }
        const data = await response.json()

        const device = new Device(data.token, {
          logLevel: 1,
          codecPreferences: ["opus", "pcmu"],
        })

        device.on("registered", () => {
          console.log("Twilio Device registered")
          setDeviceReady(true)
          setDeviceError(null)
        })

        device.on("error", (error) => {
          console.error("Twilio Device error:", error)
          // Don't set deviceError for transient connection errors (31005) - just show a toast
          const isTransient = error.code === 31005 || error.message?.includes("connection")
          if (!isTransient) {
            setDeviceError(error.message || "Device error")
          }
          toast({
            title: isTransient ? "Connection issue" : "Device Error",
            description: isTransient
              ? "Temporary connection drop. The dialer will reconnect automatically."
              : (error.message || "Failed to initialize calling device"),
            variant: "destructive",
          })
        })

        await device.register()
        deviceRef.current = device
      } catch (error: any) {
        console.error("Failed to initialize device:", error)
        setDeviceError(error.message || "Failed to initialize")
        toast({
          title: "Initialization Error",
          description: "Failed to initialize calling device. Please refresh the page.",
          variant: "destructive",
        })
      }
    }

    initDevice()

    return () => {
      if (deviceRef.current) {
        deviceRef.current.unregister()
        deviceRef.current.destroy()
      }
    }
  }, [toast])

  // Call duration timer - only runs during active calls (ringing/connected), stops on hangup
  useEffect(() => {
    let interval: NodeJS.Timeout
    const hasActiveCall = callSlots.some(s => s.status === "ringing" || s.status === "connected")
    if (callStartTimeRef.current && hasActiveCall) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current!) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [callSlots])

  // Use API prospects only (filtered to those with phone numbers + timezone filter), then sort
  const mockProspects: DialerProspect[] = apiProspects.filter(p => {
    if (!p.phone) return false
    // Timezone filter
    if (selectedTimezones.length > 0) {
      const loc = p.location || (p.accountInfo as any)?.location || null
      const abbr = getTimezoneAbbr(loc)
      if (!abbr || !selectedTimezones.some(tz => abbr.includes(tz) || abbr === tz)) return false
    }
    return true
  }).sort((a, b) => {
    const toTime = (val: Date | string | null | undefined) => {
      if (!val) return 0
      const d = new Date(val)
      return isNaN(d.getTime()) ? 0 : d.getTime()
    }
    switch (sortBy) {
      case "due_date":
        return toTime(a.dueDate) - toTime(b.dueDate)
      case "added_newest":
        return toTime(b.addedAt) - toTime(a.addedAt)
      case "added_oldest":
        return toTime(a.addedAt) - toTime(b.addedAt)
      case "name":
        return (a.name || "").localeCompare(b.name || "")
      case "company":
        return (a.company || "").localeCompare(b.company || "")
      default:
        return 0
    }
  })

  // Update queue size when prospects change
  useEffect(() => {
    setQueueSize(mockProspects.length)
  }, [mockProspects.length])

  // Actually connect a call via Twilio
  const connectCall = useCallback(async (prospect: DialerProspect, slotIndex: number) => {
    if (!deviceRef.current || !deviceReady) {
      toast({
        title: "Error",
        description: "Calling device not ready. Please wait a moment.",
        variant: "destructive",
      })
      return null
    }

    if (!prospect.phone) {
      toast({
        title: "Error",
        description: "No phone number available for this prospect",
        variant: "destructive",
      })
      return null
    }

    try {
      // First create a call record in the database
      const response = await fetch("/api/calls/make", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: prospect.phone,
          from: selectedPhone,
          prospectId: prospect.prospectId,
          metadata: {
            prospectName: prospect.name,
            prospectCompany: prospect.company,
            sequence: prospect.sequence,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create call record")
      }

      // Update slot to ringing state and auto-expand the card
      const slotId = callSlots[slotIndex]?.id || "1"
      setExpandedSlots(prev => new Set(prev).add(slotId))
      setCallSlots(prev => prev.map((slot, idx) =>
        idx === slotIndex
          ? { ...slot, contact: prospect, status: "ringing" as CallStatus, startTime: Date.now(), callId: data.callId, taskId: prospect.taskId, queueItemId: prospect.id, prospectId: prospect.prospectId || null, sequenceId: prospect.sequenceId || null }
          : slot
      ))

      // Connect the call using Twilio Device
      const call = await deviceRef.current.connect({
        params: {
          To: prospect.phone,
          callId: data.callId,
        },
      })

      activeCallRef.current = call

      // Call event listeners
      call.on("accept", async () => {
        console.log("Call accepted (ringing)")
        callStartTimeRef.current = Date.now()

        // Update call record with Twilio SID
        const twilioCallSid = call.parameters.CallSid
        if (twilioCallSid && data.callId) {
          try {
            await fetch(`/api/calls/${data.callId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                twilioSid: twilioCallSid,
                status: "ringing",
                startedAt: new Date().toISOString(),
              }),
            })
          } catch (error) {
            console.error("Failed to update call with Twilio SID:", error)
          }
        }

        toast({
          title: "Calling...",
          description: `Dialing ${prospect.name}`,
        })
      })

      call.on("disconnect", () => {
        console.log("Call disconnected")
        activeCallRef.current = null
        setIsMuted(false)

        // Play hangup sound
        playHangupSound()

        // Update slot to completed — but only if it's still the same call
        // (saveAndAdvance may have already reset the slot to idle with a new contact)
        setCallSlots(prev => prev.map((slot, idx) => {
          if (idx !== slotIndex) return slot
          // Only mark completed if the slot is still ringing/connected (not already reset)
          if (slot.status === "ringing" || slot.status === "connected") {
            setShowOutcomeButtons(true)
            return { ...slot, status: "completed" as CallStatus }
          }
          return slot
        }))
      })

      call.on("cancel", () => {
        console.log("Call cancelled")
        activeCallRef.current = null

        // Play hangup sound
        playHangupSound()

        // Mark as no answer and auto-advance
        handleCallOutcomeAndAdvance(slotIndex, "no_answer")
      })

      call.on("reject", () => {
        console.log("Call rejected")
        activeCallRef.current = null

        // Play hangup sound
        playHangupSound()

        handleCallOutcomeAndAdvance(slotIndex, "busy")
      })

      call.on("error", (error) => {
        console.error("Call error:", error)
        activeCallRef.current = null

        // Play hangup sound
        playHangupSound()

        // Show brief failed status instead of immediately resetting
        setCallSlots(prev => prev.map((s, idx) =>
          idx === slotIndex ? { ...s, status: "idle" as CallStatus } : s
        ))

        toast({
          title: "Call failed",
          description: "Moving to next prospect...",
          variant: "destructive",
        })

        // Small delay so the user sees what happened before advancing
        setTimeout(() => {
          handleCallOutcomeAndAdvance(slotIndex, "failed")
        }, 800)
      })

      // When prospect answers, update status to connected
      call.on("sample", () => {
        setCallSlots(prev => {
          const current = prev[slotIndex]
          if (current?.status === "ringing") {
            return prev.map((slot, idx) =>
              idx === slotIndex
                ? { ...slot, status: "connected" as CallStatus }
                : slot
            )
          }
          return prev
        })
      })

      return { callId: data.callId, twilioSid: null }
    } catch (error: any) {
      console.error("Error making call:", error)
      toast({
        title: "Call failed",
        description: error.message || "Failed to initiate call",
        variant: "destructive",
      })
      return null
    }
  }, [deviceReady, selectedPhone, toast])

  // Handle call outcome and advance to next prospect
  const handleCallOutcomeAndAdvance = useCallback(async (slotIndex: number, outcome: string) => {
    const slot = callSlotsRef.current[slotIndex]

    // Save outcome + mark task done in parallel (fire-and-forget)
    const savePromises: Promise<any>[] = []

    if (slot?.callId) {
      savePromises.push(
        fetch(`/api/calls/${slot.callId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outcome,
            notes: slot.notes,
            endedAt: new Date().toISOString(),
          }),
        }).catch(err => console.error("Error saving call outcome:", err))
      )
    }

    if (slot?.taskId) {
      savePromises.push(
        fetch(`/api/tasks/${slot.taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "done" }),
        }).catch(err => console.error("Error completing task:", err))
      )
    }

    Promise.all(savePromises)

    // Remove from local queue so it doesn't reappear
    if (slot?.queueItemId) {
      setApiProspects(prev => prev.filter(p => p.id !== slot.queueItemId))
    }

    // Update stats
    setStats(prev => ({
      ...prev,
      totalCalls: prev.totalCalls + 1,
      connected: outcome.startsWith("connected") ? prev.connected + 1 : prev.connected,
      voicemail: outcome === "voicemail" ? prev.voicemail + 1 : prev.voicemail,
      noAnswer: outcome === "no_answer" ? prev.noAnswer + 1 : prev.noAnswer,
    }))

    // Reset slot
    setCallSlots(prev => prev.map((s, idx) =>
      idx === slotIndex
        ? { id: s.id, status: "idle" as CallStatus, contact: null, startTime: null, notes: "" }
        : s
    ))
    setShowOutcomeButtons(false)
    setCallDuration(0)
    callStartTimeRef.current = null

    // Auto-advance to next prospect if session is active
    if (sessionActive && !sessionPaused) {
      const nextIndex = currentProspectIndex + 1
      if (nextIndex < mockProspects.length) {
        setCurrentProspectIndex(nextIndex)
        setQueueSize(prev => Math.max(0, prev - 1))

        // Small delay before next call
        setTimeout(() => {
          const nextProspect = mockProspects[nextIndex]
          if (nextProspect) {
            connectCall(nextProspect, 0)
          }
        }, 1500)
      } else {
        // No more prospects
        setSessionActive(false)
        toast({
          title: "Session Complete",
          description: "You've reached the end of the call queue.",
        })
      }
    }
  }, [sessionActive, sessionPaused, currentProspectIndex, mockProspects, connectCall, toast])

  // End current call
  const endCall = useCallback(() => {
    if (activeCallRef.current) {
      activeCallRef.current.disconnect()
    }
  }, [])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (activeCallRef.current) {
      activeCallRef.current.mute(!isMuted)
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  // Start power dial session
  const startSession = async () => {
    if (!deviceReady) {
      toast({
        title: "Not Ready",
        description: "Calling device is still initializing. Please wait.",
        variant: "destructive",
      })
      return
    }

    if (mockProspects.length === 0) {
      toast({
        title: "No Prospects",
        description: "No prospects available to call.",
        variant: "destructive",
      })
      return
    }

    // Pre-load the first prospect into the slot BEFORE toggling session active
    // This prevents the flash where the page goes blank
    const firstProspect = mockProspects[0]
    if (firstProspect) {
      setCallSlots([{
        id: "1",
        status: "idle",
        contact: {
          name: firstProspect.name,
          company: firstProspect.company,
          phone: firstProspect.phone,
          title: firstProspect.title,
          email: firstProspect.email,
          linkedin: firstProspect.linkedin || null,
          location: firstProspect.location || null,
          companyDescription: firstProspect.companyDescription || null,
          aiNotes: firstProspect.aiNotes || "",
          priorCalls: firstProspect.priorCalls || [],
          lastEmailSent: firstProspect.lastEmailSent || "",
          sequenceStage: firstProspect.sequenceStage || "",
          sequence: firstProspect.sequence || "",
          pov: firstProspect.pov || null,
          accountInfo: firstProspect.accountInfo || null,
        },
        startTime: null,
        notes: "",
        taskId: firstProspect.taskId,
        queueItemId: firstProspect.id,
        prospectId: firstProspect.prospectId || null,
        sequenceId: firstProspect.sequenceId || null,
      }])
      setQueueSize(mockProspects.length - 1)
    }

    setSessionActive(true)
    setSessionPaused(false)
    setCurrentProspectIndex(0)
    setShowOutcomeButtons(false)

    // Start calling the first prospect
    if (firstProspect) {
      await connectCall(firstProspect, 0)
    }
  }

  const pauseSession = () => {
    setSessionPaused(!sessionPaused)
  }

  const stopSession = () => {
    // Play hangup sound
    playHangupSound()

    // End any active call — force disconnect even if ref is stale
    if (activeCallRef.current) {
      try {
        activeCallRef.current.disconnect()
      } catch (e) {
        console.error("Error disconnecting call on session end:", e)
      }
      activeCallRef.current = null
    }

    // Also try to disconnect via device to catch any orphaned calls
    if (deviceRef.current) {
      try {
        deviceRef.current.disconnectAll()
      } catch (e) {
        // disconnectAll may not exist on older SDK versions, ignore
      }
    }

    setSessionActive(false)
    setSessionPaused(false)
    setShowOutcomeButtons(false)
    setCallDuration(0)
    setIsMuted(false)
    callStartTimeRef.current = null
    setCurrentProspectIndex(0)
    setCallSlots([{
      id: "1",
      status: "idle",
      contact: null,
      startTime: null,
      notes: "",
    }])
  }

  // Pipeline stages for call outcomes
  type PipelineStage = "interested" | "intro_booked" | "opportunity" | "demo_booked"

  const pipelineStageLabels: Record<PipelineStage, string> = {
    interested: "Interested",
    intro_booked: "Intro Booked",
    opportunity: "Opportunity",
    demo_booked: "Demo Booked",
  }

  const outcomeLabels: Record<string, string> = {
    connected: "Connected",
    connected_intro_booked: "Intro Booked",
    connected_referral: "Referral",
    connected_not_interested: "Not Interested",
    connected_info_gathered: "Info Gathered",
    callback: "Call Back Later",
    voicemail: "Voicemail",
    no_answer: "No Answer",
    busy: "Busy",
    failed: "Failed",
    gatekeeper: "Gatekeeper",
  }

  const handleCallOutcome = async (slotId: string, outcome: string) => {
    // Store the pending outcome on the slot (independent of pipeline)
    setCallSlots(prev => prev.map(slot =>
      slot.id === slotId ? { ...slot, pendingOutcome: outcome } : slot
    ))
  }

  const handlePipelineOutcome = async (slotId: string, pipelineStage: PipelineStage) => {
    // Store the pending pipeline stage on the slot (independent of outcome)
    setCallSlots(prev => prev.map(slot =>
      slot.id === slotId ? { ...slot, pendingPipelineStage: pipelineStage } : slot
    ))
  }

  // Save outcome/notes and advance to next prospect
  const saveAndAdvance = async (slotId: string) => {
    // Read from ref to always get the latest state (avoids stale closures)
    const currentSlots = callSlotsRef.current
    const slotIndex = currentSlots.findIndex(s => s.id === slotId)
    if (slotIndex === -1) return

    const slot = currentSlots[slotIndex]

    // Require at least an outcome to be selected
    if (!slot.pendingOutcome && !slot.pendingPipelineStage) {
      toast({
        title: "No outcome selected",
        description: "Please select an outcome or pipeline stage before saving.",
        variant: "destructive",
      })
      return
    }

    const outcome = slot.pendingOutcome || "connected"
    const pipelineStage = slot.pendingPipelineStage as PipelineStage | undefined
    const contact = slot.contact

    // CRITICAL: Disconnect any active Twilio call FIRST
    if (activeCallRef.current) {
      try {
        activeCallRef.current.disconnect()
      } catch (e) {
        console.error("Error disconnecting call:", e)
      }
      activeCallRef.current = null
    }

    // Save call outcome + mark task done in parallel (fire-and-forget for speed)
    const savePromises: Promise<any>[] = []

    if (slot.callId) {
      savePromises.push(
        fetch(`/api/calls/${slot.callId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outcome,
            ...(pipelineStage && { pipelineStage }),
            notes: slot.notes,
            endedAt: new Date().toISOString(),
          }),
        }).catch(err => console.error("Error saving call outcome:", err))
      )
    }

    if (slot.taskId) {
      savePromises.push(
        fetch(`/api/tasks/${slot.taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "done" }),
        }).catch(err => console.error("Error completing task:", err))
      )
    }

    // Advance the sequence step so this prospect doesn't reappear in queue
    if (slot.prospectId && slot.sequenceId) {
      savePromises.push(
        fetch("/api/dialer/complete-step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prospectId: slot.prospectId,
            sequenceId: slot.sequenceId,
          }),
        }).catch(err => console.error("Error advancing sequence step:", err))
      )
    }

    // Fire all in parallel — don't block UI advancement
    Promise.all(savePromises)

    // Remove this prospect from the local queue so it doesn't reappear
    if (slot.queueItemId) {
      setApiProspects(prev => prev.filter(p => p.id !== slot.queueItemId))
    }

    // Show appropriate toast
    if (pipelineStage) {
      toast({
        title: `Saved: ${outcomeLabels[outcome] || outcome} + ${pipelineStageLabels[pipelineStage]}`,
        description: contact ? `${contact.name} moved to ${pipelineStageLabels[pipelineStage]}` : "Saved",
      })
    } else {
      toast({
        title: `Saved: ${outcomeLabels[outcome] || outcome}`,
        description: contact ? `Call with ${contact.name} saved` : "Call saved",
      })
    }

    // Update stats
    setStats(prev => ({
      ...prev,
      totalCalls: prev.totalCalls + 1,
      connected: outcome.startsWith("connected") ? prev.connected + 1 : prev.connected,
      voicemail: outcome === "voicemail" ? prev.voicemail + 1 : prev.voicemail,
      noAnswer: outcome === "no_answer" ? prev.noAnswer + 1 : prev.noAnswer,
      pipeline: pipelineStage ? prev.pipeline + 1 : prev.pipeline,
    }))

    // Reset slot and advance
    setCallSlots(prev => prev.map((s, idx) =>
      idx === slotIndex
        ? { id: slotId, status: "idle" as CallStatus, contact: null, startTime: null, notes: "" }
        : s
    ))
    setShowOutcomeButtons(false)
    setCallDuration(0)
    setIsMuted(false)
    callStartTimeRef.current = null

    // Auto-dial next
    if (sessionActive && !sessionPaused) {
      const nextIndex = currentProspectIndex + 1
      if (nextIndex < mockProspects.length) {
        setCurrentProspectIndex(nextIndex)
        setQueueSize(prev => Math.max(0, prev - 1))
        setTimeout(() => {
          const nextProspect = mockProspects[nextIndex]
          if (nextProspect) {
            connectCall(nextProspect, slotIndex)
          }
        }, 1500)
      } else {
        setSessionActive(false)
        toast({
          title: "Session Complete",
          description: "You've reached the end of the call queue.",
        })
      }
    }
  }

  const skipProspect = (slotId: string) => {
    const currentSlots = callSlotsRef.current
    const slotIndex = currentSlots.findIndex(s => s.id === slotId)
    if (slotIndex === -1) return

    const slot = currentSlots[slotIndex]

    // End any active call
    if (activeCallRef.current && (slot.status === "ringing" || slot.status === "connected")) {
      activeCallRef.current.disconnect()
      activeCallRef.current = null
    }

    // Remove from local queue so it doesn't come back
    if (slot.queueItemId) {
      setApiProspects(prev => prev.filter(p => p.id !== slot.queueItemId))
    }

    toast({
      title: "Skipped",
      description: slot.contact ? `Skipped ${slot.contact.name}` : "Prospect skipped",
    })

    // Reset slot
    setCallSlots(prev => prev.map((s, idx) =>
      idx === slotIndex
        ? { id: slotId, status: "idle" as CallStatus, contact: null, startTime: null, notes: "" }
        : s
    ))
    setShowOutcomeButtons(false)
    setCallDuration(0)
    callStartTimeRef.current = null

    // Auto-advance to next
    if (sessionActive && !sessionPaused) {
      const nextIndex = currentProspectIndex + 1
      if (nextIndex < mockProspects.length) {
        setCurrentProspectIndex(nextIndex)
        setQueueSize(prev => Math.max(0, prev - 1))
        setTimeout(() => {
          const nextProspect = mockProspects[nextIndex]
          if (nextProspect) {
            connectCall(nextProspect, slotIndex)
          }
        }, 500)
      } else {
        setSessionActive(false)
        toast({
          title: "Session Complete",
          description: "No more prospects in queue.",
        })
      }
    }
  }

  // Quick-dial a specific prospect without starting a full session
  const quickDial = useCallback((prospect: DialerProspect) => {
    if (!deviceReady) {
      toast({
        title: "Not Ready",
        description: "Calling device is still initializing. Please wait.",
        variant: "destructive",
      })
      return
    }
    if (!prospect.phone) {
      toast({
        title: "No Phone Number",
        description: `${prospect.name} doesn't have a phone number.`,
        variant: "destructive",
      })
      return
    }

    // Load prospect into the call slot and dial
    setCallSlots([{
      id: "1",
      status: "idle" as CallStatus,
      contact: prospect,
      startTime: null,
      notes: "",
      pendingOutcome: undefined,
      pendingPipelineStage: undefined,
    }])

    // Small delay to let state settle, then connect
    setTimeout(() => {
      connectCall(prospect, 0)
    }, 200)
  }, [deviceReady, connectCall, toast])

  const updateNotes = (slotId: string, notes: string) => {
    setCallSlots(prev => prev.map(slot =>
      slot.id === slotId ? { ...slot, notes } : slot
    ))
  }

  // Open email dialog for a contact
  const openEmailDialog = (contact: DialerProspect) => {
    setEmailProspect({
      id: contact.email, // Use email as ID for mock data
      name: contact.name,
      email: contact.email,
      title: contact.title,
      company: contact.company,
    })
    setEmailDialogOpen(true)
  }

  // Open Google Calendar with pre-filled meeting details
  const openCalendarInvite = (contact: DialerProspect) => {
    const title = encodeURIComponent(`Meeting with ${contact.name} - ${contact.company}`)
    const details = encodeURIComponent(`Follow-up call with ${contact.name}, ${contact.title} at ${contact.company}\n\nEmail: ${contact.email}\nPhone: ${contact.phone}`)

    // Default to 30 min meeting starting tomorrow at 10am
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    const endTime = new Date(tomorrow)
    endTime.setMinutes(endTime.getMinutes() + 30)

    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "")
    const startStr = formatDate(tomorrow)
    const endStr = formatDate(endTime)

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${startStr}/${endStr}&add=${encodeURIComponent(contact.email)}`

    window.open(calendarUrl, "_blank")
  }

  const toggleExpanded = (slotId: string) => {
    setExpandedSlots(prev => {
      const newSet = new Set(prev)
      if (newSet.has(slotId)) {
        newSet.delete(slotId)
      } else {
        newSet.add(slotId)
      }
      return newSet
    })
  }

  // Load a prospect into the call card without auto-dialing
  const loadProspectCard = (prospect: DialerProspect) => {
    setCallSlots([{
      id: "1",
      status: "idle" as CallStatus,
      contact: prospect,
      startTime: null,
      notes: "",
      pendingOutcome: undefined,
      pendingPipelineStage: undefined,
      taskId: prospect.taskId,
      queueItemId: prospect.id,
      prospectId: prospect.prospectId || null,
      sequenceId: prospect.sequenceId || null,
    }])
    // Auto-expand the card
    setExpandedSlots(prev => new Set(prev).add("1"))
  }

  const dialOneOff = async (prospect: DialerProspect) => {
    // Find first available idle slot
    const slotIndex = callSlots.findIndex(s => s.status === "idle")
    if (slotIndex === -1) {
      toast({
        title: "All slots busy",
        description: "Complete an active call before dialing another prospect",
        variant: "destructive",
      })
      return
    }

    await connectCall(prospect, slotIndex)
    setQueueSize(prev => Math.max(0, prev - 1))
  }

  const startEditingPhone = (slotId: string, currentPhone: string) => {
    setEditingPhoneId(slotId)
    setEditedPhone(currentPhone)
  }

  const saveEditedPhone = (slotId: string) => {
    setCallSlots(prev => prev.map(slot => {
      if (slot.id === slotId && slot.contact) {
        return {
          ...slot,
          contact: {
            ...slot.contact,
            phone: editedPhone
          }
        }
      }
      return slot
    }))
    setEditingPhoneId(null)
    setEditedPhone("")

    toast({
      title: "Phone number updated",
      description: "Call will use the new number",
    })
  }

  const cancelEditingPhone = () => {
    setEditingPhoneId(null)
    setEditedPhone("")
  }

  const saveNote = (contactId: string, noteType: "prospect" | "account", noteText: string) => {
    if (noteType === "prospect") {
      setProspectNotes(prev => ({ ...prev, [contactId]: noteText }))
    } else {
      setAccountNotes(prev => ({ ...prev, [contactId]: noteText }))
    }
    setEditingNoteId(null)
    setEditingNoteType(null)

    toast({
      title: "Note saved",
      description: `${noteType === "prospect" ? "Prospect" : "Account"} note updated successfully`,
    })
  }

  const getHistorySummary = (history: any[]) => {
    if (!history || history.length === 0) {
      return "No previous history for this prospect"
    }

    const sortedHistory = [...history].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return sortedHistory.map(item =>
      `${item.date}: ${item.from} - ${item.summary}`
    ).join(" | ")
  }

  // Map common city/state/country strings to IANA timezone
  const getTimezoneFromLocation = (location: string | null | undefined): string | null => {
    if (!location) return null
    const loc = location.toLowerCase()
    // US cities/states
    if (/new york|nyc|manhattan|brooklyn|new jersey|new brunswick|newark|nj|ny\b|connecticut|ct\b|boston|massachusetts|ma\b|philadelphia|pennsylvania|pa\b|washington.*d\.?c|virginia|va\b|maryland|md\b|maine|me\b|vermont|vt\b|new hampshire|nh\b|rhode island|ri\b|delaware|de\b|east coast/i.test(loc)) return "America/New_York"
    if (/chicago|illinois|il\b|wisconsin|wi\b|minnesota|mn\b|iowa|ia\b|missouri|mo\b|indiana|in\b|michigan|mi\b|ohio|oh\b|central time|midwest|nashville|tennessee|tn\b|memphis|milwaukee|detroit|cleveland|columbus|kansas city|omaha|nebraska|ne\b|north dakota|nd\b|south dakota|sd\b/i.test(loc)) return "America/Chicago"
    if (/denver|colorado|co\b|utah|ut\b|arizona|az\b|phoenix|mountain time|albuquerque|new mexico|nm\b|montana|mt\b|wyoming|wy\b|idaho|id\b|boise|salt lake/i.test(loc)) return "America/Denver"
    if (/los angeles|san francisco|california|ca\b|seattle|washington state|wa\b|portland|oregon|or\b|pacific time|west coast|san diego|san jose|silicon valley|las vegas|nevada|nv\b/i.test(loc)) return "America/Los_Angeles"
    if (/hawaii|hi\b|honolulu/i.test(loc)) return "Pacific/Honolulu"
    if (/alaska|ak\b|anchorage/i.test(loc)) return "America/Anchorage"
    if (/texas|tx\b|dallas|houston|austin|san antonio/i.test(loc)) return "America/Chicago"
    if (/atlanta|georgia|ga\b|florida|fl\b|miami|tampa|orlando|carolina|nc\b|sc\b|charlotte|raleigh|jacksonville/i.test(loc)) return "America/New_York"
    // Canada
    if (/toronto|ontario|ottawa|montreal|quebec/i.test(loc)) return "America/Toronto"
    if (/vancouver|british columbia/i.test(loc)) return "America/Vancouver"
    if (/calgary|edmonton|alberta/i.test(loc)) return "America/Edmonton"
    // UK/Europe
    if (/london|united kingdom|uk\b|england|britain/i.test(loc)) return "Europe/London"
    if (/paris|france/i.test(loc)) return "Europe/Paris"
    if (/berlin|germany|munich|frankfurt/i.test(loc)) return "Europe/Berlin"
    if (/amsterdam|netherlands|dutch/i.test(loc)) return "Europe/Amsterdam"
    if (/dublin|ireland/i.test(loc)) return "Europe/Dublin"
    if (/stockholm|sweden/i.test(loc)) return "Europe/Stockholm"
    if (/madrid|spain|barcelona/i.test(loc)) return "Europe/Madrid"
    if (/rome|italy|milan/i.test(loc)) return "Europe/Rome"
    // Asia/Pacific
    if (/sydney|melbourne|australia|brisbane/i.test(loc)) return "Australia/Sydney"
    if (/tokyo|japan/i.test(loc)) return "Asia/Tokyo"
    if (/singapore/i.test(loc)) return "Asia/Singapore"
    if (/hong kong/i.test(loc)) return "Asia/Hong_Kong"
    if (/mumbai|delhi|india|bangalore|hyderabad/i.test(loc)) return "Asia/Kolkata"
    if (/dubai|uae|abu dhabi/i.test(loc)) return "Asia/Dubai"
    if (/tel aviv|israel|jerusalem/i.test(loc)) return "Asia/Jerusalem"
    return null
  }

  const getLocalTime = (location: string | null | undefined): string | null => {
    const tz = getTimezoneFromLocation(location)
    if (!tz) return null
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date())
    } catch {
      return null
    }
  }

  const getTimezoneAbbr = (location: string | null | undefined): string | null => {
    const tz = getTimezoneFromLocation(location)
    if (!tz) return null
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "short",
      }).formatToParts(new Date())
      return parts.find(p => p.type === "timeZoneName")?.value || null
    } catch {
      return null
    }
  }

  const CallTimer = ({ startTime }: { startTime: number | null }) => {
    const [elapsed, setElapsed] = useState(0)

    useEffect(() => {
      if (!startTime) return
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }, [startTime])

    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60

    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {minutes}:{seconds.toString().padStart(2, "0")}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Power Dialer
          </h1>
          <p className="text-sm text-muted-foreground">
            Dial prospects one at a time
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Device Status */}
          {deviceError ? (
            <Badge variant="destructive" className="flex items-center gap-1">
              <PhoneOff className="h-3 w-3" />
              Device Error
            </Badge>
          ) : deviceReady ? (
            <Badge variant="outline" className="flex items-center gap-1 border-green-500/50 text-green-600">
              <Phone className="h-3 w-3" />
              Ready
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Initializing...
            </Badge>
          )}

          {!sessionActive ? (
            <Button
              onClick={startSession}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={!deviceReady}
            >
              <Play className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          ) : (
            <>
              {/* Active call controls */}
              {callSlots.some(s => s.status === "ringing" || s.status === "connected") && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-medium">
                      {String(Math.floor(callDuration / 60)).padStart(2, '0')}:{String(callDuration % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="border-l border-primary/30 h-5 mx-1" />
                  <Button
                    size="sm"
                    variant={isMuted ? "secondary" : "ghost"}
                    onClick={toggleMute}
                    className="h-7 px-2"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={endCall}
                    className="h-7 px-2"
                  >
                    <PhoneOff className="h-3 w-3 mr-1" />
                    End
                  </Button>
                </div>
              )}
              <Button
                onClick={pauseSession}
                variant="outline"
                disabled={callSlots.some(s => s.status === "ringing" || s.status === "connected")}
              >
                {sessionPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                {sessionPaused ? "Resume" : "Pause"}
              </Button>
              <Button onClick={stopSession} variant="destructive">
                <PhoneOff className="h-4 w-4 mr-2" />
                End Session
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCalls}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.connected}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voicemail</CardTitle>
            <Voicemail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.voicemail}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Answer</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.noAnswer}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card border-green-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
            <Rocket className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.pipeline}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls/Hour</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.callsPerHour}</div>
          </CardContent>
        </Card>
      </div>

      {/* Session Configuration */}
      {!sessionActive && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Session Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="sequence-select" className="text-sm">Sequence</Label>
                <Select value={selectedSequence} onValueChange={setSelectedSequence}>
                  <SelectTrigger id="sequence-select">
                    <SelectValue placeholder="Select sequence" />
                  </SelectTrigger>
                  <SelectContent>
                    {sequences.map((seq) => (
                      <SelectItem key={seq.id} value={seq.id}>
                        {seq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {loadingProspects ? "Loading..." : `${mockProspects.length} prospects available`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort-select" className="text-sm">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger id="sort-select">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_date">Due Date</SelectItem>
                    <SelectItem value="added_newest">Date Added (Newest)</SelectItem>
                    <SelectItem value="added_oldest">Date Added (Oldest)</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="company">Company (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Order of prospects in queue
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-select" className="text-sm">Caller ID</Label>
                <Select value={selectedPhone} onValueChange={setSelectedPhone}>
                  <SelectTrigger id="phone-select">
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
                <p className="text-xs text-muted-foreground">
                  Outbound caller ID
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Time Zones</Label>
                <div className="flex flex-wrap gap-2">
                  {["EST", "CST", "MST", "PST"].map(tz => (
                    <button
                      key={tz}
                      onClick={() => setSelectedTimezones(prev =>
                        prev.includes(tz) ? prev.filter(t => t !== tz) : [...prev, tz]
                      )}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        selectedTimezones.includes(tz)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {tz}
                    </button>
                  ))}
                  {selectedTimezones.length > 0 && (
                    <button
                      onClick={() => setSelectedTimezones([])}
                      className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTimezones.length > 0 ? `Showing ${selectedTimezones.join(", ")} only` : "All time zones"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prospect Queue - Row-based layout, only show when session is not active */}
      {!sessionActive && mockProspects.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Call Queue</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {mockProspects.length} prospect{mockProspects.length !== 1 ? "s" : ""} to call
              </p>
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">#</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Name</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Company</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Call Step</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Local Time</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Insights</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground text-xs w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {mockProspects.map((prospect, idx) => {
                    const loc = prospect.location || prospect.accountInfo?.location || null
                    const localTime = getLocalTime(loc)
                    const tzAbbr = getTimezoneAbbr(loc)
                    const insightBullets: string[] = []
                    if (prospect.companyDescription) {
                      insightBullets.push(prospect.companyDescription.length > 80 ? prospect.companyDescription.slice(0, 80) + "..." : prospect.companyDescription)
                    } else if (prospect.accountInfo?.industry) {
                      insightBullets.push(prospect.accountInfo.industry + (prospect.accountInfo?.employees ? `, ${prospect.accountInfo.employees.toLocaleString()} employees` : ""))
                    }
                    if (prospect.priorCalls && prospect.priorCalls.length > 0) {
                      insightBullets.push(`${prospect.priorCalls.length} prior call${prospect.priorCalls.length !== 1 ? "s" : ""} — last: ${prospect.priorCalls[0].outcome}`)
                    }

                    return (
                      <tr key={prospect.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                        <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{prospect.name}</span>
                            {prospect.linkedin && (
                              <button
                                onClick={() => window.open(prospect.linkedin!, "_blank")}
                                className="p-0.5 rounded hover:bg-[#0A66C2]/10 transition-colors"
                                title="Open LinkedIn"
                              >
                                <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                              </button>
                            )}
                          </div>
                          {prospect.title && (
                            <div className="text-xs text-muted-foreground mt-0.5">{prospect.title}</div>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <button
                              onClick={() => loadProspectCard(prospect)}
                              className="text-xs font-mono text-primary hover:underline cursor-pointer"
                            >
                              {prospect.phone}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">{prospect.company || "—"}</div>
                          {prospect.accountInfo?.website && (
                            <a
                              href={prospect.accountInfo.website.startsWith("http") ? prospect.accountInfo.website : `https://${prospect.accountInfo.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary hover:underline"
                            >
                              {prospect.accountInfo.website.replace(/^https?:\/\//, "")}
                            </a>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">
                            {prospect.sequenceStage || "—"}
                          </Badge>
                          {prospect.sequence && (
                            <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[140px]">{prospect.sequence}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {localTime ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm font-medium">{localTime}</span>
                                <span className="text-[10px] text-muted-foreground">{tzAbbr}</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground truncate max-w-[120px]">{loc}</span>
                              </div>
                            </div>
                          ) : loc ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{loc}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {insightBullets.length > 0 ? (
                            <ul className="space-y-0.5 text-xs text-muted-foreground">
                              {insightBullets.map((b, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-primary mt-1 flex-shrink-0">•</span>
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                                <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setApiProspects(prev => prev.filter(p => p.id !== prospect.id))
                                toast({ title: "Skipped", description: `${prospect.name} removed from this session's queue` })
                              }}>
                                <SkipForward className="h-4 w-4 mr-2" />
                                Skip
                              </DropdownMenuItem>
                              {prospect.sequenceId && prospect.prospectId && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/sequences/${prospect.sequenceId}/prospects/${prospect.prospectId}`, { method: "DELETE" })
                                      if (res.ok) {
                                        setApiProspects(prev => prev.filter(p => p.id !== prospect.id))
                                        toast({ title: "Removed", description: `${prospect.name} removed from sequence` })
                                      } else {
                                        toast({ title: "Error", description: "Failed to remove from sequence", variant: "destructive" })
                                      }
                                    } catch {
                                      toast({ title: "Error", description: "Failed to remove from sequence", variant: "destructive" })
                                    }
                                  }}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Remove from Sequence
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Active Calls Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Active Calls</h2>
            {sessionActive && selectedSequence !== "all" && (
              <p className="text-xs text-muted-foreground mt-1">
                Sequence: {sequences.find(s => s.id === selectedSequence)?.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {sessionActive && (
              <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                <Phone className="h-3 w-3 mr-1" />
                {selectedPhone}
              </Badge>
            )}
            <Badge variant="outline" className="border-primary/50 text-primary">
              {queueSize} in queue
            </Badge>
          </div>
        </div>

        {/* Row-based layout when session is active, card-based when not */}
        {sessionActive ? (
          <div className="space-y-3">
            {callSlots.slice(0, 1).map((slot) => (
              <div
                key={slot.id}
                className={`rounded-lg border p-4 ${
                  slot.status === "ringing"
                    ? "border-primary/50 bg-primary/5"
                    : slot.status === "connected"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card"
                }`}
              >
                {slot.contact ? (
                  <div className="space-y-3">
                    {/* Clickable header row - click anywhere to expand/collapse */}
                    <div
                      className="flex items-center gap-4 flex-wrap cursor-pointer"
                      onClick={() => toggleExpanded(slot.id)}
                    >
                      {/* Status, Timer, and Call Controls */}
                      <div className="flex items-center gap-2 min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                        {slot.status === "ringing" && (
                          <>
                            <Badge className="bg-primary/20 text-primary border-0 animate-pulse">
                              <PhoneCall className="h-3 w-3 mr-1" />
                              Ringing
                            </Badge>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={endCall}
                              className="h-7 px-2"
                            >
                              <PhoneOff className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {slot.status === "connected" && (
                          <>
                            <Badge className="bg-primary text-primary-foreground border-0">
                              <PhoneCall className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                            <Button
                              size="sm"
                              variant={isMuted ? "secondary" : "outline"}
                              onClick={toggleMute}
                              className="h-7 px-2"
                              title={isMuted ? "Unmute" : "Mute"}
                            >
                              {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={endCall}
                              className="h-7 px-2"
                            >
                              <PhoneOff className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {slot.status === "completed" && (
                          <Badge variant="outline" className="border-muted-foreground/50">
                            Completed • {String(Math.floor(callDuration / 60)).padStart(2, '0')}:{String(callDuration % 60).padStart(2, '0')}
                          </Badge>
                        )}
                        {slot.status === "idle" && (
                          <Badge variant="outline">Idle</Badge>
                        )}
                        {(slot.status === "ringing" || slot.status === "connected") && slot.startTime && <CallTimer startTime={slot.startTime} />}
                      </div>

                      {/* Contact Info */}
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm">{slot.contact.name}</span>
                          {slot.contact.linkedin && (
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(slot.contact!.linkedin!, "_blank") }}
                              className="p-0.5 rounded hover:bg-[#0A66C2]/10 transition-colors"
                              title="Open LinkedIn"
                            >
                              <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                            </button>
                          )}
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{slot.contact.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{slot.contact.company}</span>
                          {((slot.contact as any).location || (slot.contact.accountInfo as any)?.location) && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{(slot.contact as any).location || (slot.contact.accountInfo as any)?.location}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {editingPhoneId === slot.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="tel"
                              value={editedPhone}
                              onChange={(e) => setEditedPhone(e.target.value)}
                              className="font-mono text-xs h-6 px-2 w-32"
                              autoFocus
                            />
                            <button
                              onClick={() => saveEditedPhone(slot.id)}
                              className="p-0.5 hover:bg-primary/10 rounded"
                            >
                              <Check className="h-3 w-3 text-primary" />
                            </button>
                            <button
                              onClick={cancelEditingPhone}
                              className="p-0.5 hover:bg-destructive/10 rounded"
                            >
                              <X className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-mono text-xs">{slot.contact.phone}</span>
                            <button
                              onClick={() => slot.contact && startEditingPhone(slot.id, slot.contact.phone)}
                              className="p-0.5 hover:bg-muted rounded"
                              title="Edit phone number"
                            >
                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* 3-dot menu + expand/collapse */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => skipProspect(slot.id)}>
                              <SkipForward className="h-4 w-4 mr-2" />
                              Skip
                            </DropdownMenuItem>
                            {slot.contact?.email && (
                              <DropdownMenuItem onClick={() => openEmailDialog(slot.contact as any)}>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="cursor-pointer" onClick={() => toggleExpanded(slot.id)}>
                          {expandedSlots.has(slot.id) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Outcome, Pipeline, and Save & Next - always visible */}
                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
                        {/* Outcome dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant={slot.pendingOutcome ? "default" : "outline"}
                              className={slot.pendingOutcome ? "bg-primary hover:bg-primary/90 text-primary-foreground h-7" : "h-7"}
                            >
                              <UserCheck className="h-3 w-3 mr-1" />
                              {slot.pendingOutcome ? outcomeLabels[slot.pendingOutcome] || slot.pendingOutcome : "Outcome"}
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "connected_intro_booked")}>
                              <CalendarCheck className="h-4 w-4 mr-2 text-green-500" />
                              Intro Booked
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "connected_referral")}>
                              <UserCheck className="h-4 w-4 mr-2 text-blue-500" />
                              Referral
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "connected_not_interested")}>
                              <UserX className="h-4 w-4 mr-2 text-orange-500" />
                              Not Interested
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "connected_info_gathered")}>
                              <FileText className="h-4 w-4 mr-2 text-purple-500" />
                              Informational
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "callback")}>
                              <Phone className="h-4 w-4 mr-2 text-amber-500" />
                              Call Back Later
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "voicemail")}>
                              <Voicemail className="h-4 w-4 mr-2" />
                              Voicemail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "no_answer")}>
                              <UserX className="h-4 w-4 mr-2" />
                              No Answer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "no_answer")}>
                              <SkipForward className="h-4 w-4 mr-2" />
                              Skip
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Pipeline dropdown - separate from outcome */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant={slot.pendingPipelineStage ? "default" : "outline"}
                              className={slot.pendingPipelineStage ? "bg-green-600 hover:bg-green-700 text-white h-7" : "h-7"}
                            >
                              <Rocket className="h-3 w-3 mr-1" />
                              {slot.pendingPipelineStage ? pipelineStageLabels[slot.pendingPipelineStage as PipelineStage] || slot.pendingPipelineStage : "Pipeline"}
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => handlePipelineOutcome(slot.id, "interested")}>
                              <Star className="h-4 w-4 mr-2 text-yellow-500" />
                              Interested
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePipelineOutcome(slot.id, "intro_booked")}>
                              <CalendarCheck className="h-4 w-4 mr-2 text-blue-500" />
                              Intro Booked
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePipelineOutcome(slot.id, "opportunity")}>
                              <Target className="h-4 w-4 mr-2 text-purple-500" />
                              Opportunity
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePipelineOutcome(slot.id, "demo_booked")}>
                              <Handshake className="h-4 w-4 mr-2 text-green-500" />
                              Demo Booked
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="border-l border-border h-5 mx-1" />

                        {/* Save & Next - always visible */}
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white h-7"
                          onClick={() => saveAndAdvance(slot.id)}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save & Next
                        </Button>

                        <div className="border-l border-border h-5 mx-1" />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => slot.contact && openEmailDialog(slot.contact as any)}
                          className="h-7"
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => slot.contact && openCalendarInvite(slot.contact as any)}
                          className="h-7"
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Calendar
                      </Button>
                    </div>

                    {/* Expandable details section */}
                    {expandedSlots.has(slot.id) && (
                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-border">
                          {/* AI Notes / POV */}
                          {(slot.contact.title || (slot.contact as any).companyDescription || (slot.contact.accountInfo as any)?.industry || (slot.contact.accountInfo as any)?.employees) && (
                          <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-primary mb-1">Insights</p>
                                <ul className="space-y-1 text-xs text-foreground leading-relaxed list-disc list-inside">
                                  {slot.contact.title && slot.contact.company && (
                                    <li>{slot.contact.name} is {slot.contact.title} at {slot.contact.company}</li>
                                  )}
                                  {((slot.contact as any).companyDescription || (slot.contact.accountInfo as any)?.industry || (slot.contact.accountInfo as any)?.employees) && (
                                    <li>
                                      {slot.contact.company}{(slot.contact.accountInfo as any)?.employees ? `, ${(slot.contact.accountInfo as any).employees.toLocaleString()} employees` : ""}
                                      {(slot.contact as any).companyDescription ? ` — ${(slot.contact as any).companyDescription}` : (slot.contact.accountInfo as any)?.industry ? ` — ${(slot.contact.accountInfo as any).industry}` : ""}
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                          )}

                          {/* Contact details */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3" />
                              <span>{slot.contact.email}</span>
                            </div>
                            {(slot.contact.accountInfo as any)?.website && (
                              <a href={(slot.contact.accountInfo as any).website.startsWith("http") ? (slot.contact.accountInfo as any).website : `https://${(slot.contact.accountInfo as any).website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                                <Globe className="h-3 w-3" />
                                <span>Website</span>
                              </a>
                            )}
                            <Badge variant="outline" className="text-xs h-5">
                              {slot.contact.sequenceStage}
                            </Badge>
                            <span>Last email: {slot.contact.lastEmailSent}</span>
                          </div>

                          {/* Prior Call History */}
                          {slot.contact.priorCalls.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                <History className="h-3 w-3" />
                                Call History
                              </p>
                              {slot.contact.priorCalls.map((call, idx) => (
                                <div key={idx} className="p-2 rounded bg-secondary/30 border border-border">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium">{call.date}</span>
                                    <Badge variant="outline" className="text-xs h-5">
                                      {call.outcome}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{call.notes}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Correspondence History Summary */}
                          <div className="p-2 rounded-lg bg-muted/30 border border-border">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-foreground mb-1">Correspondence History</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {getHistorySummary((slot.contact as any).correspondenceHistory)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Account / Company Info */}
                          {(slot.contact as any).accountInfo && (
                            <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                              <div className="flex items-start gap-2">
                                <Building2 className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-foreground mb-1.5">Company Info — {slot.contact.company}</p>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    {(slot.contact as any).accountInfo.industry && (
                                      <span>{(slot.contact as any).accountInfo.industry}</span>
                                    )}
                                    {(slot.contact as any).accountInfo.employees && (
                                      <span>{(slot.contact as any).accountInfo.employees.toLocaleString()} employees</span>
                                    )}
                                    {(slot.contact as any).accountInfo.location && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {(slot.contact as any).accountInfo.location}
                                      </span>
                                    )}
                                    {(slot.contact as any).accountInfo.website && (
                                      <a
                                        href={(slot.contact as any).accountInfo.website.startsWith('http') ? (slot.contact as any).accountInfo.website : `https://${(slot.contact as any).accountInfo.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-blue-500 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Globe className="h-3 w-3" />
                                        Website
                                      </a>
                                    )}
                                  </div>
                                  {/* Account Insights */}
                                  {(slot.contact as any).accountInfo.insights && (
                                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                      {(slot.contact as any).accountInfo.insights.growth && (
                                        <p><strong className="text-foreground">Growth:</strong> {(slot.contact as any).accountInfo.insights.growth}</p>
                                      )}
                                      {(slot.contact as any).accountInfo.insights.funding && (
                                        <p><strong className="text-foreground">Funding:</strong> {(slot.contact as any).accountInfo.insights.funding}</p>
                                      )}
                                      {(slot.contact as any).accountInfo.insights.hiring && (
                                        <p><strong className="text-foreground">Hiring:</strong> {(slot.contact as any).accountInfo.insights.hiring}</p>
                                      )}
                                      {(slot.contact as any).accountInfo.insights.techStack && (
                                        <p><strong className="text-foreground">Tech:</strong> {(slot.contact as any).accountInfo.insights.techStack}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Point of View */}
                          {((slot.contact as any).pov || slot.contact.title) && (
                            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                              <div className="flex items-start gap-2 mb-2">
                                <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                                <p className="text-xs font-medium text-primary">Insights</p>
                              </div>
                              <ul className="space-y-1 text-xs text-foreground leading-relaxed list-disc list-inside">
                                {slot.contact.title && slot.contact.company && (
                                  <li>{slot.contact.name} is {slot.contact.title} at {slot.contact.company}</li>
                                )}
                                {((slot.contact as any).companyDescription || (slot.contact.accountInfo as any)?.industry || (slot.contact.accountInfo as any)?.employees) && (
                                  <li>
                                    {slot.contact.company}{(slot.contact.accountInfo as any)?.employees ? `, ${(slot.contact.accountInfo as any).employees.toLocaleString()} employees` : ""}
                                    {(slot.contact as any).companyDescription ? ` — ${(slot.contact as any).companyDescription}` : (slot.contact.accountInfo as any)?.industry ? ` — ${(slot.contact.accountInfo as any).industry}` : ""}
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}

                          {/* Notes row */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Prospect Notes */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <FileText className="h-3 w-3 text-muted-foreground" />
                                  <p className="text-xs font-medium text-foreground">Prospect Notes</p>
                                </div>
                                {editingNoteId !== `${slot.id}-prospect` && (
                                  <button
                                    onClick={() => {
                                      setEditingNoteId(`${slot.id}-prospect`)
                                      setEditingNoteType("prospect")
                                    }}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    {prospectNotes[slot.contact.email] ? "Edit" : "Add"}
                                  </button>
                                )}
                              </div>
                              {editingNoteId === `${slot.id}-prospect` ? (
                                <div className="space-y-2">
                                  <Textarea
                                    placeholder="Add notes about this prospect..."
                                    defaultValue={prospectNotes[slot.contact.email] || ""}
                                    className="min-h-[60px] text-xs"
                                    id={`prospect-note-${slot.id}`}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        if (slot.contact) {
                                          const textarea = document.getElementById(`prospect-note-${slot.id}`) as HTMLTextAreaElement
                                          saveNote(slot.contact.email, "prospect", textarea.value)
                                        }
                                      }}
                                      className="h-7 text-xs"
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingNoteId(null)
                                        setEditingNoteType(null)
                                      }}
                                      className="h-7 text-xs"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded border border-border">
                                  {prospectNotes[slot.contact.email] || "No notes yet"}
                                </div>
                              )}
                            </div>

                            {/* Account Notes */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                  <p className="text-xs font-medium text-foreground">Account Notes ({slot.contact.company})</p>
                                </div>
                                {editingNoteId !== `${slot.id}-account` && (
                                  <button
                                    onClick={() => {
                                      setEditingNoteId(`${slot.id}-account`)
                                      setEditingNoteType("account")
                                    }}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    {accountNotes[slot.contact.company] ? "Edit" : "Add"}
                                  </button>
                                )}
                              </div>
                              {editingNoteId === `${slot.id}-account` ? (
                                <div className="space-y-2">
                                  <Textarea
                                    placeholder="Add notes about this account..."
                                    defaultValue={accountNotes[slot.contact.company] || ""}
                                    className="min-h-[60px] text-xs"
                                    id={`account-note-${slot.id}`}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        if (slot.contact) {
                                          const textarea = document.getElementById(`account-note-${slot.id}`) as HTMLTextAreaElement
                                          saveNote(slot.contact.company, "account", textarea.value)
                                        }
                                      }}
                                      className="h-7 text-xs"
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingNoteId(null)
                                        setEditingNoteType(null)
                                      }}
                                      className="h-7 text-xs"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded border border-border">
                                  {accountNotes[slot.contact.company] || "No notes yet"}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Call notes */}
                          <Textarea
                            placeholder="Call notes..."
                            value={slot.notes}
                            onChange={(e) => updateNotes(slot.id, e.target.value)}
                            className="min-h-[60px] text-sm"
                          />
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="py-2">
                    {(() => {
                      const nextProspect = mockProspects[currentProspectIndex + 1] || mockProspects[currentProspectIndex]
                      if (nextProspect) {
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              <span className="text-xs text-primary font-medium">Dialing next...</span>
                            </div>
                            <div className="p-3 rounded-lg border border-border bg-muted/30">
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <span className="font-semibold text-sm">{nextProspect.name}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{nextProspect.title}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{nextProspect.company}</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs font-mono text-muted-foreground">{nextProspect.phone}</span>
                              </div>
                              {nextProspect.title && (
                                <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/10">
                                  <div className="flex items-start gap-1.5">
                                    <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-foreground leading-relaxed">
                                      {nextProspect.name} is {nextProspect.title} at {nextProspect.company}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      }
                      return <div className="text-sm text-muted-foreground">No more prospects in queue</div>
                    })()}
                  </div>
                )}
              </div>
            ))}

            {/* Up Next queue preview — always visible during session */}
            {mockProspects.length > currentProspectIndex + 1 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  Up Next ({Math.min(5, mockProspects.length - currentProspectIndex - 1)} of {mockProspects.length - currentProspectIndex - 1} remaining)
                </h3>
                <div className="space-y-1.5">
                  {mockProspects.slice(currentProspectIndex + 1, currentProspectIndex + 6).map((prospect, idx) => (
                    <div
                      key={prospect.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs text-muted-foreground w-5 text-center font-mono">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{prospect.name}</span>
                          <span className="text-xs text-muted-foreground truncate">{prospect.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{prospect.company}</span>
                          <span>•</span>
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="font-mono">{prospect.phone}</span>
                        </div>
                      </div>
                      {prospect.dueDate && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {(() => {
                            try {
                              const d = new Date(prospect.dueDate)
                              if (isNaN(d.getTime())) return ""
                              return formatDistanceToNow(d, { addSuffix: true })
                            } catch { return "" }
                          })()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Rich card layout when session is not active — same format as during session */
          <div className="space-y-3">
            {callSlots.slice(0, 1).map((slot) => (
              <div
                key={slot.id}
                className={`rounded-lg border p-4 ${
                  slot.status === "ringing"
                    ? "border-primary/50 bg-primary/5"
                    : slot.status === "connected"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card"
                }`}
              >
                {slot.contact ? (
                  <div className="space-y-3">
                    {/* Header row */}
                    <div
                      className="flex items-center gap-4 flex-wrap cursor-pointer"
                      onClick={() => toggleExpanded(slot.id)}
                    >
                      {/* Status */}
                      <div className="flex items-center gap-2 min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                        {slot.status === "idle" && (
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-7"
                            onClick={() => slot.contact && dialOneOff(slot.contact as DialerProspect)}
                            disabled={!deviceReady}
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Call
                          </Button>
                        )}
                        {slot.status === "ringing" && (
                          <>
                            <Badge className="bg-primary/20 text-primary border-0 animate-pulse">
                              <PhoneCall className="h-3 w-3 mr-1" />
                              Ringing
                            </Badge>
                            <Button size="sm" variant="destructive" onClick={endCall} className="h-7 px-2">
                              <PhoneOff className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {slot.status === "connected" && (
                          <>
                            <Badge className="bg-primary text-primary-foreground border-0">
                              <PhoneCall className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                            <Button size="sm" variant={isMuted ? "secondary" : "outline"} onClick={toggleMute} className="h-7 px-2" title={isMuted ? "Unmute" : "Mute"}>
                              {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={endCall} className="h-7 px-2">
                              <PhoneOff className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {slot.status === "completed" && (
                          <Badge variant="outline" className="border-muted-foreground/50">
                            Completed • {String(Math.floor(callDuration / 60)).padStart(2, '0')}:{String(callDuration % 60).padStart(2, '0')}
                          </Badge>
                        )}
                        {(slot.status === "ringing" || slot.status === "connected") && slot.startTime && <CallTimer startTime={slot.startTime} />}
                      </div>

                      {/* Contact Info */}
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm">{slot.contact.name}</span>
                          {slot.contact.linkedin && (
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(slot.contact!.linkedin!, "_blank") }}
                              className="p-0.5 rounded hover:bg-[#0A66C2]/10 transition-colors"
                              title="Open LinkedIn"
                            >
                              <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                            </button>
                          )}
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{slot.contact.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{slot.contact.company}</span>
                          {((slot.contact as any).location || (slot.contact.accountInfo as any)?.location) && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{(slot.contact as any).location || (slot.contact.accountInfo as any)?.location}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {editingPhoneId === slot.id ? (
                          <div className="flex items-center gap-1">
                            <Input type="tel" value={editedPhone} onChange={(e) => setEditedPhone(e.target.value)} className="font-mono text-xs h-6 px-2 w-32" autoFocus />
                            <button onClick={() => saveEditedPhone(slot.id)} className="p-0.5 hover:bg-primary/10 rounded"><Check className="h-3 w-3 text-primary" /></button>
                            <button onClick={cancelEditingPhone} className="p-0.5 hover:bg-destructive/10 rounded"><X className="h-3 w-3 text-destructive" /></button>
                          </div>
                        ) : (
                          <>
                            <span className="font-mono text-xs">{slot.contact.phone}</span>
                            <button onClick={() => slot.contact && startEditingPhone(slot.id, slot.contact.phone)} className="p-0.5 hover:bg-muted rounded" title="Edit phone number">
                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Expand/collapse */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => skipProspect(slot.id)}>
                              <SkipForward className="h-4 w-4 mr-2" />
                              Skip
                            </DropdownMenuItem>
                            {slot.contact?.email && (
                              <DropdownMenuItem onClick={() => openEmailDialog(slot.contact as any)}>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="cursor-pointer" onClick={() => toggleExpanded(slot.id)}>
                          {expandedSlots.has(slot.id) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Outcome, Pipeline, and Save - always visible when call active or completed */}
                    {(slot.status === "ringing" || slot.status === "connected" || slot.status === "completed") && (
                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant={slot.pendingOutcome ? "default" : "outline"} className={slot.pendingOutcome ? "bg-primary hover:bg-primary/90 text-primary-foreground h-7" : "h-7"}>
                            <UserCheck className="h-3 w-3 mr-1" />
                            {slot.pendingOutcome ? outcomeLabels[slot.pendingOutcome] || slot.pendingOutcome : "Outcome"}
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "connected_intro_booked")}><CalendarCheck className="h-4 w-4 mr-2 text-green-500" />Intro Booked</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "connected_referral")}><UserCheck className="h-4 w-4 mr-2 text-blue-500" />Referral</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "connected_not_interested")}><UserX className="h-4 w-4 mr-2 text-orange-500" />Not Interested</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "connected_info_gathered")}><FileText className="h-4 w-4 mr-2 text-purple-500" />Informational</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "callback")}><Phone className="h-4 w-4 mr-2 text-amber-500" />Call Back Later</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "voicemail")}><Voicemail className="h-4 w-4 mr-2" />Voicemail</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "no_answer")}><UserX className="h-4 w-4 mr-2" />No Answer</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "no_answer")}><SkipForward className="h-4 w-4 mr-2" />Skip</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant={slot.pendingPipelineStage ? "default" : "outline"} className={slot.pendingPipelineStage ? "bg-green-600 hover:bg-green-700 text-white h-7" : "h-7"}>
                            <Rocket className="h-3 w-3 mr-1" />
                            {slot.pendingPipelineStage ? pipelineStageLabels[slot.pendingPipelineStage as PipelineStage] || slot.pendingPipelineStage : "Pipeline"}
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => handlePipelineOutcome(slot.id, "interested")}><Star className="h-4 w-4 mr-2 text-yellow-500" />Interested</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePipelineOutcome(slot.id, "intro_booked")}><CalendarCheck className="h-4 w-4 mr-2 text-blue-500" />Intro Booked</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePipelineOutcome(slot.id, "opportunity")}><Target className="h-4 w-4 mr-2 text-purple-500" />Opportunity</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePipelineOutcome(slot.id, "demo_booked")}><Handshake className="h-4 w-4 mr-2 text-green-500" />Demo Booked</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <div className="border-l border-border h-5 mx-1" />
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-7" onClick={() => saveAndAdvance(slot.id)}>
                        <Save className="h-3 w-3 mr-1" />
                        Save & Done
                      </Button>
                      <div className="border-l border-border h-5 mx-1" />
                      <Button size="sm" variant="outline" onClick={() => slot.contact && openEmailDialog(slot.contact as any)} className="h-7">
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => slot.contact && openCalendarInvite(slot.contact as any)} className="h-7">
                        <Calendar className="h-3 w-3 mr-1" />
                        Calendar
                      </Button>
                    </div>
                    )}

                    {/* Expandable details — same as session card */}
                    {expandedSlots.has(slot.id) && (
                      <div className="mt-3 space-y-3 pl-4 border-l-2 border-border">
                        {/* Insights */}
                        {(slot.contact.title || (slot.contact as any).companyDescription || (slot.contact.accountInfo as any)?.industry || (slot.contact.accountInfo as any)?.employees) && (
                        <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                          <div className="flex items-start gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-primary mb-1">Insights</p>
                              <ul className="space-y-1 text-xs text-foreground leading-relaxed list-disc list-inside">
                                {slot.contact.title && slot.contact.company && (
                                  <li>{slot.contact.name} is {slot.contact.title} at {slot.contact.company}</li>
                                )}
                                {((slot.contact as any).companyDescription || (slot.contact.accountInfo as any)?.industry || (slot.contact.accountInfo as any)?.employees) && (
                                  <li>
                                    {slot.contact.company}{(slot.contact.accountInfo as any)?.employees ? `, ${(slot.contact.accountInfo as any).employees.toLocaleString()} employees` : ""}
                                    {(slot.contact as any).companyDescription ? ` — ${(slot.contact as any).companyDescription}` : (slot.contact.accountInfo as any)?.industry ? ` — ${(slot.contact.accountInfo as any).industry}` : ""}
                                  </li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                        )}

                        {/* Contact details */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3" />
                            <span>{slot.contact.email}</span>
                          </div>
                          {(slot.contact.accountInfo as any)?.website && (
                            <a href={(slot.contact.accountInfo as any).website.startsWith("http") ? (slot.contact.accountInfo as any).website : `https://${(slot.contact.accountInfo as any).website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                              <Globe className="h-3 w-3" />
                              <span>Website</span>
                            </a>
                          )}
                          <Badge variant="outline" className="text-xs h-5">
                            {slot.contact.sequenceStage}
                          </Badge>
                          {slot.contact.lastEmailSent && <span>Last email: {slot.contact.lastEmailSent}</span>}
                        </div>

                        {/* Prior Call History */}
                        {slot.contact.priorCalls.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                              <History className="h-3 w-3" />
                              Call History
                            </p>
                            {slot.contact.priorCalls.map((call, idx) => (
                              <div key={idx} className="p-2 rounded bg-secondary/30 border border-border">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium">{call.date}</span>
                                  <Badge variant="outline" className="text-xs h-5">{call.outcome}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{call.notes}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Correspondence History Summary */}
                        <div className="p-2 rounded-lg bg-muted/30 border border-border">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-foreground mb-1">Correspondence History</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {getHistorySummary((slot.contact as any).correspondenceHistory)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Account / Company Info */}
                        {(slot.contact as any).accountInfo && (
                          <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                            <div className="flex items-start gap-2">
                              <Building2 className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-foreground mb-1.5">Company Info — {slot.contact.company}</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                  {(slot.contact as any).accountInfo.industry && <span>{(slot.contact as any).accountInfo.industry}</span>}
                                  {(slot.contact as any).accountInfo.employees && <span>{(slot.contact as any).accountInfo.employees.toLocaleString()} employees</span>}
                                  {(slot.contact as any).accountInfo.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{(slot.contact as any).accountInfo.location}</span>}
                                  {(slot.contact as any).accountInfo.website && (
                                    <a href={(slot.contact as any).accountInfo.website.startsWith('http') ? (slot.contact as any).accountInfo.website : `https://${(slot.contact as any).accountInfo.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                                      <Globe className="h-3 w-3" />Website
                                    </a>
                                  )}
                                </div>
                                {(slot.contact as any).accountInfo.insights && (
                                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                    {(slot.contact as any).accountInfo.insights.growth && <p><strong className="text-foreground">Growth:</strong> {(slot.contact as any).accountInfo.insights.growth}</p>}
                                    {(slot.contact as any).accountInfo.insights.funding && <p><strong className="text-foreground">Funding:</strong> {(slot.contact as any).accountInfo.insights.funding}</p>}
                                    {(slot.contact as any).accountInfo.insights.hiring && <p><strong className="text-foreground">Hiring:</strong> {(slot.contact as any).accountInfo.insights.hiring}</p>}
                                    {(slot.contact as any).accountInfo.insights.techStack && <p><strong className="text-foreground">Tech:</strong> {(slot.contact as any).accountInfo.insights.techStack}</p>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Notes row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <FileText className="h-3 w-3 text-muted-foreground" />
                                <p className="text-xs font-medium text-foreground">Prospect Notes</p>
                              </div>
                              {editingNoteId !== `${slot.id}-prospect` && (
                                <button onClick={() => { setEditingNoteId(`${slot.id}-prospect`); setEditingNoteType("prospect") }} className="text-xs text-primary hover:underline">
                                  {prospectNotes[slot.contact.email] ? "Edit" : "Add"}
                                </button>
                              )}
                            </div>
                            {editingNoteId === `${slot.id}-prospect` ? (
                              <div className="space-y-2">
                                <Textarea placeholder="Add notes about this prospect..." defaultValue={prospectNotes[slot.contact.email] || ""} className="min-h-[60px] text-xs" id={`prospect-note-${slot.id}`} />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => { if (slot.contact) { const textarea = document.getElementById(`prospect-note-${slot.id}`) as HTMLTextAreaElement; saveNote(slot.contact.email, "prospect", textarea.value) } }} className="h-7 text-xs"><Save className="h-3 w-3 mr-1" />Save</Button>
                                  <Button size="sm" variant="outline" onClick={() => { setEditingNoteId(null); setEditingNoteType(null) }} className="h-7 text-xs">Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded border border-border">{prospectNotes[slot.contact.email] || "No notes yet"}</div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <p className="text-xs font-medium text-foreground">Account Notes ({slot.contact.company})</p>
                              </div>
                              {editingNoteId !== `${slot.id}-account` && (
                                <button onClick={() => { setEditingNoteId(`${slot.id}-account`); setEditingNoteType("account") }} className="text-xs text-primary hover:underline">
                                  {accountNotes[slot.contact.company] ? "Edit" : "Add"}
                                </button>
                              )}
                            </div>
                            {editingNoteId === `${slot.id}-account` ? (
                              <div className="space-y-2">
                                <Textarea placeholder="Add notes about this account..." defaultValue={accountNotes[slot.contact.company] || ""} className="min-h-[60px] text-xs" id={`account-note-${slot.id}`} />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => { if (slot.contact) { const textarea = document.getElementById(`account-note-${slot.id}`) as HTMLTextAreaElement; saveNote(slot.contact.company, "account", textarea.value) } }} className="h-7 text-xs"><Save className="h-3 w-3 mr-1" />Save</Button>
                                  <Button size="sm" variant="outline" onClick={() => { setEditingNoteId(null); setEditingNoteType(null) }} className="h-7 text-xs">Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded border border-border">{accountNotes[slot.contact.company] || "No notes yet"}</div>
                            )}
                          </div>
                        </div>

                        {/* Call notes */}
                        <Textarea placeholder="Call notes..." value={slot.notes} onChange={(e) => updateNotes(slot.id, e.target.value)} className="min-h-[60px] text-sm" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-2">Click a prospect&apos;s phone number in the queue to load their details here</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email Dialog */}
      <SendEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        prospect={emailProspect}
      />
    </div>
  )
}
