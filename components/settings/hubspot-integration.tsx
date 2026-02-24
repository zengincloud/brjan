"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2, AlertCircle, RefreshCw } from "lucide-react"
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

export function HubspotIntegration() {
  const [status, setStatus] = useState<{ connected: boolean; portalId?: number; error?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/integrations/hubspot/status")
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ connected: false, error: "Failed to check status" })
    } finally {
      setLoading(false)
    }
  }

  const syncAllProspects = async () => {
    try {
      setSyncing(true)
      const res = await fetch("/api/integrations/hubspot/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncAll: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Synced ${data.synced} prospect${data.synced !== 1 ? "s" : ""} to HubSpot${data.failed > 0 ? ` (${data.failed} failed)` : ""}`)
    } catch (err: any) {
      toast.error(err.message || "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

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
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : status?.connected ? (
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
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking connection...
          </div>
        ) : status?.connected ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Portal ID: <span className="font-mono text-foreground">{status.portalId}</span></p>
              <p>New prospects and call outcomes are automatically pushed to HubSpot.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={syncAllProspects} disabled={syncing}>
                {syncing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Sync All Prospects
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {status?.error || "HubSpot is not connected. Add your HubSpot Private App access token to the environment variables to enable sync."}
            </p>
            <Button variant="outline" size="sm" onClick={checkStatus}>
              Retry Connection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
