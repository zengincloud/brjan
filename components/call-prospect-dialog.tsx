"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Phone, PhoneOff, Voicemail, UserCheck, UserX, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type Prospect = {
  id: string
  name: string
  email: string
  phone?: string | null
  title?: string | null
  company?: string | null
}

type CallStatus = "idle" | "calling" | "ringing" | "in_progress" | "completed" | "failed"
type CallOutcome = "connected" | "voicemail" | "no_answer" | "busy" | "failed" | "gatekeeper"

export function CallProspectDialog({
  open,
  onOpenChange,
  prospect,
  onCallCompleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  prospect: Prospect | null
  onCallCompleted?: () => void
}) {
  const { toast } = useToast()
  const [callStatus, setCallStatus] = useState<CallStatus>("idle")
  const [callId, setCallId] = useState<string | null>(null)
  const [twilioSid, setTwilioSid] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)

  // Timer for call duration
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (callStatus === "in_progress" && startTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [callStatus, startTime])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setCallStatus("idle")
        setCallId(null)
        setTwilioSid(null)
        setNotes("")
        setSelectedOutcome(null)
        setCallDuration(0)
        setStartTime(null)
      }, 300)
    }
  }, [open])

  const makeCall = async () => {
    if (!prospect?.phone) {
      toast({
        title: "Error",
        description: "No phone number available for this prospect",
        variant: "destructive",
      })
      return
    }

    setCallStatus("calling")

    try {
      const response = await fetch("/api/calls/make", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: prospect.phone,
          prospectId: prospect.id,
          metadata: {
            prospectName: prospect.name,
            prospectCompany: prospect.company,
            prospectTitle: prospect.title,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to make call")
      }

      setCallId(data.callId)
      setTwilioSid(data.twilioSid)
      setCallStatus("ringing")
      setStartTime(Date.now())

      // Simulate call being answered after 3 seconds (in production, this would come from Twilio webhooks)
      setTimeout(() => {
        if (callStatus !== "idle") {
          setCallStatus("in_progress")
        }
      }, 3000)

      toast({
        title: "Call initiated",
        description: `Calling ${prospect.name}...`,
      })
    } catch (error: any) {
      console.error("Error making call:", error)
      setCallStatus("failed")
      toast({
        title: "Call failed",
        description: error.message || "Failed to initiate call",
        variant: "destructive",
      })
    }
  }

  const endCall = () => {
    setCallStatus("completed")
  }

  const saveOutcome = async () => {
    if (!callId || !selectedOutcome) {
      toast({
        title: "Error",
        description: "Please select a call outcome",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome: selectedOutcome,
          notes,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save call outcome")
      }

      toast({
        title: "Call saved",
        description: "Call outcome has been recorded",
      })

      onCallCompleted?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error saving outcome:", error)
      toast({
        title: "Error",
        description: "Failed to save call outcome",
        variant: "destructive",
      })
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusBadge = () => {
    switch (callStatus) {
      case "calling":
        return <Badge variant="secondary">Initiating...</Badge>
      case "ringing":
        return <Badge variant="secondary">Ringing...</Badge>
      case "in_progress":
        return <Badge className="bg-green-500">In Progress - {formatDuration(callDuration)}</Badge>
      case "completed":
        return <Badge variant="outline">Completed - {formatDuration(callDuration)}</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return null
    }
  }

  if (!prospect) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Call {prospect.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prospect Info */}
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {prospect.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold">{prospect.name}</div>
              {prospect.title && <div className="text-sm text-muted-foreground">{prospect.title}</div>}
              {prospect.company && <div className="text-sm text-muted-foreground">{prospect.company}</div>}
              <div className="text-sm font-medium mt-1">{prospect.phone || "No phone number"}</div>
            </div>
          </div>

          {/* Call Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              <span className="font-medium">Call Status</span>
            </div>
            {getStatusBadge()}
          </div>

          {/* Call Controls */}
          {callStatus === "idle" && (
            <Button onClick={makeCall} className="w-full" size="lg">
              <Phone className="mr-2 h-5 w-5" />
              Start Call
            </Button>
          )}

          {(callStatus === "calling" || callStatus === "ringing" || callStatus === "in_progress") && (
            <Button onClick={endCall} variant="destructive" className="w-full" size="lg">
              <PhoneOff className="mr-2 h-5 w-5" />
              End Call
            </Button>
          )}

          {/* Call Outcome Selection */}
          {callStatus === "completed" && !selectedOutcome && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Select Call Outcome</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={selectedOutcome === "connected" ? "default" : "outline"}
                  onClick={() => setSelectedOutcome("connected")}
                  className="justify-start"
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Connected
                </Button>
                <Button
                  variant={selectedOutcome === "voicemail" ? "default" : "outline"}
                  onClick={() => setSelectedOutcome("voicemail")}
                  className="justify-start"
                >
                  <Voicemail className="mr-2 h-4 w-4" />
                  Voicemail
                </Button>
                <Button
                  variant={selectedOutcome === "no_answer" ? "default" : "outline"}
                  onClick={() => setSelectedOutcome("no_answer")}
                  className="justify-start"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  No Answer
                </Button>
                <Button
                  variant={selectedOutcome === "busy" ? "default" : "outline"}
                  onClick={() => setSelectedOutcome("busy")}
                  className="justify-start"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Busy
                </Button>
                <Button
                  variant={selectedOutcome === "gatekeeper" ? "default" : "outline"}
                  onClick={() => setSelectedOutcome("gatekeeper")}
                  className="justify-start"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Gatekeeper
                </Button>
                <Button
                  variant={selectedOutcome === "failed" ? "default" : "outline"}
                  onClick={() => setSelectedOutcome("failed")}
                  className="justify-start"
                >
                  <PhoneOff className="mr-2 h-4 w-4" />
                  Failed
                </Button>
              </div>
            </div>
          )}

          {/* Notes */}
          {(callStatus === "completed" || callStatus === "in_progress") && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Call Notes</label>
              <Textarea
                placeholder="Add notes about this call..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {callStatus === "completed" && selectedOutcome && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={saveOutcome}>Save Outcome</Button>
          </DialogFooter>
        )}

        {callStatus === "failed" && (
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
