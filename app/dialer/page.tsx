"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

type ApiTask = {
  id: string
  title: string
  contact?: {
    name?: string
    email?: string
    phone?: string
  } | null
}

export default function DialerPage() {
  const searchParams = useSearchParams()
  const taskId = searchParams.get("taskId")
  const [task, setTask] = useState<ApiTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState("")
  const [notes, setNotes] = useState("")
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "completing" | "error">("idle")
  const [callMessage, setCallMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadTask = async () => {
      if (!taskId) {
        setError("Missing taskId")
        setLoading(false)
        return
      }

      try {
        const response = await fetch("/api/tasks")
        if (!response.ok) {
          throw new Error("Failed to load tasks")
        }
        const data = (await response.json()) as { tasks: ApiTask[] }
        const match = data.tasks.find((item) => item.id === taskId) ?? null
        if (isMounted) {
          if (!match) {
            setError("Task not found")
          } else {
            setTask(match)
          }
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setError("Unable to load task")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadTask()

    return () => {
      isMounted = false
    }
  }, [taskId])

  const handleStartCall = async () => {
    if (!taskId) return
    setCallStatus("calling")
    setCallMessage(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}/start-call`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to start call")
      }

      setCallStatus("idle")
      setCallMessage("Call started")
    } catch (err) {
      console.error(err)
      setCallStatus("error")
      setCallMessage("Unable to start call")
    }
  }

  const handleCompleteCall = async () => {
    if (!taskId) return
    if (!outcome.trim()) {
      setCallMessage("Please enter an outcome")
      return
    }

    setCallStatus("completing")
    setCallMessage(null)

    try {
      const response = await fetch(`/api/tasks/${taskId}/complete-call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outcome, notes }),
      })

      if (!response.ok) {
        throw new Error("Failed to complete call")
      }

      setCallStatus("idle")
      setCallMessage("Call completed")
    } catch (err) {
      console.error(err)
      setCallStatus("error")
      setCallMessage("Unable to complete call")
    }
  }

  const contact = task?.contact ?? null
  const contactName = contact?.name || "Unknown contact"
  const contactPhone = contact?.phone || "No phone on record"

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dialer</h1>
      <Card className="border-border bg-card">
        <CardContent className="p-6 space-y-6">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading task...</div>
          ) : error ? (
            <div className="text-sm text-muted-foreground">{error}</div>
          ) : (
            <>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Contact</div>
                <div className="text-lg font-medium">{contactName}</div>
                <div className="text-sm text-muted-foreground">{contactPhone}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleStartCall} disabled={callStatus === "calling"}>
                  {callStatus === "calling" ? "Calling..." : "Call"}
                </Button>
              </div>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="call-outcome">Outcome</Label>
                  <Input
                    id="call-outcome"
                    value={outcome}
                    onChange={(event) => setOutcome(event.target.value)}
                    placeholder="Connected"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="call-notes">Notes</Label>
                  <Textarea
                    id="call-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCompleteCall} disabled={callStatus === "completing"}>
                    {callStatus === "completing" ? "Completing..." : "Complete"}
                  </Button>
                </div>
                {callMessage && <div className="text-xs text-muted-foreground">{callMessage}</div>}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
