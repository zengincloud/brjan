"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
  Bell,
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
  Search,
} from "lucide-react"
import { SendEmailDialog } from "@/components/send-email-dialog"
import { Calendar as CalendarIcon, CalendarClock } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Link from "next/link"
import { Device, Call as TwilioCall } from "@twilio/voice-sdk"
import { formatDistanceToNow } from "date-fns"
import { useUserRole } from "@/hooks/use-user-role"
import { useSessionState } from "@/hooks/use-session-state"
import { getLocalTime, getTimezoneAbbr } from "@/lib/timezone"
import { useUser } from "@/hooks/use-user"
import { TrialLimitBanner } from "@/components/trial-limit-banner"
import { TRIAL_LIMITS } from "@/lib/trial-limits"

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
    priorCalls: { date: string; outcome: string; notes: string; calledBy?: string }[]
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
  pendingCallbackDate?: Date
  pendingCallbackNotes?: string
  finalDuration?: number
}

type SessionStats = {
  totalCalls: number
  connected: number
  conversations: number
  introsBooked: number
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
  timezone?: string | null
  companyDescription?: string | null
  industry?: string
  companySize?: string
  businessDescription?: string
  whatTheySell?: string
  aiNotes?: string
  priorCalls?: { date: string; outcome: string; notes: string; calledBy?: string }[]
  lastEmailSent?: string | null
  sequenceStage?: string
  sequence?: string | null
  sequenceId?: string | null
  callbackContext?: string | null
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
  const { user } = useUser()
  const [trialCallCount, setTrialCallCount] = useState<number | null>(null)
  const [sessionActive, setSessionActive] = useSessionState("dialer_session_active", false)
  const [sessionPaused, setSessionPaused] = useSessionState("dialer_session_paused", false)
  const [selectedSequence, setSelectedSequence] = useSessionState<string>("dialer_sequence", "all")
  const [sortBy, setSortBy] = useSessionState<string>("dialer_sort", "due_date")
  const [selectedPhone, setSelectedPhone] = useSessionState<string>("dialer_phone", "+16282253832")
  const [callSlots, setCallSlots] = useSessionState<CallSlot[]>("dialer_call_slots", [
    { id: "1", status: "idle", contact: null, startTime: null, notes: "", pendingOutcome: undefined, pendingPipelineStage: undefined, pendingCallbackNotes: undefined },
  ])
  const [stats, setStats] = useSessionState<SessionStats>("dialer_stats", {
    totalCalls: 0,
    connected: 0,
    conversations: 0,
    introsBooked: 0,
  })
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set())
  const [expandedQueueRows, setExpandedQueueRows] = useState<Set<string>>(new Set())
  const [oneOffProspectId, setOneOffProspectId] = useState<string | null>(null)
  const [queueSize, setQueueSize] = useSessionState("dialer_queue_size", 0)
  const [calledProspects, setCalledProspects] = useSessionState<{ name: string; company: string; outcome: string }[]>("dialer_called_prospects", [])
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null)
  const [editedPhone, setEditedPhone] = useState<string>("")
  const [prospectNotes, setProspectNotes] = useState<{ [key: string]: string }>({})
  const [accountNotes, setAccountNotes] = useState<{ [key: string]: string }>({})
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailProspect, setEmailProspect] = useState<{ id: string; name: string; email: string; title?: string; company?: string } | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteType, setEditingNoteType] = useState<"prospect" | "account" | null>(null)
  const [apiProspects, setApiProspects] = useSessionState<DialerProspect[]>("dialer_api_prospects", [])
  const [loadingProspects, setLoadingProspects] = useState(true)
  const [fetchedSequences, setFetchedSequences] = useState<{ id: string; name: string }[]>([])
  const [selectedTimezones, setSelectedTimezones] = useSessionState<string[]>("dialer_timezones", [])
  const [selectedCallSteps, setSelectedCallSteps] = useSessionState<string[]>("dialer_call_steps", [])
  const [searchQuery, setSearchQuery] = useSessionState<string>("dialer_search", "")
  const [callSummaries, setCallSummaries] = useState<Map<string, {
    summary: string
    emailSubject: string
    emailBody: string
    prospectEmail: string
    prospectName: string
  }>>(new Map())
  const [loadingSummaryForProspect, setLoadingSummaryForProspect] = useState<string | null>(null)
  const [callbackPickerSlotId, setCallbackPickerSlotId] = useState<string | null>(null)
  const [callbackPickerNotes, setCallbackPickerNotes] = useState("")

  const generateCallSummary = useCallback(async (callId: string, prospectId: string, retries = 0) => {
    setLoadingSummaryForProspect(prospectId)
    try {
      const res = await fetch(`/api/calls/${callId}/summarize`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        if (data.error?.includes("No transcription") && retries < 4) {
          setTimeout(() => generateCallSummary(callId, prospectId, retries + 1), 5000)
          return
        }
        // Retries exhausted or other error — show a fallback so it doesn't go blank
        setCallSummaries(prev => {
          const next = new Map(prev)
          next.set(prospectId, { summary: "Transcript not available — add notes manually.", emailSubject: "", emailBody: "", prospectEmail: "", prospectName: "" })
          return next
        })
        setLoadingSummaryForProspect(null)
        return
      }
      const result = await res.json()
      setCallSummaries(prev => {
        const next = new Map(prev)
        next.set(prospectId, result)
        return next
      })
      setLoadingSummaryForProspect(null)
    } catch {
      setCallSummaries(prev => {
        const next = new Map(prev)
        next.set(prospectId, { summary: "Summary failed — add notes manually.", emailSubject: "", emailBody: "", prospectEmail: "", prospectName: "" })
        return next
      })
      setLoadingSummaryForProspect(null)
    }
  }, [])

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

  // Keep a ref to currentProspectIndex so async callbacks always read fresh state
  const currentProspectIndexRef = useRef(currentProspectIndex)
  currentProspectIndexRef.current = currentProspectIndex

  // Ref for handleCallOutcomeAndAdvance so connectCall event handlers always call the latest version
  const handleCallOutcomeAndAdvanceRef = useRef<(slotIndex: number, outcome: string) => Promise<void>>(null as any)

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

  // Fetch call count for trial users to show limit banner
  useEffect(() => {
    if (user?.tier !== 'trial' || user?.role === 'super_admin') return
    fetch('/api/calls?pageSize=1')
      .then(r => r.json())
      .then(data => {
        if (typeof data.totalCount === 'number') setTrialCallCount(data.totalCount)
      })
      .catch(() => {})
  }, [user?.tier])

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

  // Track the last sequence we fetched for so we only refetch on actual filter changes
  // Initialize from persisted selectedSequence so navigating back doesn't re-fetch (which would reorder the queue and break currentProspectIndex)
  const lastFetchedSequenceRef = useRef<string | null>(sessionActive && apiProspects.length > 0 ? selectedSequence : null)

  // Fetch prospects + sequences in parallel
  useEffect(() => {
    const fetchData = async () => {
      // If session is active and we already have prospects for this sequence, skip refetch (user just navigated back)
      if (sessionActive && apiProspects.length > 0 && lastFetchedSequenceRef.current === selectedSequence) {
        setLoadingProspects(false)
        // Still fetch sequences for the dropdown if needed
        if (fetchedSequences.length === 0) {
          try {
            const seqRes = await fetch("/api/sequences")
            if (seqRes.ok) {
              const data = await seqRes.json()
              setFetchedSequences((data.sequences || []).map((s: any) => ({ id: s.id, name: s.name })))
            }
          } catch {}
        }
        return
      }
      try {
        setLoadingProspects(true)
        const params = new URLSearchParams()
        if (selectedSequence !== 'all') {
          params.append('sequenceId', selectedSequence)
        }
        const [queueRes, seqRes] = await Promise.all([
          fetch(`/api/dialer/queue?${params}`),
          fetchedSequences.length === 0 ? fetch("/api/sequences") : Promise.resolve(null),
        ])
        if (queueRes.ok) {
          const data = await queueRes.json()
          const queue = data.queue || []
          setApiProspects(queue)
          lastFetchedSequenceRef.current = selectedSequence
          // Pre-populate prospect notes from DB
          const notes: { [key: string]: string } = {}
          for (const p of queue) {
            if (p.prospectNotes && p.email) {
              notes[p.email] = p.prospectNotes
            }
          }
          if (Object.keys(notes).length > 0) {
            setProspectNotes(prev => ({ ...prev, ...notes }))
          }
        }
        if (seqRes?.ok) {
          const data = await seqRes.json()
          setFetchedSequences(
            (data.sequences || []).map((s: any) => ({ id: s.id, name: s.name }))
          )
        }
      } catch (error) {
        console.error('Error fetching dialer queue:', error)
      } finally {
        setLoadingProspects(false)
      }
    }

    fetchData()
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
          // If recovering from an error, notify the user
          setDeviceError(prev => {
            if (prev) {
              toast({
                title: "Device reconnected",
                description: "Calling device is ready. Press Resume to continue your session.",
              })
            }
            return null
          })
        })

        device.on("error", (error) => {
          console.error("Twilio Device error:", error)
          // Mark device as not ready so connectCall won't attempt new calls
          setDeviceReady(false)
          setDeviceError(error.message || "Device error")
          // Pause the session to stop auto-advance from cascading failures
          setSessionPaused(true)
          toast({
            title: "Device Error",
            description: "Calling device lost connection. Attempting to reconnect...",
            variant: "destructive",
          })
          // Attempt to re-register the device
          try {
            device.register()
          } catch (e) {
            console.error("Failed to re-register device:", e)
          }
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

  // Use API prospects only (filtered to those with phone numbers + search + timezone filter), then sort
  const mockProspects: DialerProspect[] = apiProspects.filter(p => {
    if (!p.phone) return false
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch = (p.name || "").toLowerCase().includes(q)
        || (p.company || "").toLowerCase().includes(q)
        || (p.phone || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))
        || (p.email || "").toLowerCase().includes(q)
        || (p.title || "").toLowerCase().includes(q)
      if (!matchesSearch) return false
    }
    // Timezone filter — keep prospects with no location (only filter out mismatched ones)
    if (selectedTimezones.length > 0) {
      const loc = p.location || (p.accountInfo as any)?.location || null
      const abbr = getTimezoneAbbr(p.timezone, loc)
      if (abbr) {
        // Match both standard and daylight: EST/EDT → "ET", CST/CDT → "CT", etc.
        const tzMap: Record<string, string[]> = {
          "EST": ["EST", "EDT"],
          "CST": ["CST", "CDT"],
          "MST": ["MST", "MDT"],
          "PST": ["PST", "PDT"],
        }
        const matches = selectedTimezones.some(tz => {
          const variants = tzMap[tz] || [tz]
          return variants.some(v => abbr.includes(v) || abbr === v)
        })
        if (!matches) return false
      }
      // If no abbr (no location), keep the prospect — don't filter them out
    }
    // Call step filter
    if (selectedCallSteps.length > 0) {
      if (!selectedCallSteps.includes(p.sequenceStage || "")) return false
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

  const callStepOptions = [...new Set(
    apiProspects.map(p => p.sequenceStage).filter(Boolean)
  )] as string[]

  // Update queue size when prospects or position changes
  useEffect(() => {
    setQueueSize(Math.max(0, mockProspects.length - currentProspectIndex))
  }, [mockProspects.length, currentProspectIndex])

  // Lazy-load enrichment data for a prospect and merge it into the call slot
  const enrichProspect = useCallback(async (prospect: DialerProspect, slotIndex: number) => {
    try {
      const params = new URLSearchParams()
      if (prospect.prospectId) params.set("prospectId", prospect.prospectId)
      if (prospect.email) params.set("email", prospect.email)
      if (prospect.company) params.set("company", prospect.company)

      const res = await fetch(`/api/dialer/enrich?${params}`)
      if (!res.ok) return

      const data = await res.json()

      // Pre-populate prospect notes from enrichment if not already set
      if (data.prospectNotes && prospect.email) {
        setProspectNotes(prev => prev[prospect.email] ? prev : { ...prev, [prospect.email]: data.prospectNotes })
      }

      setCallSlots(prev => prev.map((slot, idx) => {
        if (idx !== slotIndex || !slot.contact) return slot
        return {
          ...slot,
          contact: {
            ...slot.contact,
            priorCalls: data.priorCalls || slot.contact.priorCalls,
            lastEmailSent: data.lastEmailSent || slot.contact.lastEmailSent,
            correspondenceHistory: data.correspondenceHistory || (slot.contact as any).correspondenceHistory,
            accountInfo: data.accountInfo || slot.contact.accountInfo,
            // Use account POV if prospect has none
            pov: slot.contact.pov || data.accountInfo?.pov || null,
          },
        }
      }))
    } catch (err) {
      console.error("Error enriching prospect:", err)
    }
  }, [])

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

      // Clear loading state for any previous summary
      setLoadingSummaryForProspect(null)

      // Update slot to ringing state and auto-expand the card
      const slotId = callSlots[slotIndex]?.id || "1"
      setExpandedSlots(prev => new Set(prev).add(slotId))
      setCallSlots(prev => prev.map((slot, idx) =>
        idx === slotIndex
          ? { ...slot, contact: prospect, status: "ringing" as CallStatus, startTime: Date.now(), callId: data.callId, taskId: prospect.taskId, queueItemId: prospect.id, prospectId: prospect.prospectId || null, sequenceId: prospect.sequenceId || null }
          : slot
      ))

      // Auto-open prospect's LinkedIn in a new tab
      if (prospect.linkedin) {
        window.open(prospect.linkedin, "_blank")
      }

      // Lazy-load enrichment data in background (non-blocking)
      enrichProspect(prospect, slotIndex)

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

        // Snapshot the final call duration so it persists in the "Completed" badge
        const finalDuration = callStartTimeRef.current
          ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
          : 0

        // Start generating AI summary immediately (don't wait for Save & Next)
        // Only generate if the call lasted more than 10 seconds (skip voicemails/instant hangups)
        if (data.callId && prospect.prospectId && finalDuration > 10) {
          setTimeout(() => generateCallSummary(data.callId, prospect.prospectId!), 2000)
        }

        // Update slot to completed — but only if it's still the same call
        // (saveAndAdvance may have already reset the slot to idle with a new contact)
        setCallSlots(prev => prev.map((slot, idx) => {
          if (idx !== slotIndex) return slot
          // Only mark completed if the slot is still ringing/connected (not already reset)
          if (slot.status === "ringing" || slot.status === "connected") {
            setShowOutcomeButtons(true)
            return { ...slot, status: "completed" as CallStatus, finalDuration }
          }
          return slot
        }))
      })

      call.on("cancel", () => {
        console.log("Call cancelled")
        try { deviceRef.current?.disconnectAll() } catch {}
        activeCallRef.current = null

        // Play hangup sound
        playHangupSound()

        // Mark as no answer and auto-advance
        handleCallOutcomeAndAdvanceRef.current(slotIndex, "no_answer")
      })

      call.on("reject", () => {
        console.log("Call rejected")
        try { deviceRef.current?.disconnectAll() } catch {}
        activeCallRef.current = null

        // Play hangup sound
        playHangupSound()

        handleCallOutcomeAndAdvanceRef.current(slotIndex, "busy")
      })

      call.on("error", (error) => {
        console.error("Call error:", error)

        // Force disconnect the call — don't just null the ref
        try { call.disconnect() } catch {}
        try { deviceRef.current?.disconnectAll() } catch {}
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
          handleCallOutcomeAndAdvanceRef.current(slotIndex, "failed")
        }, 800)
      })

      // Poll server for call status to reliably detect when prospect answers
      // Twilio's statusCallback fires "answered" on the child leg, which the server maps to "in_progress"
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/calls/${data.callId}`)
          if (!res.ok) return
          const callData = await res.json()
          if (callData.call?.status === "in_progress") {
            clearInterval(pollInterval)
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
          }
        } catch {
          // ignore poll errors
        }
      }, 2000)

      // Clean up polling when call ends
      call.on("disconnect", () => clearInterval(pollInterval))
      call.on("cancel", () => clearInterval(pollInterval))
      call.on("reject", () => clearInterval(pollInterval))
      call.on("error", () => clearInterval(pollInterval))

      return { callId: data.callId, twilioSid: null }
    } catch (error: any) {
      console.error("Error making call:", error)

      // Force disconnect any lingering call
      try { activeCallRef.current?.disconnect() } catch {}
      try { deviceRef.current?.disconnectAll() } catch {}
      activeCallRef.current = null

      toast({
        title: "Call failed",
        description: error.message || "Failed to initiate call",
        variant: "destructive",
      })

      // Auto-advance to next prospect after a brief delay
      setTimeout(() => {
        handleCallOutcomeAndAdvanceRef.current(slotIndex, "failed")
      }, 800)

      return null
    }
  }, [deviceReady, selectedPhone, toast])

  // Handle call outcome and advance to next prospect
  const handleCallOutcomeAndAdvance = useCallback(async (slotIndex: number, outcome: string) => {
    // Safety: make sure no call is lingering before we advance
    try { activeCallRef.current?.disconnect() } catch {}
    try { deviceRef.current?.disconnectAll() } catch {}
    activeCallRef.current = null

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
            duration: callDuration > 0 ? callDuration : undefined,
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

    // Use ref to always get fresh index (avoids stale closures from setTimeout chains)
    const freshIndex = currentProspectIndexRef.current
    const nextProspect = mockProspects[freshIndex + 1]

    // Advance the index — keep all prospects in the list so the queue stays visible
    setCurrentProspectIndex(freshIndex + 1)

    // Track in archive
    if (slot?.contact) {
      setCalledProspects(prev => [...prev, { name: slot.contact!.name, company: slot.contact!.company, outcome }])
    }

    // Update stats
    const duration = slot?.finalDuration || callDuration || 0
    const isConnect = outcome.startsWith("connected") || outcome === "callback"
    setStats(prev => ({
      ...prev,
      totalCalls: prev.totalCalls + 1,
      connected: isConnect ? prev.connected + 1 : prev.connected,
      conversations: isConnect && duration > 60 ? prev.conversations + 1 : prev.conversations,
      introsBooked: outcome === "connected_intro_booked" ? prev.introsBooked + 1 : prev.introsBooked,
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

    // Clear one-off call state if not in a session
    if (!sessionActive) {
      setOneOffProspectId(null)
    }

    // Auto-advance to next prospect if session is active
    if (sessionActive && !sessionPaused) {
      if (nextProspect) {
        setQueueSize(prev => Math.max(0, prev - 1))

        // Small delay before next call
        setTimeout(() => {
          connectCall(nextProspect, 0)
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
  }, [sessionActive, sessionPaused, mockProspects, connectCall, callDuration, toast])

  // Keep ref always pointing to latest version
  handleCallOutcomeAndAdvanceRef.current = handleCallOutcomeAndAdvance

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
    setCalledProspects([])
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
    wrong_number: "Wrong Number",
  }

  const handleCallOutcome = async (slotId: string, outcome: string) => {
    // Store the pending outcome on the slot (independent of pipeline)
    setCallSlots(prev => prev.map(slot =>
      slot.id === slotId ? { ...slot, pendingOutcome: outcome } : slot
    ))
  }

  const handleCallbackSchedule = (slotId: string, callbackDate: Date, callbackNotes?: string) => {
    setCallSlots(prev => prev.map(slot =>
      slot.id === slotId ? { ...slot, pendingOutcome: "callback", pendingCallbackDate: callbackDate, pendingCallbackNotes: callbackNotes ?? slot.pendingCallbackNotes ?? "" } : slot
    ))
  }

  const getCallbackDate = (option: string): Date => {
    const now = new Date()
    switch (option) {
      case "1h":
        return new Date(now.getTime() + 60 * 60 * 1000)
      case "3h":
        return new Date(now.getTime() + 3 * 60 * 60 * 1000)
      case "tomorrow_morning": {
        const d = new Date(now)
        d.setDate(d.getDate() + 1)
        d.setHours(9, 0, 0, 0)
        return d
      }
      case "tomorrow_afternoon": {
        const d = new Date(now)
        d.setDate(d.getDate() + 1)
        d.setHours(14, 0, 0, 0)
        return d
      }
      case "next_week": {
        const d = new Date(now)
        d.setDate(d.getDate() + (8 - d.getDay())) // next Monday
        d.setHours(9, 0, 0, 0)
        return d
      }
      default:
        return new Date(now.getTime() + 60 * 60 * 1000)
    }
  }

  const createReminder = async (prospect: DialerProspect, timeOption: string) => {
    const dueDate = getCallbackDate(timeOption)
    const summaryData = callSummaries.get(prospect.prospectId || prospect.id)
    const summaryText = summaryData?.summary || ""
    const taskDescription = [
      `Follow-up with ${prospect.name}${prospect.company ? ` at ${prospect.company}` : ""}.`,
      summaryText ? `AI Call Summary: ${summaryText}` : "",
    ].filter(Boolean).join("\n\n")
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Follow up: ${prospect.name}${prospect.company ? ` — ${prospect.company}` : ""}`,
          description: taskDescription,
          type: "follow_up",
          priority: "high",
          dueDate: dueDate.toISOString(),
          contact: {
            prospectId: prospect.prospectId,
            name: prospect.name,
            email: prospect.email,
            phone: prospect.phone,
            company: prospect.company,
            title: prospect.title,
          },
        }),
      })
      toast({
        title: "Reminder created",
        description: `Follow-up for ${prospect.name} on ${dueDate.toLocaleDateString()} at ${dueDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      })
    } catch (err) {
      console.error("Error creating reminder task:", err)
      toast({ title: "Error", description: "Failed to create reminder", variant: "destructive" })
    }
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
            duration: callDuration > 0 ? callDuration : undefined,
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

    // NOTE: Sequence step advancement is handled by PATCH /api/calls/[id] when
    // the outcome is set — no need to call complete-step separately (was causing
    // double advancement, making steps jump by 2).

    // If callback, create a follow-up task with the scheduled date and call summary
    if (outcome === "callback" && contact) {
      const callbackDate = slot.pendingCallbackDate || new Date(Date.now() + 60 * 60 * 1000) // default 1h
      const notesSummary = slot.notes ? slot.notes.substring(0, 200) : ""
      const callbackNotes = slot.pendingCallbackNotes || ""
      const taskDescription = [
        `Follow-up call with ${contact.name}${contact.company ? ` at ${contact.company}` : ""}.`,
        callbackNotes ? `Callback reason: ${callbackNotes}` : "",
        notesSummary ? `Notes from last call: ${notesSummary}` : "",
        contact.sequenceStage ? `Sequence stage: ${contact.sequenceStage}` : "",
      ].filter(Boolean).join("\n\n")

      const titleSuffix = callbackNotes
        ? callbackNotes.substring(0, 60)
        : notesSummary
          ? notesSummary.substring(0, 60)
          : ""

      savePromises.push(
        fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Call back ${contact.name}${titleSuffix ? ` — ${titleSuffix}` : ""}`,
            description: taskDescription,
            type: "follow_up",
            priority: "high",
            dueDate: callbackDate.toISOString(),
            contact: {
              prospectId: slot.prospectId,
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              company: contact.company,
              title: contact.title,
            },
          }),
        }).catch(err => console.error("Error creating callback task:", err))
      )
    }

    // Fire all in parallel — don't block UI advancement
    Promise.all(savePromises)

    // Use ref to always get fresh index (avoids stale closures from setTimeout chains)
    const freshIndex = currentProspectIndexRef.current
    const nextProspect = mockProspects[freshIndex + 1]

    // Advance the index — keep all prospects in the list so the queue stays visible
    setCurrentProspectIndex(freshIndex + 1)

    // Track in archive
    if (contact) {
      setCalledProspects(prev => [...prev, { name: contact.name, company: contact.company, outcome }])
    }

    // Show appropriate toast
    if (outcome === "callback" && contact) {
      const cbDate = slot.pendingCallbackDate || new Date(Date.now() + 60 * 60 * 1000)
      toast({
        title: `Callback scheduled: ${contact.name}`,
        description: `Task created for ${cbDate.toLocaleDateString()} at ${cbDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      })
    } else if (pipelineStage) {
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
    const duration = slot.finalDuration || callDuration || 0
    const isConnect = outcome.startsWith("connected") || outcome === "callback"
    setStats(prev => ({
      ...prev,
      totalCalls: prev.totalCalls + 1,
      connected: isConnect ? prev.connected + 1 : prev.connected,
      conversations: isConnect && duration > 60 ? prev.conversations + 1 : prev.conversations,
      introsBooked: outcome === "connected_intro_booked" ? prev.introsBooked + 1 : prev.introsBooked,
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

    // Clear one-off call state if not in a session
    if (!sessionActive) {
      setOneOffProspectId(null)
    }

    // Auto-dial next
    if (sessionActive && !sessionPaused) {
      if (nextProspect) {
        setQueueSize(prev => Math.max(0, prev - 1))
        setTimeout(() => {
          connectCall(nextProspect, slotIndex)
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

    // Save the call outcome if a call was actually made (so it shows in prior call history)
    if (slot.callId) {
      fetch(`/api/calls/${slot.callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome: "no_answer",
          notes: slot.notes || "Skipped",
          endedAt: new Date().toISOString(),
        }),
      }).catch(err => console.error("Error saving skipped call:", err))
    }
    if (slot.taskId) {
      fetch(`/api/tasks/${slot.taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      }).catch(err => console.error("Error completing task on skip:", err))
    }

    // Use ref to always get fresh index (avoids stale closures from setTimeout chains)
    const freshIndex = currentProspectIndexRef.current
    const nextProspect = mockProspects[freshIndex + 1]

    // Advance the index
    setCurrentProspectIndex(freshIndex + 1)

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
      if (nextProspect) {
        setQueueSize(prev => Math.max(0, prev - 1))
        setTimeout(() => {
          connectCall(nextProspect, slotIndex)
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
      pendingCallbackNotes: undefined,
    }])

    // Lazy-load enrichment data in background
    enrichProspect(prospect, 0)

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
      pendingCallbackNotes: undefined,
      taskId: prospect.taskId,
      queueItemId: prospect.id,
      prospectId: prospect.prospectId || null,
      sequenceId: prospect.sequenceId || null,
    }])
    // Auto-expand the card
    setExpandedSlots(prev => new Set(prev).add("1"))
    // Lazy-load enrichment data in background
    enrichProspect(prospect, 0)
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

    setOneOffProspectId(prospect.id)
    // Expand that row so inline controls are visible
    setExpandedQueueRows(prev => new Set(prev).add(prospect.id))
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

  const saveNote = (contactId: string, noteType: "prospect" | "account", noteText: string, prospectId?: string | null) => {
    if (noteType === "prospect") {
      setProspectNotes(prev => ({ ...prev, [contactId]: noteText }))
      // Persist prospect notes to DB
      if (prospectId) {
        fetch(`/api/prospects/${prospectId}/notes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: noteText }),
        }).catch(() => { /* silent fail — local state is already updated */ })
      }
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
    <div className="space-y-5">
      {user?.tier === 'trial' && user?.role !== 'super_admin' && trialCallCount !== null && (
        <TrialLimitBanner current={trialCallCount} limit={TRIAL_LIMITS.calls} resourceLabel="calls" />
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-semibold text-foreground">Power Dialer</h1>
        <div className="flex items-center gap-2">
          {/* Device Status */}
          {deviceError && !deviceReady ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
              <Loader2 className="h-3 w-3 animate-spin" /> Reconnecting...
            </span>
          ) : deviceError && deviceReady ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
              <PhoneOff className="h-3 w-3" /> Device Error
            </span>
          ) : deviceReady ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[hsl(100,78%,44%,0.1)] text-[hsl(100,78%,44%)] border border-[hsl(100,78%,44%,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(100,78%,44%)]" /> Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground border border-border">
              <Loader2 className="h-3 w-3 animate-spin" /> Initializing...
            </span>
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
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(100,78%,44%,0.1)] border border-[hsl(100,78%,44%,0.25)]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[hsl(100,78%,44%)] animate-pulse" />
                    <span className="text-[13px] font-semibold tabular-nums">
                      {String(Math.floor(callDuration / 60)).padStart(2, '0')}:{String(callDuration % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="border-l border-[hsl(100,78%,44%,0.3)] h-5 mx-1" />
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
      <div className="grid grid-cols-5 divide-x divide-border border border-border rounded-lg overflow-hidden bg-card">
        {[
          { label: 'Total Calls', value: stats.totalCalls, dot: 'bg-muted-foreground/40' },
          { label: 'Connected', value: stats.connected, dot: 'bg-[hsl(100,78%,44%)]' },
          { label: 'Connect Rate', value: `${stats.totalCalls > 0 ? Math.round((stats.connected / stats.totalCalls) * 100) : 0}%`, dot: 'bg-blue-400' },
          { label: 'Conversation Rate', value: `${stats.totalCalls > 0 ? Math.round((stats.conversations / stats.totalCalls) * 100) : 0}%`, dot: 'bg-purple-400' },
          { label: 'Meetings Booked', value: stats.introsBooked, dot: 'bg-[hsl(100,78%,44%)]' },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
              <span className="text-[11px] text-muted-foreground truncate">{s.label}</span>
            </div>
            <span className="text-xl font-semibold text-foreground leading-none">{s.value}</span>
          </div>
        ))}
      </div>


      {/* Session Configuration */}
      {!sessionActive && (
        <div className="rounded-lg border border-border bg-card px-5 py-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px] font-medium text-foreground">Session Settings</span>
          </div>
          <div>
            <div className="grid gap-4 md:grid-cols-3">
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

            </div>
          </div>
        </div>
      )}

      {/* Prospect Queue */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-[13px] font-semibold text-foreground">Call Queue</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {sessionActive
                    ? `${currentProspectIndex + 1} of ${mockProspects.length} — ${mockProspects.length - currentProspectIndex - 1} remaining`
                    : mockProspects.length > 0
                    ? `${mockProspects.length} prospect${mockProspects.length !== 1 ? "s" : ""} to call`
                    : selectedTimezones.length > 0 || selectedCallSteps.length > 0 || searchQuery.trim()
                      ? "No prospects match the selected filters"
                      : "No prospects in queue"
                  }
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, company, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 w-56 text-[12px]"
                />
              </div>
            </div>
            {sessionActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground border border-border">
                <Phone className="h-3 w-3" />
                {selectedPhone}
              </span>
            )}
          </div>
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-[11px]">#</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-[11px]">Name</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-[11px]">Company</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-[11px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                            Call Step
                            {selectedCallSteps.length > 0 && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 ml-1">{selectedCallSteps.length}</Badge>
                            )}
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[120px]">
                          {callStepOptions.map(step => (
                            <DropdownMenuItem
                              key={step}
                              onSelect={(e) => {
                                e.preventDefault()
                                setSelectedCallSteps(prev =>
                                  prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step]
                                )
                              }}
                              className="flex items-center gap-2"
                            >
                              <div className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center ${
                                selectedCallSteps.includes(step) ? "bg-primary border-primary" : "border-muted-foreground/30"
                              }`}>
                                {selectedCallSteps.includes(step) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                              </div>
                              {step}
                            </DropdownMenuItem>
                          ))}
                          {selectedCallSteps.length > 0 && (
                            <DropdownMenuItem onSelect={() => setSelectedCallSteps([])}>
                              <X className="h-3.5 w-3.5 mr-2" />
                              Clear filters
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-[11px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                            Local Time
                            {selectedTimezones.length > 0 && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 ml-1">{selectedTimezones.length}</Badge>
                            )}
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[120px]">
                          {["EST", "CST", "MST", "PST"].map(tz => (
                            <DropdownMenuItem
                              key={tz}
                              onSelect={(e) => {
                                e.preventDefault()
                                setSelectedTimezones(prev =>
                                  prev.includes(tz) ? prev.filter(t => t !== tz) : [...prev, tz]
                                )
                              }}
                              className="flex items-center gap-2"
                            >
                              <div className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center ${
                                selectedTimezones.includes(tz) ? "bg-primary border-primary" : "border-muted-foreground/30"
                              }`}>
                                {selectedTimezones.includes(tz) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                              </div>
                              {tz}
                            </DropdownMenuItem>
                          ))}
                          {selectedTimezones.length > 0 && (
                            <>
                              <DropdownMenuItem onSelect={() => setSelectedTimezones([])}>
                                <X className="h-3.5 w-3.5 mr-2" />
                                Clear filters
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-[11px]">Insights</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground text-[11px] w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {mockProspects.map((prospect, idx) => {
                    const loc = prospect.location || prospect.accountInfo?.location || null
                    const localTime = getLocalTime(prospect.timezone, loc)
                    const tzAbbr = getTimezoneAbbr(prospect.timezone, loc)
                    const insightBullets: string[] = []
                    if (prospect.companyDescription) {
                      insightBullets.push(prospect.companyDescription.length > 80 ? prospect.companyDescription.slice(0, 80) + "..." : prospect.companyDescription)
                    } else if (prospect.accountInfo?.industry) {
                      insightBullets.push(prospect.accountInfo.industry + (prospect.accountInfo?.employees ? `, ${prospect.accountInfo.employees.toLocaleString()} employees` : ""))
                    }
                    if (prospect.priorCalls && prospect.priorCalls.length > 0) {
                      insightBullets.push(`${prospect.priorCalls.length} prior call${prospect.priorCalls.length !== 1 ? "s" : ""} — last: ${prospect.priorCalls[0].outcome}`)
                    }

                    const isSessionCall = sessionActive && idx === currentProspectIndex
                    const isOneOffCall = !sessionActive && prospect.id === oneOffProspectId
                    const isCurrentCall = isSessionCall || isOneOffCall
                    const isAlreadyCalled = sessionActive && idx < currentProspectIndex
                    const isExpanded = expandedQueueRows.has(prospect.id) || isCurrentCall
                    const activeSlot = isCurrentCall ? callSlots[0] : null

                    return (
                      <React.Fragment key={prospect.id}>
                        <tr
                          className={`border-b border-border/60 last:border-0 transition-colors group cursor-pointer ${
                            isCurrentCall
                              ? "bg-accent/5 border-l-2 border-l-[hsl(100,78%,44%)]"
                              : isAlreadyCalled
                              ? "opacity-40"
                              : "hover:bg-muted/20"
                          }`}
                          onClick={() => {
                            setExpandedQueueRows(prev => {
                              const next = new Set(prev)
                              if (next.has(prospect.id)) {
                                next.delete(prospect.id)
                              } else {
                                next.add(prospect.id)
                              }
                              return next
                            })
                          }}
                        >
                          <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                            <div className="flex items-center gap-1">
                              {isCurrentCall ? (
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                              ) : isAlreadyCalled ? (
                                <Check className="h-3 w-3 text-muted-foreground" />
                              ) : isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                              {idx + 1}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {prospect.prospectId ? (
                                <Link href={`/prospects/${prospect.prospectId}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-primary hover:underline">{prospect.name}</Link>
                              ) : (
                                <span className="font-medium">{prospect.name}</span>
                              )}
                              {prospect.linkedin && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); window.open(prospect.linkedin!, "_blank") }}
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
                                onClick={(e) => { e.stopPropagation(); loadProspectCard(prospect) }}
                                className="text-xs font-mono text-primary hover:underline cursor-pointer"
                              >
                                {prospect.phone}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              {prospect.accountInfo?.id ? (
                                <Link href={`/accounts/${prospect.accountInfo.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-primary hover:underline">{prospect.company || "—"}</Link>
                              ) : (
                                prospect.company || "—"
                              )}
                            </div>
                            {prospect.accountInfo?.website && (
                              <a
                                href={prospect.accountInfo.website.startsWith("http") ? prospect.accountInfo.website : `https://${prospect.accountInfo.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {prospect.accountInfo.website.replace(/^https?:\/\//, "")}
                              </a>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground">
                              {prospect.sequenceStage || "—"}
                            </span>
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
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
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
                        {isExpanded && (
                          <tr className={`border-b last:border-0 ${isCurrentCall ? "bg-primary/5" : "bg-muted/20"}`}>
                            <td colSpan={7} className="px-4 py-4">
                              <div className="space-y-3">
                                {/* Active call controls (during session) or regular action buttons */}
                                {isCurrentCall && activeSlot ? (
                                  <>
                                    {/* Call status + controls */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {activeSlot.status === "ringing" && (
                                        <>
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground border border-border animate-pulse">
                                            <PhoneCall className="h-3 w-3" /> Ringing
                                          </span>
                                          {activeSlot.startTime && <CallTimer startTime={activeSlot.startTime} />}
                                          <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); endCall() }} className="h-7 px-2">
                                            <PhoneOff className="h-3 w-3" />
                                          </Button>
                                        </>
                                      )}
                                      {activeSlot.status === "connected" && (
                                        <>
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[hsl(100,78%,44%,0.12)] text-[hsl(100,78%,44%)] border border-[hsl(100,78%,44%,0.2)]">
                                            <PhoneCall className="h-3 w-3" /> Connected
                                          </span>
                                          {activeSlot.startTime && <CallTimer startTime={activeSlot.startTime} />}
                                          <Button size="sm" variant={isMuted ? "secondary" : "outline"} onClick={(e) => { e.stopPropagation(); toggleMute() }} className="h-7 px-2" title={isMuted ? "Unmute" : "Mute"}>
                                            {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                                          </Button>
                                          <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); endCall() }} className="h-7 px-2">
                                            <PhoneOff className="h-3 w-3" />
                                          </Button>
                                        </>
                                      )}
                                      {activeSlot.status === "completed" && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground border border-border">
                                          Completed {activeSlot.finalDuration ? `· ${String(Math.floor(activeSlot.finalDuration / 60)).padStart(2, '0')}:${String(activeSlot.finalDuration % 60).padStart(2, '0')}` : ""}
                                        </span>
                                      )}
                                      {activeSlot.status === "idle" && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground border border-border animate-pulse">
                                          <Loader2 className="h-3 w-3 animate-spin" /> Dialing...
                                        </span>
                                      )}
                                    </div>

                                    {/* Outcome, Pipeline, Save & Next */}
                                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                                      {/* Outcome dropdown */}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant={activeSlot.pendingOutcome ? "default" : "outline"}
                                            className={activeSlot.pendingOutcome ? "bg-primary hover:bg-primary/90 text-primary-foreground h-7" : "h-7"}
                                          >
                                            <UserCheck className="h-3 w-3 mr-1" />
                                            {activeSlot.pendingOutcome === "callback" && activeSlot.pendingCallbackDate
                                              ? `Callback ${activeSlot.pendingCallbackDate.toLocaleDateString([], { month: "short", day: "numeric" })} ${activeSlot.pendingCallbackDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                              : activeSlot.pendingOutcome ? outcomeLabels[activeSlot.pendingOutcome] || activeSlot.pendingOutcome : "Outcome"}
                                            <ChevronDown className="h-3 w-3 ml-1" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                          <DropdownMenuItem onClick={() => handleCallOutcome("1", "no_answer")}>
                                            <UserX className="h-4 w-4 mr-2" />
                                            No Answer
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleCallOutcome("1", "connected_not_interested")}>
                                            <UserX className="h-4 w-4 mr-2 text-orange-500" />
                                            Not Interested
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleCallOutcome("1", "connected_referral")}>
                                            <UserCheck className="h-4 w-4 mr-2 text-blue-500" />
                                            Referral
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleCallOutcome("1", "connected_info_gathered")}>
                                            <FileText className="h-4 w-4 mr-2 text-purple-500" />
                                            Informational
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleCallOutcome("1", "connected_intro_booked")}>
                                            <CalendarCheck className="h-4 w-4 mr-2 text-green-500" />
                                            Intro Booked
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleCallOutcome("1", "voicemail")}>
                                            <Voicemail className="h-4 w-4 mr-2" />
                                            Voicemail
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleCallOutcome("1", "wrong_number")}>
                                            <PhoneOff className="h-4 w-4 mr-2 text-red-500" />
                                            Wrong Number
                                          </DropdownMenuItem>
                                          <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>
                                              <CalendarClock className="h-4 w-4 mr-2 text-amber-500" />
                                              Call Back Later
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                              <DropdownMenuItem onClick={() => handleCallbackSchedule("1", getCallbackDate("1h"))}>
                                                <Clock className="h-4 w-4 mr-2" />In 1 Hour
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handleCallbackSchedule("1", getCallbackDate("3h"))}>
                                                <Clock className="h-4 w-4 mr-2" />In 3 Hours
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handleCallbackSchedule("1", getCallbackDate("tomorrow_morning"))}>
                                                <CalendarIcon className="h-4 w-4 mr-2" />Tomorrow Morning
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handleCallbackSchedule("1", getCallbackDate("tomorrow_afternoon"))}>
                                                <CalendarIcon className="h-4 w-4 mr-2" />Tomorrow Afternoon
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handleCallbackSchedule("1", getCallbackDate("next_week"))}>
                                                <CalendarIcon className="h-4 w-4 mr-2" />Next Monday
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => setCallbackPickerSlotId("1")}>
                                                <CalendarClock className="h-4 w-4 mr-2" />Pick a Date...
                                              </DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                          </DropdownMenuSub>
                                          <DropdownMenuItem onClick={() => handleCallOutcome("1", "no_answer")}>
                                            <SkipForward className="h-4 w-4 mr-2" />
                                            Skip
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>

                                      {/* Pipeline dropdown */}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant={activeSlot.pendingPipelineStage ? "default" : "outline"}
                                            className={activeSlot.pendingPipelineStage ? "bg-green-600 hover:bg-green-700 text-white h-7" : "h-7"}
                                          >
                                            <Rocket className="h-3 w-3 mr-1" />
                                            {activeSlot.pendingPipelineStage ? pipelineStageLabels[activeSlot.pendingPipelineStage as PipelineStage] || activeSlot.pendingPipelineStage : "Pipeline"}
                                            <ChevronDown className="h-3 w-3 ml-1" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                          <DropdownMenuItem onClick={() => handlePipelineOutcome("1", "interested")}>
                                            <Star className="h-4 w-4 mr-2 text-yellow-500" />
                                            Interested
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handlePipelineOutcome("1", "intro_booked")}>
                                            <CalendarCheck className="h-4 w-4 mr-2 text-blue-500" />
                                            Intro Booked
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handlePipelineOutcome("1", "opportunity")}>
                                            <Target className="h-4 w-4 mr-2 text-purple-500" />
                                            Opportunity
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handlePipelineOutcome("1", "demo_booked")}>
                                            <Handshake className="h-4 w-4 mr-2 text-green-500" />
                                            Demo Booked
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>

                                      <div className="border-l border-border h-5 mx-1" />

                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white h-7"
                                        onClick={() => saveAndAdvance("1")}
                                      >
                                        <Save className="h-3 w-3 mr-1" />
                                        {isOneOffCall ? "Save" : "Save & Next"}
                                      </Button>

                                      <div className="border-l border-border h-5 mx-1" />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openEmailDialog(prospect)}
                                        className="h-7"
                                      >
                                        <Mail className="h-3 w-3 mr-1" />
                                        Email
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openCalendarInvite(prospect as any)}
                                        className="h-7"
                                      >
                                        <CalendarIcon className="h-3 w-3 mr-1" />
                                        Calendar
                                      </Button>
                                    </div>

                                    {/* Call notes */}
                                    <Textarea
                                      placeholder="Call notes..."
                                      value={activeSlot.notes}
                                      onChange={(e) => updateNotes("1", e.target.value)}
                                      className="min-h-[60px] text-sm"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-7"
                                      disabled={!deviceReady}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setExpandedQueueRows(prev => {
                                          const next = new Set(prev)
                                          next.delete(prospect.id)
                                          return next
                                        })
                                        dialOneOff(prospect)
                                      }}
                                    >
                                      <Phone className="h-3 w-3 mr-1" />
                                      Call
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openEmailDialog(prospect)
                                      }}
                                    >
                                      <Mail className="h-3 w-3 mr-1" />
                                      Email
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openCalendarInvite(prospect as any)
                                      }}
                                    >
                                      <CalendarIcon className="h-3 w-3 mr-1" />
                                      Calendar
                                    </Button>
                                  </div>
                                )}

                                {/* Call Notes (AI Summary) */}
                                {(callSummaries.has(prospect.prospectId || prospect.id) || loadingSummaryForProspect === (prospect.prospectId || prospect.id)) && (() => {
                                  const pKey = prospect.prospectId || prospect.id
                                  const summaryData = callSummaries.get(pKey)
                                  return (
                                    <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2 flex-1">
                                          <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-primary mb-1">Call Notes</p>
                                            {loadingSummaryForProspect === pKey && !summaryData ? (
                                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                Generating summary...
                                              </div>
                                            ) : summaryData ? (
                                              <div className="space-y-2">
                                                <ul className="text-sm text-foreground leading-relaxed list-disc list-inside space-y-1">
                                                  {summaryData.summary.split(/[.!?]+/).filter(s => s.trim()).map((sentence, i) => (
                                                    <li key={i}>{sentence.trim()}</li>
                                                  ))}
                                                </ul>
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                  {summaryData.emailBody ? (
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="h-7"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        const to = encodeURIComponent(summaryData.prospectEmail)
                                                        const su = encodeURIComponent(summaryData.emailSubject)
                                                        const body = encodeURIComponent(summaryData.emailBody)
                                                        window.open(`https://mail.google.com/mail/?view=cm&to=${to}&su=${su}&body=${body}`, "_blank")
                                                      }}
                                                    >
                                                      <Mail className="h-3 w-3 mr-1" />
                                                      Open in Gmail
                                                    </Button>
                                                  ) : (
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="h-7"
                                                      disabled={summaryData.draftingEmail}
                                                      onClick={async (e) => {
                                                        e.stopPropagation()
                                                        if (!summaryData.callId) return
                                                        setCallSummaries(prev => {
                                                          const next = new Map(prev)
                                                          next.set(pKey, { ...summaryData, draftingEmail: true })
                                                          return next
                                                        })
                                                        try {
                                                          const res = await fetch(`/api/calls/${summaryData.callId}/draft-email`, { method: "POST" })
                                                          if (res.ok) {
                                                            const email = await res.json()
                                                            setCallSummaries(prev => {
                                                              const next = new Map(prev)
                                                              next.set(pKey, { ...prev.get(pKey)!, ...email, draftingEmail: false })
                                                              return next
                                                            })
                                                          } else {
                                                            setCallSummaries(prev => {
                                                              const next = new Map(prev)
                                                              next.set(pKey, { ...prev.get(pKey)!, draftingEmail: false })
                                                              return next
                                                            })
                                                          }
                                                        } catch {
                                                          setCallSummaries(prev => {
                                                            const next = new Map(prev)
                                                            next.set(pKey, { ...prev.get(pKey)!, draftingEmail: false })
                                                            return next
                                                          })
                                                        }
                                                      }}
                                                    >
                                                      {summaryData.draftingEmail ? (
                                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                      ) : (
                                                        <Mail className="h-3 w-3 mr-1" />
                                                      )}
                                                      Draft Email
                                                    </Button>
                                                  )}
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                      <Button size="sm" variant="outline" className="h-7">
                                                        <Bell className="h-3 w-3 mr-1" />
                                                        Make a Reminder
                                                        <ChevronDown className="h-3 w-3 ml-1" />
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start">
                                                      <DropdownMenuItem onClick={() => createReminder(prospect, "1h")}>
                                                        <Clock className="h-4 w-4 mr-2" />In 1 Hour
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem onClick={() => createReminder(prospect, "3h")}>
                                                        <Clock className="h-4 w-4 mr-2" />In 3 Hours
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem onClick={() => createReminder(prospect, "tomorrow_morning")}>
                                                        <CalendarIcon className="h-4 w-4 mr-2" />Tomorrow Morning
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem onClick={() => createReminder(prospect, "tomorrow_afternoon")}>
                                                        <CalendarIcon className="h-4 w-4 mr-2" />Tomorrow Afternoon
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem onClick={() => createReminder(prospect, "next_week")}>
                                                        <CalendarIcon className="h-4 w-4 mr-2" />Next Monday
                                                      </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                </div>
                                              </div>
                                            ) : null}
                                          </div>
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setCallSummaries(prev => {
                                              const next = new Map(prev)
                                              next.delete(pKey)
                                              return next
                                            })
                                          }}
                                          className="p-1 rounded hover:bg-muted transition-colors"
                                        >
                                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })()}

                                {/* Company Info */}
                                {prospect.accountInfo && (
                                  <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                    <div className="flex items-start gap-2">
                                      <Building2 className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-foreground mb-1.5">Company Info — {prospect.company}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                          {prospect.accountInfo.industry && (
                                            <span>{prospect.accountInfo.industry}</span>
                                          )}
                                          {prospect.accountInfo.employees && (
                                            <span>{prospect.accountInfo.employees.toLocaleString()} employees</span>
                                          )}
                                          {prospect.accountInfo.location && (
                                            <span className="flex items-center gap-1">
                                              <MapPin className="h-3 w-3" />
                                              {prospect.accountInfo.location}
                                            </span>
                                          )}
                                          {prospect.accountInfo.website && (
                                            <a
                                              href={prospect.accountInfo.website.startsWith('http') ? prospect.accountInfo.website : `https://${prospect.accountInfo.website}`}
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
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Insights */}
                                {(prospect.title || prospect.companyDescription || prospect.accountInfo?.industry || prospect.accountInfo?.employees || prospect.accountInfo?.pov) && (
                                  <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                                    <div className="flex items-start gap-2">
                                      <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-primary mb-1">Insights</p>
                                        <ul className="space-y-1 text-xs text-foreground leading-relaxed list-disc list-inside">
                                          {prospect.title && prospect.company && (
                                            <li>{prospect.name} is {prospect.title} at {prospect.company}</li>
                                          )}
                                          {prospect.accountInfo?.pov?.whatTheyDo ? (
                                            <li>{prospect.accountInfo.pov.whatTheyDo}</li>
                                          ) : (prospect.companyDescription || prospect.accountInfo?.industry || prospect.accountInfo?.employees) && (
                                            <li>
                                              {prospect.company}{prospect.accountInfo?.employees ? `, ${prospect.accountInfo.employees.toLocaleString()} employees` : ""}
                                              {prospect.companyDescription ? ` — ${prospect.companyDescription}` : prospect.accountInfo?.industry ? ` — ${prospect.accountInfo.industry}` : ""}
                                            </li>
                                          )}
                                          {prospect.accountInfo?.pov?.exampleUseCase && (
                                            <li>{prospect.accountInfo.pov.exampleUseCase}</li>
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
                                    <span>{prospect.email}</span>
                                  </div>
                                  {prospect.accountInfo?.website && (
                                    <a href={prospect.accountInfo.website.startsWith("http") ? prospect.accountInfo.website : `https://${prospect.accountInfo.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary" onClick={(e) => e.stopPropagation()}>
                                      <Globe className="h-3 w-3" />
                                      <span>Website</span>
                                    </a>
                                  )}
                                  {prospect.sequenceStage && (
                                    <Badge variant="outline" className="text-xs h-5">
                                      {prospect.sequenceStage}
                                    </Badge>
                                  )}
                                  {prospect.lastEmailSent && (
                                    <span>Last email: {prospect.lastEmailSent}</span>
                                  )}
                                </div>

                                {/* Previous Context */}
                                {prospect.callbackContext && (() => {
                                  const lines = prospect.callbackContext.split('\n\n').filter(Boolean)
                                  const callbackReason = lines.find(l => l.startsWith('Callback reason:'))?.replace('Callback reason:', '').trim()
                                  const lastCallNotes = lines.find(l => l.startsWith('Notes from last call:'))?.replace('Notes from last call:', '').trim()
                                  if (!callbackReason && !lastCallNotes) return null
                                  return (
                                    <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                      <div className="flex items-start gap-2">
                                        <History className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1.5">Previous Context</p>
                                          {callbackReason && (
                                            <p className="text-xs text-foreground mb-1"><span className="font-medium">Callback reason:</span> {callbackReason}</p>
                                          )}
                                          {lastCallNotes && (
                                            <p className="text-xs text-muted-foreground leading-relaxed">{lastCallNotes}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })()}

                                {/* Prior Calls */}
                                {prospect.priorCalls && prospect.priorCalls.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                      <History className="h-3 w-3" />
                                      Call History
                                    </p>
                                    {prospect.priorCalls.map((call, i) => (
                                      <div key={i} className="p-2 rounded bg-secondary/30 border border-border">
                                        <div className="flex items-center justify-between mb-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium">{new Date(call.date).toLocaleDateString()}</span>
                                            {call.calledBy && <span className="text-[10px] text-muted-foreground">by {call.calledBy}</span>}
                                          </div>
                                          <Badge variant="outline" className="text-xs h-5">
                                            {call.outcome.replace(/_/g, " ")}
                                          </Badge>
                                        </div>
                                        {call.notes && <p className="text-xs text-muted-foreground">{call.notes}</p>}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Correspondence History */}
                                {prospect.correspondenceHistory && prospect.correspondenceHistory.length > 0 && (
                                  <div className="p-2 rounded-lg bg-muted/30 border border-border">
                                    <div className="flex items-start gap-2">
                                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-foreground mb-1">Correspondence History</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                          {getHistorySummary(prospect.correspondenceHistory)}
                                        </p>
                                      </div>
                                    </div>
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
                                      {editingNoteId !== `q-${prospect.id}-prospect` && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingNoteId(`q-${prospect.id}-prospect`)
                                            setEditingNoteType("prospect")
                                          }}
                                          className="text-xs text-primary hover:underline"
                                        >
                                          {prospectNotes[prospect.email] ? "Edit" : "Add"}
                                        </button>
                                      )}
                                    </div>
                                    {editingNoteId === `q-${prospect.id}-prospect` ? (
                                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                        <Textarea
                                          placeholder="Add notes about this prospect..."
                                          defaultValue={prospectNotes[prospect.email] || ""}
                                          className="min-h-[60px] text-xs"
                                          id={`q-prospect-note-${prospect.id}`}
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              const textarea = document.getElementById(`q-prospect-note-${prospect.id}`) as HTMLTextAreaElement
                                              saveNote(prospect.email, "prospect", textarea.value, prospect.prospectId)
                                            }}
                                            className="h-7 text-xs"
                                          >
                                            <Save className="h-3 w-3 mr-1" />
                                            Save
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => { setEditingNoteId(null); setEditingNoteType(null) }}
                                            className="h-7 text-xs"
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded border border-border">
                                        {prospectNotes[prospect.email] || "No notes yet"}
                                      </div>
                                    )}
                                  </div>

                                  {/* Account Notes */}
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-1.5">
                                        <Users className="h-3 w-3 text-muted-foreground" />
                                        <p className="text-xs font-medium text-foreground">Account Notes ({prospect.company})</p>
                                      </div>
                                      {editingNoteId !== `q-${prospect.id}-account` && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingNoteId(`q-${prospect.id}-account`)
                                            setEditingNoteType("account")
                                          }}
                                          className="text-xs text-primary hover:underline"
                                        >
                                          {accountNotes[prospect.company] ? "Edit" : "Add"}
                                        </button>
                                      )}
                                    </div>
                                    {editingNoteId === `q-${prospect.id}-account` ? (
                                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                        <Textarea
                                          placeholder="Add notes about this account..."
                                          defaultValue={accountNotes[prospect.company] || ""}
                                          className="min-h-[60px] text-xs"
                                          id={`q-account-note-${prospect.id}`}
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              const textarea = document.getElementById(`q-account-note-${prospect.id}`) as HTMLTextAreaElement
                                              saveNote(prospect.company, "account", textarea.value)
                                            }}
                                            className="h-7 text-xs"
                                          >
                                            <Save className="h-3 w-3 mr-1" />
                                            Save
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => { setEditingNoteId(null); setEditingNoteType(null) }}
                                            className="h-7 text-xs"
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded border border-border">
                                        {accountNotes[prospect.company] || "No notes yet"}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                  {mockProspects.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        {selectedTimezones.length > 0 || selectedCallSteps.length > 0 ? "No prospects match the selected filters." : "No prospects in queue."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {/* Quick Call card — now handled inline in the queue row via oneOffProspectId */}
      {false && !sessionActive && callSlots[0]?.contact && (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Quick Call</h2>
            {selectedSequence !== "all" && (
              <p className="text-xs text-muted-foreground mt-1">
                Sequence: {sequences.find(s => s.id === selectedSequence)?.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
              <Phone className="h-3 w-3 mr-1" />
              {selectedPhone}
            </Badge>
            {callSlots[0]?.contact && (
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => {
                  setCallSlots([{
                    id: "1",
                    status: "idle" as CallStatus,
                    contact: null,
                    startTime: null,
                    notes: "",
                    pendingOutcome: undefined,
                    pendingPipelineStage: undefined,
                    pendingCallbackNotes: undefined,
                  }])
                  setExpandedSlots(new Set())
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Close
              </Button>
            )}
          </div>
        </div>

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
                            Completed • {String(Math.floor((slot.finalDuration || 0) / 60)).padStart(2, '0')}:{String((slot.finalDuration || 0) % 60).padStart(2, '0')}
                          </Badge>
                        )}
                        {slot.status === "idle" && (
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-7"
                            disabled={!deviceReady}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (slot.contact) dialOneOff(slot.contact as any)
                            }}
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Dial
                          </Button>
                        )}
                        {(slot.status === "ringing" || slot.status === "connected") && slot.startTime && <CallTimer startTime={slot.startTime} />}
                      </div>

                      {/* Contact Info */}
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          {slot.prospectId ? (
                            <Link href={`/prospects/${slot.prospectId}`} className="font-semibold text-sm hover:text-primary hover:underline">{slot.contact.name}</Link>
                          ) : (
                            <span className="font-semibold text-sm">{slot.contact.name}</span>
                          )}
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
                          {slot.contact.priorCalls.length > 0 && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <PhoneCall className="h-3 w-3" />
                                {slot.contact.priorCalls.length} prior {slot.contact.priorCalls.length === 1 ? "call" : "calls"}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {(slot.contact.accountInfo as any)?.id ? (
                            <Link href={`/accounts/${(slot.contact.accountInfo as any).id}`} className="text-xs text-muted-foreground hover:text-primary hover:underline">{slot.contact.company}</Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">{slot.contact.company}</span>
                          )}
                          {((slot.contact as any).location || (slot.contact.accountInfo as any)?.location) && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{(slot.contact as any).location || (slot.contact.accountInfo as any)?.location}</span>
                            </>
                          )}
                        </div>

                        {/* Prior call log — always visible */}
                        {slot.contact.priorCalls.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {slot.contact.priorCalls.slice(0, 3).map((call, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <span className="shrink-0 font-medium text-foreground/70">{call.date}:</span>
                                {call.calledBy && <span className="shrink-0">{call.calledBy}:</span>}
                                <span className="truncate">{call.notes || call.outcome}</span>
                              </div>
                            ))}
                            {slot.contact.priorCalls.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">+{slot.contact.priorCalls.length - 3} more</span>
                            )}
                          </div>
                        )}
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
                              {slot.pendingOutcome === "callback" && slot.pendingCallbackDate
                                ? `Callback ${slot.pendingCallbackDate.toLocaleDateString([], { month: "short", day: "numeric" })} ${slot.pendingCallbackDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                : slot.pendingOutcome ? outcomeLabels[slot.pendingOutcome] || slot.pendingOutcome : "Outcome"}
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "no_answer")}>
                              <UserX className="h-4 w-4 mr-2" />
                              No Answer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "connected_not_interested")}>
                              <UserX className="h-4 w-4 mr-2 text-orange-500" />
                              Not Interested
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "connected_referral")}>
                              <UserCheck className="h-4 w-4 mr-2 text-blue-500" />
                              Referral
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "connected_info_gathered")}>
                              <FileText className="h-4 w-4 mr-2 text-purple-500" />
                              Informational
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "connected_intro_booked")}>
                              <CalendarCheck className="h-4 w-4 mr-2 text-green-500" />
                              Intro Booked
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "voicemail")}>
                              <Voicemail className="h-4 w-4 mr-2" />
                              Voicemail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCallOutcome(slot.id, "wrong_number")}>
                              <PhoneOff className="h-4 w-4 mr-2 text-red-500" />
                              Wrong Number
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <CalendarClock className="h-4 w-4 mr-2 text-amber-500" />
                                Call Back Later
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => handleCallbackSchedule(slot.id, getCallbackDate("1h"))}>
                                  <Clock className="h-4 w-4 mr-2" />In 1 Hour
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCallbackSchedule(slot.id, getCallbackDate("3h"))}>
                                  <Clock className="h-4 w-4 mr-2" />In 3 Hours
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCallbackSchedule(slot.id, getCallbackDate("tomorrow_morning"))}>
                                  <CalendarIcon className="h-4 w-4 mr-2" />Tomorrow Morning
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCallbackSchedule(slot.id, getCallbackDate("tomorrow_afternoon"))}>
                                  <CalendarIcon className="h-4 w-4 mr-2" />Tomorrow Afternoon
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCallbackSchedule(slot.id, getCallbackDate("next_week"))}>
                                  <CalendarIcon className="h-4 w-4 mr-2" />Next Monday
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCallbackPickerSlotId(slot.id)}>
                                  <CalendarClock className="h-4 w-4 mr-2" />Pick a Date...
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
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

                        {/* Save & Next / Save */}
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white h-7"
                          onClick={() => saveAndAdvance(slot.id)}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
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
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          Calendar
                      </Button>
                    </div>

                    {/* Call Notes — inline in card */}
                    {slot.prospectId && (callSummaries.has(slot.prospectId) || loadingSummaryForProspect === slot.prospectId) && (() => {
                      const summaryData = callSummaries.get(slot.prospectId!)
                      return (
                        <div className="mt-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 flex-1">
                              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-primary mb-1">Call Notes</p>
                                {loadingSummaryForProspect === slot.prospectId && !summaryData ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Generating summary...
                                  </div>
                                ) : summaryData ? (
                                  <div className="space-y-2">
                                    <ul className="text-sm text-foreground leading-relaxed list-disc list-inside space-y-1">
                                      {summaryData.summary.split(/[.!?]+/).filter(s => s.trim()).map((sentence, i) => (
                                        <li key={i}>{sentence.trim()}</li>
                                      ))}
                                    </ul>
                                    <div className="flex items-center gap-2">
                                      {summaryData.emailBody ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7"
                                          onClick={() => {
                                            const to = encodeURIComponent(summaryData.prospectEmail)
                                            const su = encodeURIComponent(summaryData.emailSubject)
                                            const body = encodeURIComponent(summaryData.emailBody)
                                            window.open(`https://mail.google.com/mail/?view=cm&to=${to}&su=${su}&body=${body}`, "_blank")
                                          }}
                                        >
                                          <Mail className="h-3 w-3 mr-1" />
                                          Open in Gmail
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7"
                                          disabled={summaryData.draftingEmail}
                                          onClick={async () => {
                                            if (!summaryData.callId) return
                                            const pId = slot.prospectId!
                                            setCallSummaries(prev => {
                                              const next = new Map(prev)
                                              next.set(pId, { ...summaryData, draftingEmail: true })
                                              return next
                                            })
                                            try {
                                              const res = await fetch(`/api/calls/${summaryData.callId}/draft-email`, { method: "POST" })
                                              if (res.ok) {
                                                const email = await res.json()
                                                setCallSummaries(prev => {
                                                  const next = new Map(prev)
                                                  next.set(pId, { ...prev.get(pId)!, ...email, draftingEmail: false })
                                                  return next
                                                })
                                              } else {
                                                setCallSummaries(prev => {
                                                  const next = new Map(prev)
                                                  next.set(pId, { ...prev.get(pId)!, draftingEmail: false })
                                                  return next
                                                })
                                              }
                                            } catch {
                                              setCallSummaries(prev => {
                                                const next = new Map(prev)
                                                next.set(pId, { ...prev.get(pId)!, draftingEmail: false })
                                                return next
                                              })
                                            }
                                          }}
                                        >
                                          {summaryData.draftingEmail ? (
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          ) : (
                                            <Mail className="h-3 w-3 mr-1" />
                                          )}
                                          Draft Email
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                if (slot.prospectId) {
                                  setCallSummaries(prev => {
                                    const next = new Map(prev)
                                    next.delete(slot.prospectId!)
                                    return next
                                  })
                                }
                              }}
                              className="p-1 rounded hover:bg-muted transition-colors"
                            >
                              <X className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Expandable details section */}
                    {expandedSlots.has(slot.id) && (
                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-border">
                          {/* Company Info */}
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
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Insights */}
                          {(slot.contact.title || (slot.contact as any).companyDescription || (slot.contact.accountInfo as any)?.industry || (slot.contact.accountInfo as any)?.employees || (slot.contact.accountInfo as any)?.pov) && (
                          <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-primary mb-1">Insights</p>
                                <ul className="space-y-1 text-xs text-foreground leading-relaxed list-disc list-inside">
                                  {slot.contact.title && slot.contact.company && (
                                    <li>{slot.contact.name} is {slot.contact.title} at {slot.contact.company}</li>
                                  )}
                                  {(slot.contact.accountInfo as any)?.pov?.whatTheyDo ? (
                                    <li>{(slot.contact.accountInfo as any).pov.whatTheyDo}</li>
                                  ) : ((slot.contact as any).companyDescription || (slot.contact.accountInfo as any)?.industry || (slot.contact.accountInfo as any)?.employees) && (
                                    <li>
                                      {slot.contact.company}{(slot.contact.accountInfo as any)?.employees ? `, ${(slot.contact.accountInfo as any).employees.toLocaleString()} employees` : ""}
                                      {(slot.contact as any).companyDescription ? ` — ${(slot.contact as any).companyDescription}` : (slot.contact.accountInfo as any)?.industry ? ` — ${(slot.contact.accountInfo as any).industry}` : ""}
                                    </li>
                                  )}
                                  {(slot.contact.accountInfo as any)?.pov?.exampleUseCase && (
                                    <li>{(slot.contact.accountInfo as any).pov.exampleUseCase}</li>
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
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium">{call.date}</span>
                                      {call.calledBy && <span className="text-[10px] text-muted-foreground">by {call.calledBy}</span>}
                                    </div>
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
                                          saveNote(slot.contact.email, "prospect", textarea.value, slot.prospectId)
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
                      const nextProspect = mockProspects[currentProspectIndex]
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

          </div>
      </div>
      )}

      {/* Email Dialog */}
      <SendEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        prospect={emailProspect}
      />

      {/* Callback date picker overlay */}
      {callbackPickerSlotId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setCallbackPickerSlotId(null); setCallbackPickerNotes("") }}>
          <div className="bg-background rounded-lg border shadow-lg p-4" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-medium mb-3">Pick a callback date</p>
            <Calendar
              mode="single"
              selected={undefined}
              onSelect={(date) => {
                if (date) {
                  date.setHours(9, 0, 0, 0)
                  handleCallbackSchedule(callbackPickerSlotId, date, callbackPickerNotes)
                  setCallbackPickerSlotId(null)
                  setCallbackPickerNotes("")
                }
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1">Callback notes (optional)</p>
              <Textarea
                placeholder="Why are we calling back? Any context..."
                value={callbackPickerNotes}
                onChange={(e) => setCallbackPickerNotes(e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => { setCallbackPickerSlotId(null); setCallbackPickerNotes("") }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
