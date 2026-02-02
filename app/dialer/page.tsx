"use client"

import { useEffect, useState } from "react"
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
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
  Phone,
  PhoneOff,
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
  X
} from "lucide-react"
import { CallHistory } from "@/components/call-history"

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
  callsPerHour: number
}

export default function DialerPage() {
  const { toast } = useToast()
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionPaused, setSessionPaused] = useState(false)
  const [dialMode, setDialMode] = useState<"parallel" | "single">("parallel")
  const [selectedSequence, setSelectedSequence] = useState<string>("all")
  const [selectedPhone, setSelectedPhone] = useState<string>("+1 (555) 000-0001")
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
    callsPerHour: 0,
  })
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set())
  const [queueSize, setQueueSize] = useState(0)
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null)
  const [editedPhone, setEditedPhone] = useState<string>("")

  // Available sequences
  const sequences = [
    { id: "all", name: "All Sequences" },
    { id: "enterprise", name: "Enterprise Cold Outreach" },
    { id: "sales-leaders", name: "Sales Leaders" },
    { id: "smb", name: "SMB Prospecting" },
    { id: "referral", name: "Referral Follow-up" },
  ]

  // Available phone numbers
  const phoneNumbers = [
    { id: "+1 (555) 000-0001", label: "+1 (555) 000-0001 (Main)" },
    { id: "+1 (555) 000-0002", label: "+1 (555) 000-0002 (Sales)" },
    { id: "+1 (555) 000-0003", label: "+1 (555) 000-0003 (Support)" },
  ]

  // Mock prospects data with extended info - sorted by company (account)
  const allProspects = [
    {
      name: "Emily Rodriguez",
      company: "CloudWorks",
      phone: "+1 (555) 345-6789",
      title: "Director of Ops",
      email: "emily.r@cloudworks.com",
      aiNotes: "Pain point: Manual outreach taking 15hrs/week. Mentioned competitor in last email. Strong buying signals.",
      priorCalls: [],
      lastEmailSent: "2025-01-20",
      sequenceStage: "Step 1 of 5",
      sequence: "smb"
    },
    {
      name: "Michael Chen",
      company: "DataSystems Inc",
      phone: "+1 (555) 234-5678",
      title: "CTO",
      email: "mchen@datasystems.io",
      aiNotes: "Technical decision maker. Team size: 45. Looking to consolidate tools. Budget approved for Q1.",
      priorCalls: [
        { date: "2025-01-12", outcome: "No Answer", notes: "Called at 2pm EST" }
      ],
      lastEmailSent: "2025-01-16",
      sequenceStage: "Step 2 of 5",
      sequence: "enterprise"
    },
    {
      name: "Jessica Taylor",
      company: "Enterprise Solutions",
      phone: "+1 (555) 567-8901",
      title: "Head of Marketing",
      email: "jtaylor@enterprisesolutions.com",
      aiNotes: "Previously churned customer (2023). New leadership, different pain points. Opportunity to re-engage.",
      priorCalls: [
        { date: "2025-01-08", outcome: "Voicemail", notes: "Mentioned new product features" },
        { date: "2025-01-05", outcome: "Gatekeeper", notes: "EA screening calls" }
      ],
      lastEmailSent: "2025-01-17",
      sequenceStage: "Step 3 of 5",
      sequence: "enterprise"
    },
    {
      name: "David Park",
      company: "Innovation Labs",
      phone: "+1 (555) 456-7890",
      title: "CEO",
      email: "dpark@innovationlabs.co",
      aiNotes: "Referral from existing customer. Fast-growing startup (Series B). Urgency: High - scaling SDR team.",
      priorCalls: [
        { date: "2025-01-14", outcome: "Connected", notes: "Requested pricing, mentioned 20-seat license" }
      ],
      lastEmailSent: "2025-01-19",
      sequenceStage: "Step 4 of 5",
      sequence: "referral"
    },
    {
      name: "Sarah Johnson",
      company: "TechCorp",
      phone: "+1 (555) 123-4567",
      title: "VP of Sales",
      email: "sarah.j@techcorp.com",
      aiNotes: "High-intent prospect. Recently visited pricing page 3x. Company is actively evaluating sales engagement platforms.",
      priorCalls: [
        { date: "2025-01-15", outcome: "Connected", notes: "Interested in demo, asked about integrations" },
        { date: "2025-01-10", outcome: "Voicemail", notes: "Left callback request" }
      ],
      lastEmailSent: "2025-01-18",
      sequenceStage: "Step 3 of 5",
      sequence: "sales-leaders"
    },
  ]

  // Filter prospects based on selected sequence
  const mockProspects = selectedSequence === "all"
    ? allProspects
    : allProspects.filter(p => p.sequence === selectedSequence)

  // Update queue size when sequence changes
  useEffect(() => {
    setQueueSize(mockProspects.length)
  }, [selectedSequence, mockProspects.length])

  const makeCall = async (slotIndex: number, prospect: typeof mockProspects[0]) => {
    try {
      const response = await fetch("/api/calls/make", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: prospect.phone,
          metadata: {
            prospectName: prospect.name,
            prospectCompany: prospect.company,
            sequence: prospect.sequence,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("Failed to make call:", data.error)
        return null
      }

      return {
        callId: data.callId,
        twilioSid: data.twilioSid,
      }
    } catch (error) {
      console.error("Error making call:", error)
      return null
    }
  }

  const startSession = async () => {
    setSessionActive(true)
    setSessionPaused(false)
    // Start dialing based on mode
    const updatedSlots = [...callSlots]
    const slotsToFill = dialMode === "parallel" ? 2 : 1

    for (let idx = 0; idx < slotsToFill && idx < mockProspects.length; idx++) {
      const prospect = mockProspects[idx]
      if (prospect) {
        updatedSlots[idx].contact = prospect
        updatedSlots[idx].status = "ringing"
        updatedSlots[idx].startTime = Date.now()

        // Make the actual call
        const callData = await makeCall(idx, prospect)
        if (callData) {
          updatedSlots[idx].callId = callData.callId
          updatedSlots[idx].twilioSid = callData.twilioSid
        }
      }
    }

    setCallSlots(updatedSlots)
    setQueueSize(prev => Math.max(0, prev - slotsToFill))
  }

  const pauseSession = () => {
    setSessionPaused(!sessionPaused)
  }

  const stopSession = () => {
    setSessionActive(false)
    setSessionPaused(false)
    setCallSlots(callSlots.map(slot => ({
      ...slot,
      status: "idle",
      contact: null,
      startTime: null,
      notes: "",
    })))
  }

  const handleCallOutcome = async (slotId: string, outcome: "connected" | "voicemail" | "no-answer" | "skip") => {
    const slotIndex = callSlots.findIndex(s => s.id === slotId)
    if (slotIndex === -1) return

    const slot = callSlots[slotIndex]

    // Save call outcome to database if we have a callId
    if (slot.callId && outcome !== "skip") {
      try {
        await fetch(`/api/calls/${slot.callId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outcome: outcome.replace("-", "_"),
            notes: slot.notes,
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
      connected: outcome === "connected" ? prev.connected + 1 : prev.connected,
      voicemail: outcome === "voicemail" ? prev.voicemail + 1 : prev.voicemail,
      noAnswer: outcome === "no-answer" ? prev.noAnswer + 1 : prev.noAnswer,
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

    // Auto-dial next prospect if session is active and not paused
    const shouldAutoDial = sessionActive && !sessionPaused && queueSize > 0
    const canAutoDialThisSlot = dialMode === "parallel" || slotIndex === 0

    if (shouldAutoDial && canAutoDialThisSlot) {
      const nextProspectIndex = Math.floor(Math.random() * mockProspects.length)
      const nextProspect = mockProspects[nextProspectIndex]
      if (nextProspect) {
        updatedSlots[slotIndex].contact = nextProspect
        updatedSlots[slotIndex].status = "ringing"
        updatedSlots[slotIndex].startTime = Date.now()

        // Make the call
        const callData = await makeCall(slotIndex, nextProspect)
        if (callData) {
          updatedSlots[slotIndex].callId = callData.callId
          updatedSlots[slotIndex].twilioSid = callData.twilioSid
        }

        setQueueSize(prev => Math.max(0, prev - 1))
      }
    }

    setCallSlots(updatedSlots)
  }

  const updateNotes = (slotId: string, notes: string) => {
    setCallSlots(prev => prev.map(slot =>
      slot.id === slotId ? { ...slot, notes } : slot
    ))
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

  const dialOneOff = async (prospect: typeof mockProspects[0]) => {
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

    const updatedSlots = [...callSlots]
    updatedSlots[slotIndex].contact = prospect
    updatedSlots[slotIndex].status = "ringing"
    updatedSlots[slotIndex].startTime = Date.now()

    const callData = await makeCall(slotIndex, prospect)
    if (callData) {
      updatedSlots[slotIndex].callId = callData.callId
      updatedSlots[slotIndex].twilioSid = callData.twilioSid
    }

    setCallSlots(updatedSlots)
    setQueueSize(prev => Math.max(0, prev - 1))

    toast({
      title: "Calling...",
      description: `Dialing ${prospect.name}`,
    })
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
          {!sessionActive ? (
            <Button onClick={startSession} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Play className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          ) : (
            <>
              <Button onClick={pauseSession} variant="outline">
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

                      {/* AI Notes */}
                      <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-start gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-primary mb-1">AI Insights</p>
                            <p className="text-xs text-foreground leading-relaxed">{prospect.aiNotes}</p>
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
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="Pre-call notes or strategy..."
                    className="min-h-[60px] text-sm"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Ready to dial when session starts
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
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

                        {/* AI Notes */}
                        <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
                          <div className="flex items-start gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-primary mb-1">AI Insights</p>
                              <p className="text-xs text-foreground leading-relaxed">{slot.contact.aiNotes}</p>
                            </div>
                          </div>
                        </div>

                        {/* Prior Call History */}
                        {slot.contact.priorCalls.length > 0 && (
                          <div className="mt-3">
                            <button
                              onClick={() => toggleExpanded(slot.id)}
                              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                            >
                              <History className="h-3 w-3" />
                              <span>Call History ({slot.contact.priorCalls.length})</span>
                              {expandedSlots.has(slot.id) ? (
                                <ChevronUp className="h-3 w-3 ml-auto" />
                              ) : (
                                <ChevronDown className="h-3 w-3 ml-auto" />
                              )}
                            </button>
                            {expandedSlots.has(slot.id) && (
                              <div className="mt-2 space-y-2">
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
                          </div>
                        )}
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
                        onClick={() => handleCallOutcome(slot.id, "no-answer")}
                      >
                        <UserX className="h-3 w-3 mr-1" />
                        No Answer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCallOutcome(slot.id, "skip")}
                      >
                        <SkipForward className="h-3 w-3 mr-1" />
                        Skip
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Call History */}
      <div className="mt-6">
        <CallHistory limit={20} />
      </div>
    </div>
  )
}
