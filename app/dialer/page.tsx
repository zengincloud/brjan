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
} from "lucide-react"
import { SendEmailDialog } from "@/components/send-email-dialog"
import { Calendar } from "lucide-react"
import { Device, Call as TwilioCall } from "@twilio/voice-sdk"

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
    aiNotes: string
    priorCalls: { date: string; outcome: string; notes: string }[]
    lastEmailSent: string
    sequenceStage: string
    sequence: string
  } | null
  startTime: number | null
  notes: string
  callId?: string
  twilioSid?: string
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
  priority?: string
  dueDate?: Date | string | null
  status?: string
}

export default function DialerPage() {
  const { toast } = useToast()
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionPaused, setSessionPaused] = useState(false)
  const [dialMode, setDialMode] = useState<"parallel" | "single">("parallel")
  const [selectedSequence, setSelectedSequence] = useState<string>("all")
  const [selectedPhone, setSelectedPhone] = useState<string>("+16282253832")
  const [callSlots, setCallSlots] = useState<CallSlot[]>([
    { id: "1", status: "idle", contact: null, startTime: null, notes: "" },
    { id: "2", status: "idle", contact: null, startTime: null, notes: "" },
    { id: "3", status: "idle", contact: null, startTime: null, notes: "" },
    { id: "4", status: "idle", contact: null, startTime: null, notes: "" },
  ])
  const [stats, setStats] = useState<SessionStats>({
    totalCalls: 0,
    connected: 0,
    voicemail: 0,
    noAnswer: 0,
    pipeline: 0,
    callsPerHour: 0,
  })
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set())
  const [queueSize, setQueueSize] = useState(0)
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

  // Twilio state
  const [deviceReady, setDeviceReady] = useState(false)
  const [deviceError, setDeviceError] = useState<string | null>(null)
  const [currentProspectIndex, setCurrentProspectIndex] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [showOutcomeButtons, setShowOutcomeButtons] = useState(false)

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

  // Available sequences
  const sequences = [
    { id: "all", name: "All Sequences" },
    { id: "enterprise", name: "Enterprise Cold Outreach" },
    { id: "sales-leaders", name: "Sales Leaders" },
    { id: "smb", name: "SMB Prospecting" },
    { id: "referral", name: "Referral Follow-up" },
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
          setDeviceError(error.message || "Device error")
          toast({
            title: "Device Error",
            description: error.message || "Failed to initialize calling device",
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

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (callStartTimeRef.current && callSlots.some(s => s.status === "connected")) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current!) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [callSlots])

  // Demo prospects data (fallback when no API data)
  const allProspects = [
    {
      name: "Emily Rodriguez",
      company: "CloudWorks",
      phone: "+1 (555) 345-6789",
      title: "Director of Ops",
      email: "emily.r@cloudworks.com",
      industry: "Cloud Infrastructure",
      companySize: "50-200",
      businessDescription: "CloudWorks provides cloud infrastructure solutions including hosting, storage, and compute services for mid-market businesses.",
      whatTheySell: "Cloud hosting, managed infrastructure, and DevOps automation tools",
      aiNotes: "Pain point: Manual outreach taking 15hrs/week. Mentioned competitor in last email. Strong buying signals.",
      priorCalls: [],
      lastEmailSent: "2025-01-20",
      sequenceStage: "Step 1 of 5",
      sequence: "smb",
      correspondenceHistory: [
        { date: "2025-01-20", type: "email", from: "Sarah M. (SDR)", summary: "Sent intro email about platform automation features" },
        { date: "2025-01-15", type: "linkedin", from: "Sarah M. (SDR)", summary: "Connection request accepted" }
      ],
      pov: {
        opportunity: "As Director of Ops at a 50-200 person cloud infrastructure company, Emily is responsible for operational efficiency and team productivity. Manual outreach consuming 15 hours per week indicates significant automation opportunity.",
        industryContext: "In the Cloud Infrastructure space, companies like CloudWorks are facing challenges around scaling operations without proportional headcount increases. With increasing pressure to demonstrate ROI and streamline workflows, automation tools are becoming essential.",
        howToHelp: "Your platform can help Emily reclaim 80% of the time currently spent on manual outreach, allowing her team to focus on high-value conversations and strategic initiatives.",
        angle: "Lead with time-savings metrics and show ROI calculator. Emphasize quick implementation and minimal training required. Focus on operational efficiency gains."
      }
    },
    {
      name: "Michael Chen",
      company: "DataSystems Inc",
      phone: "+1 (555) 234-5678",
      title: "CTO",
      email: "mchen@datasystems.io",
      industry: "Data Analytics",
      companySize: "200-500",
      businessDescription: "DataSystems Inc offers enterprise data analytics and business intelligence solutions for Fortune 500 companies.",
      whatTheySell: "Data warehousing, BI dashboards, and predictive analytics software",
      aiNotes: "Technical decision maker. Team size: 45. Looking to consolidate tools. Budget approved for Q1.",
      priorCalls: [
        { date: "2025-01-12", outcome: "No Answer", notes: "Called at 2pm EST" }
      ],
      lastEmailSent: "2025-01-16",
      sequenceStage: "Step 2 of 5",
      sequence: "enterprise",
      correspondenceHistory: [
        { date: "2025-01-16", type: "email", from: "Tom R. (AE)", summary: "Follow-up on tool consolidation discussion, shared case study" },
        { date: "2025-01-12", type: "call", from: "Tom R. (AE)", summary: "Attempted call - no answer" },
        { date: "2025-01-08", type: "email", from: "Tom R. (AE)", summary: "Initial outreach mentioning Q1 budget cycles" }
      ],
      pov: {
        opportunity: "Michael is the technical decision maker at a 200-500 person data analytics company with budget approved for Q1. His interest in tool consolidation suggests he's looking to streamline operations and reduce tech stack complexity.",
        industryContext: "In the Data Analytics space, companies like DataSystems Inc are facing challenges around data security, integration complexity, and demonstrating clear ROI on technology investments. Tool consolidation is a hot topic as companies seek to reduce costs and improve efficiency.",
        howToHelp: "Your platform can help Michael consolidate multiple tools into a single solution, reducing integration overhead and total cost of ownership while improving team productivity.",
        angle: "Lead with integration capabilities and total cost of ownership analysis. Emphasize technical architecture and security features. Focus on Q1 implementation timeline to align with approved budget."
      }
    },
    {
      name: "Jessica Taylor",
      company: "Enterprise Solutions",
      phone: "+1 (555) 567-8901",
      title: "Head of Marketing",
      email: "jtaylor@enterprisesolutions.com",
      industry: "Enterprise Software",
      companySize: "1000-5000",
      businessDescription: "Enterprise Solutions develops enterprise resource planning (ERP) and workflow management software for large organizations.",
      whatTheySell: "ERP systems, process automation, and enterprise collaboration tools",
      aiNotes: "Previously churned customer (2023). New leadership, different pain points. Opportunity to re-engage.",
      priorCalls: [
        { date: "2025-01-08", outcome: "Voicemail", notes: "Mentioned new product features" },
        { date: "2025-01-05", outcome: "Gatekeeper", notes: "EA screening calls" }
      ],
      lastEmailSent: "2025-01-17",
      sequenceStage: "Step 3 of 5",
      sequence: "enterprise",
      correspondenceHistory: [
        { date: "2025-01-17", type: "email", from: "Lisa K. (CSM)", summary: "Re-engagement email highlighting new features since 2023" },
        { date: "2025-01-08", type: "call", from: "Lisa K. (CSM)", summary: "Left voicemail mentioning product improvements" },
        { date: "2025-01-05", type: "call", from: "Lisa K. (CSM)", summary: "Reached EA, scheduled follow-up" },
        { date: "2023-06-15", type: "note", from: "Previous CSM", summary: "Account churned - pricing concerns and feature gaps cited" }
      ],
      pov: {
        opportunity: "Jessica is new leadership at a previously churned account. The company's pain points may have evolved, and our platform has added significant features since 2023. This represents a strong re-engagement opportunity.",
        industryContext: "In the Enterprise Software space, companies like Enterprise Solutions are facing increasing pressure to consolidate vendors and demonstrate marketing ROI. With new leadership often comes budget reallocation and tool evaluation.",
        howToHelp: "Your platform's new features directly address the gaps that led to churn in 2023. Updated automation capabilities, improved analytics, and competitive pricing make this a strong fit for their current needs.",
        angle: "Acknowledge past relationship, highlight what's changed since 2023. Lead with new features and improved value proposition. Position as a fresh look with new leadership. Focus on marketing ROI metrics."
      }
    },
    {
      name: "David Park",
      company: "Innovation Labs",
      phone: "+1 (555) 456-7890",
      title: "CEO",
      email: "dpark@innovationlabs.co",
      industry: "SaaS",
      companySize: "20-50",
      businessDescription: "Innovation Labs is a fast-growing Series B startup building AI-powered productivity tools for modern teams.",
      whatTheySell: "AI productivity software, team collaboration platform, and workflow automation",
      aiNotes: "Referral from existing customer. Fast-growing startup (Series B). Urgency: High - scaling SDR team.",
      priorCalls: [
        { date: "2025-01-14", outcome: "Connected", notes: "Requested pricing, mentioned 20-seat license" }
      ],
      lastEmailSent: "2025-01-19",
      sequenceStage: "Step 4 of 5",
      sequence: "referral",
      correspondenceHistory: [
        { date: "2025-01-19", type: "email", from: "Alex D. (AE)", summary: "Sent pricing proposal for 20-seat license with implementation timeline" },
        { date: "2025-01-14", type: "call", from: "Alex D. (AE)", summary: "Connected - discussed SDR team scaling challenges, pricing questions" },
        { date: "2025-01-10", type: "email", from: "Alex D. (AE)", summary: "Warm intro from TechCorp (existing customer)" }
      ],
      pov: {
        opportunity: "David is the CEO of a Series B startup actively scaling their SDR team. The referral from an existing customer (TechCorp) significantly increases trust. His direct engagement with pricing indicates high intent and urgency.",
        industryContext: "In the SaaS space, companies like Innovation Labs are facing challenges around rapid growth and scaling go-to-market operations efficiently. Post-Series B startups need to demonstrate quick returns on investment and prove unit economics to investors.",
        howToHelp: "Your platform can help David scale his SDR team efficiently without proportional cost increases. Proven results from the referring customer (TechCorp) provide social proof and reduce perceived risk.",
        angle: "Lead with referral success story from TechCorp. Emphasize fast time-to-value and onboarding support for rapidly scaling teams. Focus on metrics that matter to investors: efficiency gains, cost per acquisition, and revenue impact."
      }
    },
    {
      name: "Sarah Johnson",
      company: "TechCorp",
      phone: "+1 (555) 123-4567",
      title: "VP of Sales",
      email: "sarah.j@techcorp.com",
      industry: "Technology",
      companySize: "500-1000",
      businessDescription: "TechCorp is a technology company specializing in custom software development and IT consulting services for enterprise clients.",
      whatTheySell: "Custom software development, IT consulting, and digital transformation services",
      aiNotes: "High-intent prospect. Recently visited pricing page 3x. Company is actively evaluating sales engagement platforms.",
      priorCalls: [
        { date: "2025-01-15", outcome: "Connected", notes: "Interested in demo, asked about integrations" },
        { date: "2025-01-10", outcome: "Voicemail", notes: "Left callback request" }
      ],
      lastEmailSent: "2025-01-18",
      sequenceStage: "Step 3 of 5",
      sequence: "sales-leaders",
      correspondenceHistory: [
        { date: "2025-01-18", type: "email", from: "Mike P. (AE)", summary: "Follow-up with demo recording and integration documentation" },
        { date: "2025-01-15", type: "call", from: "Mike P. (AE)", summary: "Connected - demo discussion, integration requirements gathered" },
        { date: "2025-01-10", type: "call", from: "Mike P. (AE)", summary: "Left voicemail requesting callback" },
        { date: "2025-01-08", type: "email", from: "Mike P. (AE)", summary: "Initial outreach - sales automation platform overview" }
      ],
      pov: {
        opportunity: "Sarah is a VP of Sales at a 500-1000 person technology company showing high buying intent (3 pricing page visits). Active evaluation of sales engagement platforms indicates budget allocation and decision timeline are likely defined.",
        industryContext: "In the Technology sector, companies like TechCorp are facing increasing pressure to improve sales efficiency, reduce cost per acquisition, and demonstrate clear pipeline impact. Sales leaders are being asked to do more with the same or smaller teams.",
        howToHelp: "Your platform can help Sarah's sales team increase productivity through automation, improve visibility into pipeline health, and demonstrate ROI through detailed analytics and reporting.",
        angle: "Lead with integration capabilities since she specifically asked about this. Show pipeline impact metrics from similar-sized companies. Emphasize executive reporting features that help VPs demonstrate team effectiveness to leadership."
      }
    },
  ]

  // Combine API prospects with demo prospects (API prospects first)
  const demoProspects = selectedSequence === "all"
    ? allProspects
    : allProspects.filter(p => p.sequence === selectedSequence)

  // Use API prospects if available, otherwise use demo data
  const mockProspects: DialerProspect[] = apiProspects.length > 0
    ? apiProspects.filter(p => p.phone) // Only include prospects with phone numbers
    : demoProspects.map(p => ({ ...p, id: `demo-${p.email}` }))

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

      // Update slot to ringing state
      setCallSlots(prev => prev.map((slot, idx) =>
        idx === slotIndex
          ? { ...slot, contact: prospect, status: "ringing" as CallStatus, startTime: Date.now(), callId: data.callId }
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
        setShowOutcomeButtons(true)

        // Play hangup sound
        playHangupSound()

        // Update slot to completed
        setCallSlots(prev => prev.map((slot, idx) =>
          idx === slotIndex
            ? { ...slot, status: "completed" as CallStatus }
            : slot
        ))
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

        toast({
          title: "Call Error",
          description: error.message || "An error occurred during the call",
          variant: "destructive",
        })
        handleCallOutcomeAndAdvance(slotIndex, "failed")
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
    const slot = callSlots[slotIndex]

    // Save outcome to database
    if (slot?.callId) {
      try {
        await fetch(`/api/calls/${slot.callId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outcome,
            notes: slot.notes,
            endedAt: new Date().toISOString(),
          }),
        })
      } catch (error) {
        console.error("Error saving call outcome:", error)
      }
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
  }, [callSlots, sessionActive, sessionPaused, currentProspectIndex, mockProspects, connectCall, toast])

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

    setSessionActive(true)
    setSessionPaused(false)
    setCurrentProspectIndex(0)
    setShowOutcomeButtons(false)

    // Start with the first prospect
    const firstProspect = mockProspects[0]
    if (firstProspect) {
      await connectCall(firstProspect, 0)
      setQueueSize(mockProspects.length - 1)
    }
  }

  const pauseSession = () => {
    setSessionPaused(!sessionPaused)
  }

  const stopSession = () => {
    // Play hangup sound
    playHangupSound()

    // End any active call
    if (activeCallRef.current) {
      activeCallRef.current.disconnect()
      activeCallRef.current = null
    }

    setSessionActive(false)
    setSessionPaused(false)
    setShowOutcomeButtons(false)
    setCallDuration(0)
    callStartTimeRef.current = null
    setCurrentProspectIndex(0)
    setCallSlots(callSlots.map(slot => ({
      ...slot,
      status: "idle",
      contact: null,
      startTime: null,
      notes: "",
    })))
  }

  // Pipeline stages for call outcomes
  type PipelineStage = "interested" | "intro_booked" | "opportunity" | "demo_booked"

  const pipelineStageLabels: Record<PipelineStage, string> = {
    interested: "Interested",
    intro_booked: "Intro Booked",
    opportunity: "Opportunity",
    demo_booked: "Demo Booked",
  }

  const handleCallOutcome = async (slotId: string, outcome: "connected" | "voicemail" | "no_answer") => {
    const slotIndex = callSlots.findIndex(s => s.id === slotId)
    if (slotIndex === -1) return

    await handleCallOutcomeAndAdvance(slotIndex, outcome)
  }

  const handlePipelineOutcome = async (slotId: string, pipelineStage: PipelineStage) => {
    const slotIndex = callSlots.findIndex(s => s.id === slotId)
    if (slotIndex === -1) return

    const slot = callSlots[slotIndex]
    const contact = slot.contact

    // Save call outcome to database if we have a callId
    if (slot.callId) {
      try {
        await fetch(`/api/calls/${slot.callId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outcome: "connected",
            pipelineStage,
            notes: slot.notes,
          }),
        })
      } catch (error) {
        console.error("Error saving pipeline outcome:", error)
      }
    }

    // Show toast notification for pipeline progress
    toast({
      title: `Pipeline: ${pipelineStageLabels[pipelineStage]}`,
      description: contact ? `${contact.name} moved to ${pipelineStageLabels[pipelineStage]}` : "Pipeline updated",
    })

    // Update stats (counts as connected + pipeline)
    setStats(prev => ({
      ...prev,
      totalCalls: prev.totalCalls + 1,
      connected: prev.connected + 1,
      pipeline: prev.pipeline + 1,
      callsPerHour: Math.round((prev.totalCalls + 1) / ((Date.now() - (callSlots[0].startTime || Date.now())) / 3600000) || 0),
    }))

    // Complete current call and start next
    const updatedSlots = [...callSlots]
    updatedSlots[slotIndex] = {
      id: slotId,
      status: "idle",
      contact: null,
      startTime: null,
      notes: "",
    }

    setCallSlots(updatedSlots)

    // Auto-dial next prospect if session is active and not paused
    const shouldAutoDial = sessionActive && !sessionPaused && queueSize > 0
    const canAutoDialThisSlot = dialMode === "parallel" || slotIndex === 0

    if (shouldAutoDial && canAutoDialThisSlot) {
      const nextProspectIndex = Math.floor(Math.random() * mockProspects.length)
      const nextProspect = mockProspects[nextProspectIndex]
      if (nextProspect) {
        await connectCall(nextProspect, slotIndex)
        setQueueSize(prev => Math.max(0, prev - 1))
      }
    }
  }

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
            {dialMode === "parallel" ? "Parallel" : "Single"} Dialer
          </h1>
          <p className="text-sm text-muted-foreground">
            {dialMode === "parallel" ? "Dial multiple prospects simultaneously" : "Dial one prospect at a time"}
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
                  {mockProspects.length} prospects available
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
                <Label htmlFor="mode-select" className="text-sm">Dial Mode</Label>
                <Select value={dialMode} onValueChange={(value: "parallel" | "single") => setDialMode(value)}>
                  <SelectTrigger id="mode-select">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parallel">Parallel (2-4 calls)</SelectItem>
                    <SelectItem value="single">Single (1 call)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {dialMode === "parallel" ? "Higher velocity" : "More focused"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prospect Preview - Only show when session is not active */}
      {!sessionActive && mockProspects.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Upcoming Prospects</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Preview of next {Math.min(10, mockProspects.length)} prospects in queue
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {mockProspects.slice(0, 10).map((prospect, idx) => (
              <Card key={idx} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{prospect.name}</CardTitle>
                            <Badge variant="outline" className="text-xs">
                              #{idx + 1} in queue
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{prospect.company}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{prospect.title}</p>
                        </div>
                      </div>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              dialOneOff(prospect)
                            }}
                            className="font-mono text-primary hover:underline cursor-pointer"
                          >
                            {prospect.phone}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{prospect.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs h-5">
                            {prospect.sequenceStage}
                          </Badge>
                          <span>• Last email: {prospect.lastEmailSent}</span>
                        </div>
                      </div>

                      {/* Insights */}
                      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-start gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <p className="text-xs font-medium text-primary">Insights</p>
                            <div className="space-y-1.5">
                              <p className="text-xs text-foreground leading-relaxed">
                                <span className="font-medium text-muted-foreground">What they do:</span> {(prospect as any).businessDescription}
                              </p>
                              <p className="text-xs text-foreground leading-relaxed">
                                <span className="font-medium text-muted-foreground">What they sell:</span> {(prospect as any).whatTheySell}
                              </p>
                              <p className="text-xs text-foreground leading-relaxed">
                                <span className="font-medium text-muted-foreground">Key intel:</span> {prospect.aiNotes}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Prior Call History */}
                      {prospect.priorCalls.length > 0 && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleExpanded(`preview-${idx}`)}
                            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                          >
                            <History className="h-3 w-3" />
                            <span>Call History ({prospect.priorCalls.length})</span>
                            {expandedSlots.has(`preview-${idx}`) ? (
                              <ChevronUp className="h-3 w-3 ml-auto" />
                            ) : (
                              <ChevronDown className="h-3 w-3 ml-auto" />
                            )}
                          </button>
                          {expandedSlots.has(`preview-${idx}`) && (
                            <div className="mt-2 space-y-2">
                              {prospect.priorCalls.map((call, callIdx) => (
                                <div key={callIdx} className="p-2 rounded bg-secondary/30 border border-border">
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
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
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
            {callSlots.slice(0, dialMode === "parallel" ? 4 : 1).map((slot) => (
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
                    {/* Main row with key info */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Status, Timer, and Call Controls */}
                      <div className="flex items-center gap-2 min-w-[180px]">
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
                        {slot.status === "completed" && showOutcomeButtons && (
                          <Badge variant="outline" className="border-orange-500/50 text-orange-600">
                            Select outcome below
                          </Badge>
                        )}
                        {slot.status === "idle" && (
                          <Badge variant="outline">Idle</Badge>
                        )}
                        {slot.startTime && <CallTimer startTime={slot.startTime} />}
                      </div>

                      {/* Contact Info */}
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm">{slot.contact.name}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{slot.contact.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{slot.contact.company}</span>
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-1.5">
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

                    </div>

                    {/* Outcome Buttons */}
                    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground font-medium mr-1">Outcome:</span>
                      <Button
                        size="sm"
                        onClick={() => handleCallOutcome(slot.id, "connected")}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground h-7"
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Connected
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCallOutcome(slot.id, "voicemail")}
                        className="h-7"
                      >
                        <Voicemail className="h-3 w-3 mr-1" />
                        VM
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCallOutcome(slot.id, "no_answer")}
                        className="h-7"
                      >
                        <UserX className="h-3 w-3 mr-1" />
                        No Answer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCallOutcome(slot.id, "no_answer")}
                        className="h-7"
                      >
                        <SkipForward className="h-3 w-3 mr-1" />
                        Skip
                      </Button>
                      <div className="border-l border-border h-5 mx-1" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white h-7"
                          >
                            <Rocket className="h-3 w-3 mr-1" />
                            Pipeline
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => slot.contact && openEmailDialog(slot.contact)}
                        className="h-7"
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => slot.contact && openCalendarInvite(slot.contact)}
                        className="h-7"
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Calendar
                      </Button>
                    </div>

                    {/* Expandable details section */}
                    <div>
                      <button
                        onClick={() => toggleExpanded(slot.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {expandedSlots.has(slot.id) ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        <span>{expandedSlots.has(slot.id) ? "Hide" : "Show"} Details</span>
                        <span className="text-muted-foreground/60">•</span>
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-primary">Insights</span>
                        {slot.contact.priorCalls.length > 0 && (
                          <>
                            <span className="text-muted-foreground/60">•</span>
                            <History className="h-3 w-3" />
                            <span>{slot.contact.priorCalls.length} prior calls</span>
                          </>
                        )}
                      </button>

                      {expandedSlots.has(slot.id) && (
                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-border">
                          {/* AI Notes */}
                          <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="flex items-start gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs font-medium text-primary mb-1">Insights</p>
                                <p className="text-xs text-foreground leading-relaxed">{slot.contact.aiNotes}</p>
                              </div>
                            </div>
                          </div>

                          {/* Contact details */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3" />
                              <span>{slot.contact.email}</span>
                            </div>
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

                          {/* Point of View */}
                          {(slot.contact as any).pov && (
                            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                              <div className="flex items-start gap-2 mb-2">
                                <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                                <p className="text-xs font-medium text-primary">Point of View</p>
                              </div>
                              <div className="space-y-2 text-xs text-foreground leading-relaxed">
                                <p>
                                  <strong className="text-primary">Opportunity:</strong> {(slot.contact as any).pov.opportunity}
                                </p>
                                <p>
                                  <strong className="text-primary">Industry Context:</strong> {(slot.contact as any).pov.industryContext}
                                </p>
                                <p>
                                  <strong className="text-primary">How to Help:</strong> {(slot.contact as any).pov.howToHelp}
                                </p>
                                <p>
                                  <strong className="text-primary">Angle:</strong> {(slot.contact as any).pov.angle}
                                </p>
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
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-2">Waiting for next call...</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Card-based layout when session is not active */
          <div className={`grid gap-4 ${dialMode === "parallel" ? "md:grid-cols-2" : "md:grid-cols-1 max-w-2xl"}`}>
            {callSlots.slice(0, dialMode === "parallel" ? 4 : 1).map((slot) => (
              <Card
                key={slot.id}
                className={`border-border ${
                  slot.status === "ringing"
                    ? "border-primary/50 bg-primary/5"
                    : slot.status === "connected"
                    ? "border-primary bg-primary/10"
                    : "bg-card"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {slot.contact ? (
                        <>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{slot.contact.name}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{slot.contact.company}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{slot.contact.title}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {slot.status === "ringing" && (
                                <Badge className="bg-primary/20 text-primary border-0">Ringing</Badge>
                              )}
                              {slot.status === "connected" && (
                                <Badge className="bg-primary text-primary-foreground border-0">Connected</Badge>
                              )}
                              {slot.startTime && <CallTimer startTime={slot.startTime} />}
                            </div>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs">
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
                                  <span className="font-mono">{slot.contact.phone}</span>
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
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span>{slot.contact.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs h-5">
                                {slot.contact.sequenceStage}
                              </Badge>
                              <span>• Last email: {slot.contact.lastEmailSent}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">Waiting for next call...</div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {slot.contact && (
                    <>
                      <Textarea
                        placeholder="Call notes..."
                        value={slot.notes}
                        onChange={(e) => updateNotes(slot.id, e.target.value)}
                        className="min-h-[60px] text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleCallOutcome(slot.id, "connected")}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          Connected
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCallOutcome(slot.id, "voicemail")}
                        >
                          <Voicemail className="h-3 w-3 mr-1" />
                          Voicemail
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCallOutcome(slot.id, "no_answer")}
                        >
                          <UserX className="h-3 w-3 mr-1" />
                          No Answer
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCallOutcome(slot.id, "no_answer")}
                        >
                          <SkipForward className="h-3 w-3 mr-1" />
                          Skip
                        </Button>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Rocket className="h-3 w-3 mr-1" />
                            Pipeline
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-48">
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
                    </>
                  )}
                </CardContent>
              </Card>
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
