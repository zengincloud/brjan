"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarClock, Clock, Plus, X, Globe, Users, Check, Info, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Sample time zones
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

// Map settings timezone keys to scheduler timezone values
const timezoneMap: Record<string, string> = {
  pst: "utc-8",
  mst: "utc-7",
  cst: "utc-6",
  est: "utc-5",
}

// Generate hours for the time grid
const hours = Array.from({ length: 24 }, (_, i) => i)

export default function SchedulerPage() {
  const [activeTab, setActiveTab] = useState("availability")
  const [participants, setParticipants] = useState([
    {
      id: 1,
      name: "You",
      email: "",
      timezone: "utc-5",
      workingHours: { start: 9, end: 17 },
      isAvailable: true,
    },
  ])

  // Fetch user's saved working hours from settings
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
  const [newParticipantName, setNewParticipantName] = useState("")
  const [newParticipantEmail, setNewParticipantEmail] = useState("")
  const [newParticipantTimezone, setNewParticipantTimezone] = useState("utc")

  // Function to add a new participant
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

    // Reset form
    setNewParticipantName("")
    setNewParticipantEmail("")
    setNewParticipantTimezone("utc")
  }

  // Function to remove a participant
  const removeParticipant = (id: number) => {
    setParticipants(participants.filter((p) => p.id !== id))
  }

  // Function to toggle participant availability
  const toggleAvailability = (id: number) => {
    setParticipants(participants.map((p) => (p.id === id ? { ...p, isAvailable: !p.isAvailable } : p)))
  }

  // Function to update participant timezone
  const updateTimezone = (id: number, timezone: string) => {
    setParticipants(participants.map((p) => (p.id === id ? { ...p, timezone } : p)))
  }

  // Get timezone info for a participant
  const getTimezoneInfo = (timezoneValue: string) => {
    return timeZones.find((tz) => tz.value === timezoneValue) || timeZones[0]
  }

  // Convert local display hour to a participant's local hour
  // The grid displays hours in the first participant's local time
  // To check another participant's working hours, convert from display timezone to their timezone
  const convertTime = (hour: number, fromOffset: number, toOffset: number) => {
    // Convert display hour to UTC, then to target timezone
    const utcHour = (hour - fromOffset + 24) % 24
    const targetHour = (utcHour + toOffset + 24) % 24
    return targetHour
  }

  // Check if an hour (in display/local time) is within working hours for a participant
  const isWorkingHour = (participant: any, displayHour: number) => {
    const displayTz = getTimezoneInfo(participants[0]?.timezone || "utc")
    const participantTz = getTimezoneInfo(participant.timezone)
    const localHour = convertTime(displayHour, displayTz.offset, participantTz.offset)
    return (
      localHour >= participant.workingHours.start && localHour < participant.workingHours.end && participant.isAvailable
    )
  }

  // Count how many participants are available at a given hour
  const countAvailableParticipants = (hour: number) => {
    return participants.filter((p) => isWorkingHour(p, hour)).length
  }

  // Format hour for display
  const formatHour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 === 0 ? 12 : hour % 12
    return `${displayHour} ${period}`
  }

  // Find optimal meeting times based on actual participant overlap
  const findOptimalTimes = () => {
    const userTz = getTimezoneInfo(participants[0]?.timezone || "utc-5")
    const tzLabel = userTz.label.split(" (")[0] // e.g. "Eastern Time"
    const results: { startHour: number; endHour: number; time: string; score: number }[] = []

    for (let hour = 0; hour < 24; hour++) {
      const available = participants.filter((p) => isWorkingHour(p, hour)).length
      if (available > 0) {
        const score = Math.round((available / participants.length) * 100)
        const startLabel = formatHour(hour)
        const endLabel = formatHour((hour + 1) % 24)
        results.push({
          startHour: hour,
          endHour: (hour + 1) % 24,
          time: `${startLabel} - ${endLabel} ${tzLabel}`,
          score,
        })
      }
    }

    // Sort by score descending, then by earlier hour
    results.sort((a, b) => b.score - a.score || a.startHour - b.startHour)
    return results.slice(0, 3)
  }

  // Build a Google Calendar URL for a given time slot
  const buildGoogleCalendarUrl = (startHour: number) => {
    const userTz = getTimezoneInfo(participants[0]?.timezone || "utc-5")
    // Use tomorrow's date as default
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yyyy = tomorrow.getFullYear()
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0")
    const dd = String(tomorrow.getDate()).padStart(2, "0")

    // Convert local display hour to UTC for the calendar link
    const utcStart = ((startHour - userTz.offset + 24) % 24)
    const utcEnd = ((startHour + 1 - userTz.offset + 24) % 24)

    const startStr = `${yyyy}${mm}${dd}T${String(Math.floor(utcStart)).padStart(2, "0")}${String(Math.round((utcStart % 1) * 60)).padStart(2, "0")}00Z`
    const endStr = `${yyyy}${mm}${dd}T${String(Math.floor(utcEnd)).padStart(2, "0")}${String(Math.round((utcEnd % 1) * 60)).padStart(2, "0")}00Z`

    const participantEmails = participants.filter(p => p.email).map(p => p.email).join(",")
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: "Meeting",
      dates: `${startStr}/${endStr}`,
      details: "Scheduled via Brjan",
    })
    if (participantEmails) params.set("add", participantEmails)

    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  const optimalTimes = findOptimalTimes()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Scheduler</h1>
        <Button>
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
              <CardDescription>View and manage your scheduled meetings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No upcoming meetings</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  Schedule meetings with prospects and clients to see them here.
                </p>
                <Button>Create Meeting</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="past" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Past Meetings</CardTitle>
              <CardDescription>Review your previous meetings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No past meetings</h3>
                <p className="text-muted-foreground max-w-md">
                  Your meeting history will appear here once you've had meetings.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="availability" className="mt-6">
          <div className="grid gap-6 md:grid-cols-[350px_1fr]">
            {/* Left side - Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Meeting Participants
                </CardTitle>
                <CardDescription>Add participants and their time zones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add new participant form */}
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
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addParticipant} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Participant
                    </Button>
                  </div>
                </div>

                {/* Participant list */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Current Participants</h3>
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-start justify-between p-3 border rounded-md">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`/placeholder.svg`} />
                          <AvatarFallback>
                            {participant.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center">
                            {participant.name}
                            {participant.id === 1 && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                You
                              </Badge>
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
                                  <SelectItem key={tz.value} value={tz.value}>
                                    {tz.label}
                                  </SelectItem>
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

                {/* Optimal meeting times */}
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
                        <div className="mt-2 flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(buildGoogleCalendarUrl(time.startHour), "_blank")}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open in Google Calendar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right side - Availability grid */}
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
                          This grid shows when participants are available based on their local working hours. Darker
                          colors indicate more participants are available at that time.
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
                    {/* Time grid header - local hours */}
                    <div className="flex border-b mb-2">
                      <div className="w-24 flex-shrink-0"></div>
                      {hours.map((hour) => (
                        <div key={hour} className="flex-1 text-center text-xs py-1">
                          {formatHour(hour)}
                        </div>
                      ))}
                    </div>

                    {/* Time grid rows - one per participant */}
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
                              ></div>
                            )
                          })}
                        </div>
                      )
                    })}

                    {/* Overlap indicator row */}
                    {participants.length > 1 && (
                      <div className="flex items-center mt-4 pt-4 border-t">
                        <div className="w-24 flex-shrink-0 text-xs font-medium">Overlap</div>
                        {hours.map((hour) => {
                          const availableCount = countAvailableParticipants(hour)
                          const percentage = (availableCount / participants.length) * 100

                          return (
                            <div
                              key={hour}
                              className={`flex-1 h-8 border-r flex items-center justify-center ${
                                availableCount === participants.length
                                  ? "bg-green-500/30"
                                  : availableCount > 0
                                    ? `bg-primary/30`
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

                {/* Legend */}
                <div className="flex items-center justify-end gap-4 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-muted/20"></div>
                    <span>Unavailable</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-primary/30"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500/30"></div>
                    <span>Everyone Available</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
