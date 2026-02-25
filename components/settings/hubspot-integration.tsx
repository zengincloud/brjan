"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2, AlertCircle, RefreshCw, ExternalLink, X } from "lucide-react"
import { toast } from "sonner"

function HubSpotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M17.83 9.6V7.2a2.08 2.08 0 0 0 1.2-1.88 2.1 2.1 0 1 0-4.2 0c0 .82.48 1.52 1.17 1.87V9.6a5.07 5.07 0 0 0-2.53 1.15L7.14 6.26a2.32 2.32 0 0 0 .1-.63A2.26 2.26 0 1 0 5 7.87c.5 0 .96-.17 1.33-.45l6.27 4.38a5.08 5.08 0 0 0-.02 7.44l-1.88 1.88a1.68 1.68 0 0 0-.48-.08 1.7 1.7 0 1 0 1.7 1.7 1.68 1.68 0 0 0-.08-.48l1.86-1.86a5.1 5.1 0 1 0 4.93-10.8zm-.93 7.67a2.83 2.83 0 1 1 0-5.66 2.83 2.83 0 0 1 0 5.66z"
        fill="#FF7A59"
      />
    </svg>
  )
}

interface HubspotStatus {
  connected: boolean
  integration: {
    portalId: number
    isActive: boolean
    connectedAt: string
    tokenValid: boolean
  } | null
}

export function HubspotIntegration() {
  const [status, setStatus] = useState<HubspotStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/hubspot/status")
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
        return data
      }
    } catch (error) {
      console.error("Failed to fetch HubSpot status:", error)
    } finally {
      setIsLoading(false)
    }
    return null
  }, [])

  useEffect(() => {
    fetchStatus()

    // Check for success/error from OAuth callback
    const params = new URLSearchParams(window.location.search)
    if (params.get("hubspot_success") === "true") {
      toast.success("HubSpot connected successfully!")
      window.history.replaceState({}, "", "/settings?tab=integrations")
      fetchStatus()
    }
    if (params.get("hubspot_error")) {
      const error = params.get("hubspot_error")
      const errorMessages: Record<string, string> = {
        access_denied: "You declined the HubSpot connection request",
        missing_params: "Missing OAuth parameters",
        invalid_state: "Invalid state - please try again",
        user_mismatch: "User mismatch - please try again",
        token_error: "Failed to get HubSpot tokens",
        callback_failed: "OAuth callback failed",
      }
      toast.error(errorMessages[error!] || `HubSpot connection failed: ${error}`)
      window.history.replaceState({}, "", "/settings?tab=integrations")
    }
  }, [fetchStatus])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const res = await fetch("/api/integrations/hubspot/connect")
      const data = await res.json()

      if (data.authUrl) {
        window.open(data.authUrl, "_blank", "noopener,noreferrer")

        // Poll for connection status
        const pollInterval = setInterval(async () => {
          const newStatus = await fetchStatus()
          if (newStatus?.connected) {
            clearInterval(pollInterval)
            setIsConnecting(false)
            toast.success("HubSpot connected successfully!")
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
            toast.success("HubSpot connected successfully!")
          }
        }
        window.addEventListener("focus", handleFocus)
      } else {
        throw new Error(data.error || "No auth URL received")
      }
    } catch (error: any) {
      console.error("Failed to initiate HubSpot connection:", error)
      toast.error(error.message || "Failed to connect HubSpot")
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const res = await fetch("/api/integrations/hubspot/disconnect", {
        method: "POST",
      })

      if (!res.ok) throw new Error("Disconnect failed")

      toast.success("HubSpot disconnected successfully")
      setStatus({ connected: false, integration: null })
    } catch (error) {
      console.error("Failed to disconnect HubSpot:", error)
      toast.error("Failed to disconnect HubSpot")
    } finally {
      setIsDisconnecting(false)
    }
  }

  const syncAll = async () => {
    try {
      setSyncing(true)
      const res = await fetch("/api/integrations/hubspot/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncAll: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const parts = []
      if (data.contacts?.synced) parts.push(`${data.contacts.synced} contact${data.contacts.synced !== 1 ? "s" : ""}`)
      if (data.companies?.synced) parts.push(`${data.companies.synced} compan${data.companies.synced !== 1 ? "ies" : "y"}`)
      if (data.calls?.synced) parts.push(`${data.calls.synced} call${data.calls.synced !== 1 ? "s" : ""}`)
      const failedTotal = (data.contacts?.failed || 0) + (data.companies?.failed || 0) + (data.calls?.failed || 0)
      toast.success(`Synced ${parts.join(", ")} to HubSpot${failedTotal > 0 ? ` (${failedTotal} failed)` : ""}`)
    } catch (err: any) {
      toast.error(err.message || "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
              <HubSpotIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base">HubSpot CRM</CardTitle>
              <CardDescription>Loading...</CardDescription>
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
              <HubSpotIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base">HubSpot CRM</CardTitle>
              <CardDescription>Auto-sync prospects and call activities</CardDescription>
            </div>
          </div>
          {isConnected ? (
            <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
              <Check className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Not Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isConnected && status.integration ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-green-500/30 bg-green-500/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border-2 border-green-500/30 flex items-center justify-center">
                  <HubSpotIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Portal ID: <span className="font-mono">{status.integration.portalId}</span></p>
                  <p className="text-sm text-muted-foreground">Prospects and calls auto-sync to HubSpot</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <X className="h-3.5 w-3.5 mr-1.5" />
                )}
                Disconnect
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={syncAll} disabled={syncing}>
                {syncing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Sync All
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : status?.connected && status.integration && !status.integration.tokenValid ? (
          <div className="flex items-center justify-between p-3 border border-yellow-500/30 bg-yellow-500/5 rounded-lg">
            <div>
              <p className="font-medium text-yellow-600">Reconnection required</p>
              <p className="text-sm text-muted-foreground">Your HubSpot token has expired. Please reconnect.</p>
            </div>
            <Button onClick={handleConnect} disabled={isConnecting} size="sm">
              {isConnecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              )}
              {isConnecting ? "Connecting..." : "Reconnect"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center">
                <HubSpotIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Connect HubSpot</p>
                <p className="text-sm text-muted-foreground">
                  Sync prospects and call outcomes to your CRM
                </p>
              </div>
            </div>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              size="sm"
              className="gap-1.5"
            >
              {isConnecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              {isConnecting ? "Connecting..." : "Connect"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
