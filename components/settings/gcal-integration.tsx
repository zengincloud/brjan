"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, Loader2, ExternalLink, AlertCircle, Video, Lock } from "lucide-react"
import { toast } from "sonner"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

interface GcalStatus {
  connected: boolean
  integration: {
    email: string
    isActive: boolean
    connectedAt: string
    tokenValid: boolean
  } | null
}

export function GcalIntegration({ initialStatus, userTier }: { initialStatus?: GcalStatus; userTier?: string }) {
  const [status, setStatus] = useState<GcalStatus | null>(initialStatus ?? null)
  const [isLoading, setIsLoading] = useState(!initialStatus)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations/gcal/status")
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        return data
      }
    } catch (error) {
      console.error("Failed to fetch GCal status:", error)
    } finally {
      setIsLoading(false)
    }
    return null
  }, [])

  useEffect(() => {
    if (!initialStatus) fetchStatus()

    const params = new URLSearchParams(window.location.search)
    if (params.get("gcal_success") === "true") {
      toast.success("Google Calendar connected successfully!")
      window.history.replaceState({}, "", "/settings?tab=integrations")
      fetchStatus()
    }
    if (params.get("gcal_error")) {
      const error = params.get("gcal_error")
      const errorMessages: Record<string, string> = {
        access_denied: "You declined the Google Calendar connection request",
        missing_params: "Missing OAuth parameters",
        invalid_state: "Invalid state - please try again",
        user_mismatch: "User mismatch - please try again",
        token_error: "Failed to get tokens",
        callback_failed: "OAuth callback failed",
      }
      toast.error(errorMessages[error!] || `Google Calendar connection failed: ${error}`)
      window.history.replaceState({}, "", "/settings?tab=integrations")
    }
  }, [fetchStatus])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch("/api/integrations/gcal/connect")
      const data = await response.json()

      if (data.authUrl) {
        window.open(data.authUrl, "_blank", "noopener,noreferrer")

        const pollInterval = setInterval(async () => {
          const newStatus = await fetchStatus()
          if (newStatus?.connected) {
            clearInterval(pollInterval)
            setIsConnecting(false)
            toast.success("Google Calendar connected successfully!")
          }
        }, 2000)

        setTimeout(() => {
          clearInterval(pollInterval)
          setIsConnecting(false)
        }, 5 * 60 * 1000)

        const handleFocus = async () => {
          const newStatus = await fetchStatus()
          if (newStatus?.connected) {
            clearInterval(pollInterval)
            setIsConnecting(false)
            window.removeEventListener("focus", handleFocus)
            toast.success("Google Calendar connected successfully!")
          }
        }
        window.addEventListener("focus", handleFocus)
      } else {
        throw new Error(data.error || "No auth URL received")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to connect Google Calendar")
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const response = await fetch("/api/integrations/gcal/disconnect", { method: "POST" })
      if (!response.ok) throw new Error("Disconnect failed")
      toast.success("Google Calendar disconnected")
      setStatus({ connected: false, integration: null })
    } catch (error) {
      toast.error("Failed to disconnect Google Calendar")
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
              <GoogleIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base">Google Calendar</CardTitle>
              <CardDescription>Sync your calendar to schedule and manage meetings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const isConnected = status?.connected && status.integration?.isActive && status.integration?.tokenValid

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Google Calendar</CardTitle>
            <CardDescription>
              Sync your calendar to see meetings and create events from Boilerroom
            </CardDescription>
          </div>
          {isConnected ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-600">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-600">Not Connected</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected && status.integration ? (
          <div className="flex items-center justify-between p-4 border-2 border-green-500/30 bg-green-500/5 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white border-2 border-green-500/30 flex items-center justify-center">
                <GoogleIcon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-lg">{status.integration.email}</p>
                  {status.integration.isActive && status.integration.tokenValid ? (
                    <Badge className="bg-green-500 hover:bg-green-600">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <X className="h-3 w-3 mr-1" />
                      Reconnect Required
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Calendar events synced from this account</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleDisconnect} disabled={isDisconnecting}>
              {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 border-2 border-dashed border-yellow-500/50 bg-yellow-500/5 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white border flex items-center justify-center">
                <GoogleIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-lg">Google Calendar</p>
                <p className="text-sm text-yellow-600">Connect to sync meetings and create events</p>
              </div>
            </div>
            <Button onClick={handleConnect} disabled={isConnecting} size="lg" className="gap-2">
              {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              {isConnecting ? "Connecting..." : "Connect Calendar"}
            </Button>
          </div>
        )}

        <div className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg space-y-3">
          <div>
            <p className="font-medium text-foreground mb-1">What this enables</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>View upcoming and past meetings in the Scheduler</li>
              <li>Create calendar events with prospects directly from Boilerroom</li>
              <li>Real availability detection based on actual calendar events</li>
            </ul>
          </div>

          {userTier !== undefined && (
            <div className={`rounded-lg border p-3 ${userTier === "pro_max" ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <Video className="h-4 w-4 text-primary" />
                <p className="font-medium text-foreground text-xs">AI Meeting Notetaker</p>
                {userTier !== "pro_max" && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Pro Max
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {userTier === "pro_max"
                  ? "Active — a bot will automatically join your Google Meet, Zoom, and Teams calls and generate a transcript, summary, and action items when connected."
                  : "Upgrade to Pro Max to automatically record and transcribe every meeting from your calendar — no manual setup required."}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
