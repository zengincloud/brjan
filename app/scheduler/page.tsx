"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarClock, Clock, Plus, X, Globe, Users, Check, Info, ExternalLink, Loader2, CalendarDays, MapPin, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import Link from "next/link"
import { BRLoader } from "@/components/ui/br-loader"
import { getTimezoneFromLocation } from "@/lib/timezone"

const timeZones = [
  { value: "utc-8", label: "Pacific Time (UTC-8)", offset: -8 },
  { value: "utc-7", label: "Mountain Time (UTC-7)", offset: -7 },
  { value: "utc-6", label: "Central Time (UTC-6)", offset: -6 },
  { value: "utc-5", label: "Eastern Time (UTC-5)", offset: -5 },
  { value: "utc-4", label: "Atlantic Time (UTC-4)", offset: -4 },
  { value: "utc", label: "UTC", offset: 0 },
  { value: "utc+1", label: "Central European Time (UTC+1)", offset: 1 },
  { value: "utc+2", label: "Eastern European Time (UTC+2)", offset: 2 },
  { value: "utc+3", label: "Moscow Time (UTC+3)", offset: 3 },
  { value: "utc+5.5", label: "Indian Standard Time (UTC+5:30)", offset: 5.5 },
  { value: "utc+8", label: "China Standard Time (UTC+8)", offset: 8 },
  { value: "utc+9", label: "Japan Standard Time (UTC+9)", offset: 9 },
  { value: "utc+10", label: "Australian Eastern Time (UTC+10)", offset: 10 },
  { value: "utc+12", label: "New Zealand Time (UTC+12)", offset: 12 },
]

const timezoneMap: Record<string, string> = {
  pst: "utc-8",
  mst: "utc-7",
  cst: "utc-6",
  est: "utc-5",
}

function ianaToSchedulerTz(ianaTimezone: string | null | undefined): string | null {
  if (!ianaTimezone) return null
  try {
    const now = new Date()
    const utcMs = now.getTime()
    const localMs = new Date(now.toLocaleString("en-US", { timeZone: ianaTimezone })).getTime()
    const offsetHours = (localMs - utcMs) / 3_600_000
    // Find closest scheduler timezone by offset
    let best = timeZones[0]
    let bestDiff = Math.abs(timeZones[0].offset - offsetHours)
    for (const tz of timeZones) {
      const diff = Math.abs(tz.offset - offsetHours)
      if (diff < bestDiff) { best = tz; bestDiff = diff }
    }
    return best.value
  } catch {
    return null
  }
}

const hours = Array.from({ length: 24 }, (_, i) => i)

interface CalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: string
  end: string
  attendees: { email: string; name?: string; responseStatus?: string }[]
  htmlLink: string
  status: string
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function formatEventTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <div className="p-4 border rounded-lg space-y-2 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{event.summary}</p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{formatEventDate(event.start)}</span>
            <span className="mx-1">·</span>
            <Clock className="h-3.5 w-3.5" />
            <span>{formatEventTime(event.start)} – {formatEventTime(event.end)}</span>
          </div>
        </div>
        <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
      </div>
      {event.location && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{event.location}</span>
        </div>
      )}
      {event.attendees.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{event.attendees.map(a => a.name || a.email).join(", ")}</span>
        </div>
      )}
    </div>
  )
}

function EventsList({ type }: { type: "upcoming" | "past" }) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [notConnected, setNotConnected] = useState(false)

  useEffect(() => {
    fetch(`/api/integrations/gcal/events?type=${type}`)
      .then(async (res) => {
        if (res.status === 403) {
          setNotConnected(true)
          return
        }
        const data = await res.json()
        setEvents(data.events || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [type])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <BRLoader />
      </div>
    )
  }

  if (notConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Google Calendar not connected</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Connect your Google Calendar in Settings to see your meetings here.
        </p>
        <Link href="/settings?tab=integrations">
          <Button variant="outline">Go to Settings</Button>
        </Link>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        {type === "upcoming" ? (
          <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
        ) : (
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
        )}
        <h3 className="text-lg font-medium mb-2">
          {type === "upcoming" ? "No upcoming meetings" : "No past meetings"}
        </h3>
        <p className="text-muted-foreground max-w-md">
          {type === "upcoming"
            ? "Schedule meetings with prospects and clients to see them here."
            : "Your meeting history will appear here once you've had meetings."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}

interface CreateEventDialogProps {
  open: boolean
  onClose: () => void
  prefill?: { startHour: number; startMinute?: number; participantEmails: string[]; date?: string }
  userTzOffset: number
  userTzLabel: string
  defaultDuration?: number
}

function CreateEventDialog({ open, onClose, prefill, userTzOffset, userTzLabel, defaultDuration = 30 }: CreateEventDialogProps) {
  const [summary, setSummary] = useState("Meeting")
  const [description, setDescription] = useState("")
  const [attendees, setAttendees] = useState<{ email: string; name?: string }[]>([])
  const [attendeeInput, setAttendeeInput] = useState("")
  const [suggestions, setSuggestions] = useState<{ name: string; email: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const attendeeRef = useRef<HTMLDivElement>(null)
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split("T")[0]
  })
  const [startTime, setStartTime] = useState("09:00")
  const [durationMinutes, setDurationMinutes] = useState(defaultDuration)

  useEffect(() => { setDurationMinutes(defaultDuration) }, [defaultDuration])
  const [isCreating, setIsCreating] = useState(false)
  const [templates, setTemplates] = useState<{ id: string; name: string; description: string }[]>([])
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    fetch("/api/meeting-templates")
      .then((r) => r.ok ? r.json() : [])
      .then(setTemplates)
      .catch(() => {})
  }, [])

  const computedEndTime = (() => {
    const [h, m] = startTime.split(":").map(Number)
    const total = h * 60 + m + durationMinutes
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
  })()

  useEffect(() => {
    if (prefill) {
      const h = prefill.startHour
      const m = prefill.startMinute ?? 0
      if (prefill.date) setDate(prefill.date)
      setStartTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
      setAttendees(prefill.participantEmails.map(e => ({ email: e })))
    }
  }, [prefill])

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const startDateTime = new Date(`${date}T${startTime}:00`).toISOString()
      const endDateTime = new Date(`${date}T${computedEndTime}:00`).toISOString()
      const attendeeEmails = attendees.map(a => a.email).filter(Boolean)

      const res = await fetch("/api/integrations/gcal/create-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary,
          description: description || undefined,
          startTime: startDateTime,
          endTime: endDateTime,
          attendeeEmails,
        }),
      })

      if (res.status === 403) {
        toast.error("Google Calendar not connected — go to Settings to connect it.")
        return
      }

      if (!res.ok) throw new Error("Failed to create event")

      toast.success("Meeting created in Google Calendar!")
      onClose()
    } catch (error) {
      toast.error("Failed to create meeting")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Duration</Label>
            <div className="flex gap-2">
              {[15, 30, 45, 60].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setDurationMinutes(min)}
                  className={`flex-1 py-1.5 text-sm rounded-md border transition-colors ${
                    durationMinutes === min
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-secondary text-foreground"
                  }`}
                >
                  {min}m
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Ends at {computedEndTime}</p>
          </div>
          <div className="space-y-1">
            <Label>Attendees</Label>
            <div className="relative" ref={attendeeRef}>
              <div className="flex flex-wrap gap-1.5 p-2 min-h-[40px] border rounded-md bg-background focus-within:ring-1 focus-within:ring-ring">
                {attendees.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full">
                    {a.name ? `${a.name} <${a.email}>` : a.email}
                    <button type="button" onClick={() => setAttendees(attendees.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="flex-1 min-w-[160px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                  placeholder={attendees.length === 0 ? "Name or email..." : ""}
                  value={attendeeInput}
                  onChange={async (e) => {
                    const v = e.target.value
                    setAttendeeInput(v)
                    if (v.trim().length >= 2) {
                      const res = await fetch(`/api/prospects?search=${encodeURIComponent(v)}&pageSize=5`)
                      if (res.ok) {
                        const data = await res.json()
                        const matches = (data.prospects || []).filter((p: any) => p.email)
                        setSuggestions(matches.map((p: any) => ({ name: p.name, email: p.email })))
                        setShowSuggestions(matches.length > 0)
                      }
                    } else {
                      setShowSuggestions(false)
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === ",") && attendeeInput.trim()) {
                      e.preventDefault()
                      const email = attendeeInput.trim().replace(/,$/, "")
                      if (email && !attendees.find(a => a.email === email)) {
                        setAttendees([...attendees, { email }])
                      }
                      setAttendeeInput("")
                      setShowSuggestions(false)
                    } else if (e.key === "Backspace" && !attendeeInput && attendees.length > 0) {
                      setAttendees(attendees.slice(0, -1))
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                />
              </div>
              {showSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full flex flex-col px-3 py-2 text-left text-sm hover:bg-accent"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        if (!attendees.find(a => a.email === s.email)) {
                          setAttendees([...attendees, { email: s.email, name: s.name }])
                        }
                        setAttendeeInput("")
                        setShowSuggestions(false)
                      }}
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Type a name to search prospects, or type an email and press Enter</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Description (optional)</Label>
              {templates.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTemplates((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs text-primary border border-primary/30 rounded px-2 py-0.5 hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Templates
                  </button>
                  {showTemplates && (
                    <div className="absolute right-0 z-50 mt-1 w-52 bg-popover border rounded-md shadow-md overflow-hidden">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setDescription(t.description)
                            setShowTemplates(false)
                          }}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Add agenda or notes..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isCreating || !summary || !date}>
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function SchedulerPage() {
  const [activeTab, setActiveTab] = useState("availability")
  const [participants, setParticipants] = useState([
    { id: 1, name: "You", email: "", timezone: "utc-5", workingHours: { start: 9, end: 17 }, isAvailable: true },
  ])
  const [newParticipantName, setNewParticipantName] = useState("")
  const [newParticipantEmail, setNewParticipantEmail] = useState("")
  const [newParticipantTimezone, setNewParticipantTimezone] = useState("utc")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createPrefill, setCreatePrefill] = useState<{ startHour: number; startMinute?: number; participantEmails: string[]; date?: string } | undefined>()
  const [gridDuration, setGridDuration] = useState(30)
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? 1 : day === 6 ? 2 : 1 - day + (day === 0 ? 0 : 0)
    // Start from next Monday if today is Mon-Fri, else nearest Monday
    const monday = new Date(d)
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)
    return monday
  })
  const [calendarBlocks, setCalendarBlocks] = useState<Set<string>>(new Set())
  const [participantSuggestions, setParticipantSuggestions] = useState<{ name: string; email: string; timezone?: string | null; location?: string | null }[]>([])
  const [showParticipantSuggestions, setShowParticipantSuggestions] = useState(false)
  const participantInputFocused = useRef(false)
  const participantSuggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (participantSuggestionsRef.current && !participantSuggestionsRef.current.contains(e.target as Node)) {
        setShowParticipantSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    fetch("/api/meetings/sync", { method: "POST" }).catch(() => {})
  }, [])

  useEffect(() => {
    const timeMin = weekStart.toISOString()
    const timeMax = new Date(weekStart.getTime() + 7 * 86_400_000).toISOString()
    fetch(`/api/integrations/gcal/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`)
      .then(r => r.ok ? r.json() : { events: [] })
      .then(data => {
        const blocks = new Set<string>()
        for (const event of data.events || []) {
          const start = new Date(event.start)
          const end = new Date(event.end)
          // Mark every 15-min interval this event touches
          const cur = new Date(start)
          cur.setMinutes(Math.floor(cur.getMinutes() / 15) * 15, 0, 0)
          while (cur < end) {
            const key = `${cur.toISOString().slice(0, 10)}-${cur.getHours()}-${cur.getMinutes()}`
            blocks.add(key)
            cur.setMinutes(cur.getMinutes() + 15)
          }
        }
        setCalendarBlocks(blocks)
      })
      .catch(() => {})
  }, [weekStart])

  useEffect(() => {
    fetch("/api/auth/user")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.user) {
          const tz = timezoneMap[data.user.timezone] || "utc-5"
          const start = data.user.workStartTime ? parseInt(data.user.workStartTime.split(":")[0], 10) : 9
          const end = data.user.workEndTime ? parseInt(data.user.workEndTime.split(":")[0], 10) : 17
          const name = [data.user.firstName, data.user.lastName].filter(Boolean).join(" ") || "You"
          setParticipants(prev => prev.map(p =>
            p.id === 1
              ? { ...p, name, email: data.user.email || "", timezone: tz, workingHours: { start, end } }
              : p
          ))
        }
      })
      .catch(() => {})
  }, [])

  const addParticipant = () => {
    if (newParticipantName.trim() === "") return
    setParticipants([
      ...participants,
      {
        id: Date.now(),
        name: newParticipantName,
        email: newParticipantEmail || `${newParticipantName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        timezone: newParticipantTimezone,
        workingHours: { start: 9, end: 17 },
        isAvailable: true,
      },
    ])
    setNewParticipantName("")
    setNewParticipantEmail("")
    setNewParticipantTimezone("utc")
  }

  const removeParticipant = (id: number) => setParticipants(participants.filter((p) => p.id !== id))
  const toggleAvailability = (id: number) =>
    setParticipants(participants.map((p) => (p.id === id ? { ...p, isAvailable: !p.isAvailable } : p)))
  const updateTimezone = (id: number, timezone: string) =>
    setParticipants(participants.map((p) => (p.id === id ? { ...p, timezone } : p)))

  const getTimezoneInfo = (timezoneValue: string) =>
    timeZones.find((tz) => tz.value === timezoneValue) || timeZones[0]

  const convertTime = (hour: number, fromOffset: number, toOffset: number) => {
    const utcHour = (hour - fromOffset + 24) % 24
    return (utcHour + toOffset + 24) % 24
  }

  const isWorkingHour = (participant: any, displayHour: number) => {
    const displayTz = getTimezoneInfo(participants[0]?.timezone || "utc")
    const participantTz = getTimezoneInfo(participant.timezone)
    const localHour = convertTime(displayHour, displayTz.offset, participantTz.offset)
    return localHour >= participant.workingHours.start && localHour < participant.workingHours.end && participant.isAvailable
  }

  const countAvailableParticipants = (hour: number) =>
    participants.filter((p) => isWorkingHour(p, hour)).length

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 === 0 ? 12 : hour % 12
    return `${displayHour} ${period}`
  }

  const findOptimalTimes = () => {
    const userTz = getTimezoneInfo(participants[0]?.timezone || "utc-5")
    const tzLabel = userTz.label.split(" (")[0]
    const results: { startHour: number; endHour: number; time: string; score: number }[] = []

    for (let hour = 0; hour < 24; hour++) {
      const available = participants.filter((p) => isWorkingHour(p, hour)).length
      if (available > 0) {
        const score = Math.round((available / participants.length) * 100)
        results.push({
          startHour: hour,
          endHour: (hour + 1) % 24,
          time: `${formatHour(hour)} - ${formatHour((hour + 1) % 24)} ${tzLabel}`,
          score,
        })
      }
    }

    results.sort((a, b) => b.score - a.score || a.startHour - b.startHour)
    return results.slice(0, 3)
  }

  const handleCreateFromOptimalTime = (startHour: number, startMinute: number = 0, date?: string) => {
    const participantEmails = participants.filter(p => p.email && p.id !== 1).map(p => p.email)
    setCreatePrefill({ startHour, startMinute, participantEmails, date })
    setCreateDialogOpen(true)
  }

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  // Slots from 8:00 to 18:00 at gridDuration intervals
  const gridSlots = (() => {
    const slots: { hour: number; minute: number }[] = []
    for (let m = 8 * 60; m < 18 * 60; m += gridDuration) {
      slots.push({ hour: Math.floor(m / 60), minute: m % 60 })
    }
    return slots
  })()

  // Returns true if any 15-min sub-interval of the slot is blocked
  const isSlotBlocked = (dateKey: string, slotHour: number, slotMinute: number) => {
    for (let m = 0; m < gridDuration; m += 15) {
      const total = slotHour * 60 + slotMinute + m
      const h = Math.floor(total / 60)
      const min = total % 60
      if (calendarBlocks.has(`${dateKey}-${h}-${min}`)) return true
    }
    return false
  }

  const slotHeight = gridDuration === 15 ? "h-5" : gridDuration === 30 ? "h-7" : gridDuration === 45 ? "h-9" : "h-10"

  const formatSlotLabel = (hour: number, minute: number, isFirstOfHour: boolean) => {
    if (minute === 0 || isFirstOfHour) return formatHour(hour)
    return `:${String(minute).padStart(2, "0")}`
  }

  const formatWeekDay = (d: Date) =>
    d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })

  const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n })
  const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n })

  const optimalTimes = findOptimalTimes()
  const userTzInfo = getTimezoneInfo(participants[0]?.timezone || "utc-5")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Scheduler</h1>
        <Button onClick={() => { setCreatePrefill(undefined); setCreateDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Meeting
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Meetings</TabsTrigger>
          <TabsTrigger value="past">Past Meetings</TabsTrigger>
          <TabsTrigger value="availability">Multi-Timezone Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>Pulled from your connected Google Calendar</CardDescription>
            </CardHeader>
            <CardContent>
              <EventsList type="upcoming" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Past Meetings</CardTitle>
              <CardDescription>Your recent meeting history from Google Calendar</CardDescription>
            </CardHeader>
            <CardContent>
              <EventsList type="past" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="mt-6">
          <div className="grid gap-6 md:grid-cols-[350px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Meeting Participants
                </CardTitle>
                <CardDescription>Add participants and their time zones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 pb-4 border-b">
                  <h3 className="text-sm font-medium">Add Participant</h3>
                  <div className="space-y-2">
                    <div className="relative" ref={participantSuggestionsRef}>
                      <Input
                        placeholder="Name or email"
                        value={newParticipantName}
                        onFocus={() => { participantInputFocused.current = true }}
                        onBlur={() => { participantInputFocused.current = false }}
                        onChange={async (e) => {
                          const v = e.target.value
                          setNewParticipantName(v)
                          if (v.trim().length >= 2) {
                            const res = await fetch(`/api/prospects?search=${encodeURIComponent(v)}&pageSize=6`)
                            if (res.ok && participantInputFocused.current) {
                              const data = await res.json()
                              const matches = (data.prospects || []).filter((p: any) => p.name || p.email)
                              setParticipantSuggestions(matches.map((p: any) => ({ name: p.name || "", email: p.email || "", timezone: p.timezone, location: p.location })))
                              setShowParticipantSuggestions(matches.length > 0)
                            }
                          } else {
                            setShowParticipantSuggestions(false)
                          }
                        }}
                      />
                      {showParticipantSuggestions && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md overflow-hidden">
                          {participantSuggestions.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full flex flex-col px-3 py-2 text-left text-sm hover:bg-accent"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setNewParticipantName(s.name)
                                setNewParticipantEmail(s.email)
                                const detectedTz = ianaToSchedulerTz(s.timezone) ?? ianaToSchedulerTz(getTimezoneFromLocation(s.location)) ?? "utc-5"
                                setNewParticipantTimezone(detectedTz)
                                setShowParticipantSuggestions(false)
                              }}
                            >
                              <span className="font-medium">{s.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {s.email}
                                {(s.timezone || s.location) && (() => {
                                  const tz = ianaToSchedulerTz(s.timezone) ?? ianaToSchedulerTz(getTimezoneFromLocation(s.location))
                                  const label = timeZones.find(t => t.value === tz)?.label
                                  return label ? ` · ${label}` : null
                                })()}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Input
                      placeholder="Email (optional)"
                      value={newParticipantEmail}
                      onChange={(e) => setNewParticipantEmail(e.target.value)}
                    />
                    <Select value={newParticipantTimezone} onValueChange={setNewParticipantTimezone}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeZones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addParticipant} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Participant
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Current Participants</h3>
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-start justify-between p-3 border rounded-md">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback>
                            {participant.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center">
                            {participant.name}
                            {participant.id === 1 && (
                              <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{participant.email}</div>
                          <div className="mt-1">
                            <Select
                              value={participant.timezone}
                              onValueChange={(value) => updateTimezone(participant.id, value)}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {timeZones.map((tz) => (
                                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleAvailability(participant.id)}
                          className={participant.isAvailable ? "text-green-500" : "text-muted-foreground"}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        {participant.id !== 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeParticipant(participant.id)}
                            className="text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {participants.length > 1 && optimalTimes.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="text-sm font-medium">Optimal Meeting Times</h3>
                    {optimalTimes.map((time, index) => (
                      <div key={index} className="p-3 border rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{time.time}</div>
                          <Badge
                            variant={index === 0 ? "default" : "outline"}
                            className={index === 0 ? "" : "text-muted-foreground"}
                          >
                            {time.score}% match
                          </Badge>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateFromOptimalTime(time.startHour)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Create Meeting
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Globe className="h-5 w-5 mr-2" />
                    Availability
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={prevWeek}>
                      <span className="text-xs">‹</span>
                    </Button>
                    <span className="text-sm font-normal text-muted-foreground min-w-[160px] text-center">
                      {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekDays[4].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={nextWeek}>
                      <span className="text-xs">›</span>
                    </Button>
                  </div>
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Duration:</span>
                  {[15, 30, 45, 60].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setGridDuration(min)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        gridDuration === min
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-secondary text-foreground"
                      }`}
                    >
                      {min === 60 ? "1h" : `${min}m`}
                    </button>
                  ))}
                </div>
                <CardDescription>Click any open slot to create a meeting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-[500px]">
                    {/* Header row: days */}
                    <div className="flex mb-1">
                      <div className="w-16 flex-shrink-0" />
                      {weekDays.map((day, i) => (
                        <div key={i} className="flex-1 text-center text-xs font-medium py-1 text-muted-foreground">
                          {formatWeekDay(day)}
                        </div>
                      ))}
                    </div>

                    {/* Slot rows */}
                    {gridSlots.map(({ hour, minute }, si) => {
                      const isFirstOfHour = si === 0 || gridSlots[si - 1].hour !== hour
                      return (
                        <div key={`${hour}-${minute}`} className={`flex items-stretch mb-px`}>
                          <div className={`w-16 flex-shrink-0 pr-2 flex items-center justify-end ${
                            minute === 0 ? "text-xs text-muted-foreground" : "text-[10px] text-muted-foreground/50"
                          }`}>
                            {formatSlotLabel(hour, minute, isFirstOfHour)}
                          </div>
                          {weekDays.map((day, di) => {
                            const dateKey = day.toISOString().slice(0, 10)
                            const blocked = isSlotBlocked(dateKey, hour, minute)
                            const availableCount = participants.filter(p => isWorkingHour(p, hour)).length
                            const allAvailable = availableCount === participants.length
                            const someAvailable = availableCount > 0

                            if (blocked) {
                              return (
                                <div key={di} className={`flex-1 ${slotHeight} border border-muted bg-muted/40 flex items-center justify-center mx-px rounded-sm`}>
                                  {gridDuration >= 45 && <span className="text-xs text-muted-foreground">Blocked</span>}
                                </div>
                              )
                            }

                            return (
                              <button
                                key={di}
                                type="button"
                                onClick={() => (allAvailable || someAvailable) ? handleCreateFromOptimalTime(hour, minute, dateKey) : undefined}
                                className={`flex-1 ${slotHeight} border mx-px rounded-sm flex items-center justify-center transition-colors ${
                                  allAvailable
                                    ? "bg-green-500/20 border-green-500/30 hover:bg-green-500/40 cursor-pointer"
                                    : someAvailable
                                    ? "bg-primary/15 border-primary/20 hover:bg-primary/25 cursor-pointer"
                                    : "bg-muted/20 border-transparent cursor-default"
                                }`}
                              >
                                {participants.length > 1 && someAvailable && gridDuration >= 30 && (
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {availableCount}/{participants.length}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-muted/40 border border-muted" /><span>Blocked</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-primary/15 border border-primary/20" /><span>Partial</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-500/30" /><span>Everyone free</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <CreateEventDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        prefill={createPrefill}
        userTzOffset={userTzInfo.offset}
        userTzLabel={userTzInfo.label}
        defaultDuration={gridDuration}
      />
    </div>
  )
}
