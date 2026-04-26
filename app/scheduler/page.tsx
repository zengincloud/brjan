"use client"

import { useState, useEffect } from "react"
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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
  prefill?: { startHour: number; participantEmails: string[] }
  userTzOffset: number
  userTzLabel: string
}

function CreateEventDialog({ open, onClose, prefill, userTzOffset, userTzLabel }: CreateEventDialogProps) {
  const [summary, setSummary] = useState("Meeting")
  const [description, setDescription] = useState("")
  const [attendees, setAttendees] = useState("")
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split("T")[0]
  })
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:00")
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (prefill) {
      const h = prefill.startHour
      setStartTime(`${String(h).padStart(2, "0")}:00`)
      setEndTime(`${String((h + 1) % 24).padStart(2, "0")}:00`)
      setAttendees(prefill.participantEmails.join(", "))
    }
  }, [prefill])

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const startDateTime = new Date(`${date}T${startTime}:00`).toISOString()
      const endDateTime = new Date(`${date}T${endTime}:00`).toISOString()
      const attendeeEmails = attendees
        .split(/[,\n]/)
        .map((e) => e.trim())
        .filter(Boolean)

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
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 space-y-1">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Start</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Attendees (comma separated emails)</Label>
            <Textarea
              placeholder="prospect@company.com, colleague@yourco.com"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
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
  const [createPrefill, setCreatePrefill] = useState<{ startHour: number; participantEmails: string[] } | undefined>()

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

  const handleCreateFromOptimalTime = (startHour: number) => {
    const participantEmails = participants.filter(p => p.email && p.id !== 1).map(p => p.email)
    setCreatePrefill({ startHour, participantEmails })
    setCreateDialogOpen(true)
  }

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
                    <Input
                      placeholder="Name"
                      value={newParticipantName}
                      onChange={(e) => setNewParticipantName(e.target.value)}
                    />
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
                    Availability Across Time Zones
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Info className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          This grid shows when participants are available based on their local working hours.
                          Darker colors indicate more participants are available at that time.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <CardDescription>Find times when all participants are available</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="flex border-b mb-2">
                      <div className="w-24 flex-shrink-0"></div>
                      {hours.map((hour) => (
                        <div key={hour} className="flex-1 text-center text-xs py-1">
                          {formatHour(hour)}
                        </div>
                      ))}
                    </div>

                    {participants.map((participant) => {
                      const tz = getTimezoneInfo(participant.timezone)
                      return (
                        <div key={participant.id} className="flex items-center mb-2">
                          <div className="w-24 flex-shrink-0 text-xs truncate pr-2">
                            {participant.name}
                            <div className="text-xs text-muted-foreground">{tz.label.split(" ")[0]}</div>
                          </div>
                          {hours.map((hour) => {
                            const isWorking = isWorkingHour(participant, hour)
                            return (
                              <div
                                key={hour}
                                className={`flex-1 h-8 border-r ${isWorking ? "bg-primary/30" : "bg-muted/20"}`}
                              />
                            )
                          })}
                        </div>
                      )
                    })}

                    {participants.length > 1 && (
                      <div className="flex items-center mt-4 pt-4 border-t">
                        <div className="w-24 flex-shrink-0 text-xs font-medium">Overlap</div>
                        {hours.map((hour) => {
                          const availableCount = countAvailableParticipants(hour)
                          return (
                            <div
                              key={hour}
                              className={`flex-1 h-8 border-r flex items-center justify-center ${
                                availableCount === participants.length
                                  ? "bg-green-500/30"
                                  : availableCount > 0
                                    ? "bg-primary/30"
                                    : "bg-muted/20"
                              }`}
                            >
                              {availableCount > 0 && (
                                <span className="text-xs font-medium">
                                  {availableCount}/{participants.length}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-muted/20" />
                    <span>Unavailable</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-primary/30" />
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500/30" />
                    <span>Everyone Available</span>
                  </div>
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
      />
    </div>
  )
}
