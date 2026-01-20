"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarClock, Clock, Plus, X, Globe, Users, Check, Info } from "lucide-react"
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

// Sample working hours (9 AM to 5 PM)
const defaultWorkingHours = {
  start: 9,
  end: 17,
}

// Generate hours for the time grid
const hours = Array.from({ length: 24 }, (_, i) => i)

export default function SchedulerPage() {
  const [activeTab, setActiveTab] = useState("availability")
  const [participants, setParticipants] = useState([
    {
      id: 1,
      name: "You",
      email: "you@company.com",
      timezone: "utc-5",
      workingHours: { ...defaultWorkingHours },
      isAvailable: true,
    },
  ])
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
        workingHours: { ...defaultWorkingHours },
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

  // Find optimal meeting times
  const findOptimalTimes = () => {
    // This would be a more complex algorithm in a real app
    // For now, we'll just return a sample time
    return [
      { time: "10:00 AM - 11:00 AM EST", score: 100 },
      { time: "2:00 PM - 3:00 PM EST", score: 80 },
      { time: "4:00 PM - 5:00 PM EST", score: 60 },
    ]
  }

  const optimalTimes = findOptimalTimes()

  // Get timezone info for a participant
  const getTimezoneInfo = (timezoneValue: string) => {
    return timeZones.find((tz) => tz.value === timezoneValue) || timeZones[0]
  }

  // Convert a time from UTC to a specific timezone
  const convertTime = (hour: number, timezoneOffset: number) => {
    const convertedHour = (hour + timezoneOffset + 24) % 24
    return convertedHour
  }

  // Check if an hour is within working hours for a participant
  const isWorkingHour = (participant: any, hour: number) => {
    const tz = getTimezoneInfo(participant.timezone)
    const localHour = convertTime(hour, tz.offset)
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
                {participants.length > 1 && (
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
                        {index === 0 && (
                          <div className="mt-2 flex justify-end">
                            <Button size="sm">Schedule This Time</Button>
                          </div>
                        )}
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
                    {/* Time grid header - UTC hours */}
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
