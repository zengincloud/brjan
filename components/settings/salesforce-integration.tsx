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
import { Check, Loader2, AlertCircle, ExternalLink, X, Download, RefreshCw } from "lucide-react"
import { toast } from "sonner"

function SalesforceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M10.07 4.5a3.93 3.93 0 0 1 2.93 1.3 4.6 4.6 0 0 1 2.93-1.05 4.63 4.63 0 0 1 4.37 6.17 3.25 3.25 0 0 1-.52 6.45H5.25a3.75 3.75 0 0 1-.46-7.47A3.94 3.94 0 0 1 10.07 4.5z"
        fill="#00A1E0"
      />
    </svg>
  )
}

interface SalesforceStatus {
  connected: boolean
  integration: {
    orgId: string
    instanceUrl: string
    isActive: boolean
    connectedAt: string
    tokenValid: boolean
  } | null
}

export function SalesforceIntegration() {
  const [status, setStatus] = useState<SalesforceStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/salesforce/status")
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
        return data
      }
    } catch (error) {
      console.error("Failed to fetch Salesforce status:", error)
    } finally {
      setIsLoading(false)
    }
    return null
  }, [])

  useEffect(() => {
    fetchStatus()

    const params = new URLSearchParams(window.location.search)
    if (params.get("salesforce_success") === "true") {
      toast.success("Salesforce connected successfully!")
      window.history.replaceState({}, "", "/settings?tab=integrations")
      fetchStatus()
    }
    if (params.get("salesforce_error")) {
      const error = params.get("salesforce_error")
      const errorMessages: Record<string, string> = {
        access_denied: "You declined the Salesforce connection request",
        missing_params: "Missing OAuth parameters",
        invalid_state: "Invalid state — please try again",
        user_mismatch: "User mismatch — please try again",
        token_error: "Failed to get Salesforce tokens",
        callback_failed: "OAuth callback failed",
      }
      toast.error(errorMessages[error!] || `Salesforce connection failed: ${error}`)
      window.history.replaceState({}, "", "/settings?tab=integrations")
    }
  }, [fetchStatus])

  const handleConnect = async () => {
    setIsConnecting(true)
    // Open the popup immediately in the click handler before any async work
    // so the browser doesn't treat it as a blocked popup
    const popup = window.open("about:blank", "_blank", "noopener,noreferrer")
    try {
      const res = await fetch("/api/integrations/salesforce/connect")
      const data = await res.json()

      if (data.authUrl) {
        if (popup) {
          popup.location.href = data.authUrl
        } else {
          window.open(data.authUrl, "_blank", "noopener,noreferrer")
        }

        const pollInterval = setInterval(async () => {
          const newStatus = await fetchStatus()
          if (newStatus?.connected) {
            clearInterval(pollInterval)
            setIsConnecting(false)
            toast.success("Salesforce connected successfully!")
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
            toast.success("Salesforce connected successfully!")
          }
        }
        window.addEventListener("focus", handleFocus)
      } else {
        popup?.close()
        throw new Error(data.error || "No auth URL received")
      }
    } catch (error: any) {
      popup?.close()
      console.error("Failed to initiate Salesforce connection:", error)
      toast.error(error.message || "Failed to connect Salesforce")
      setIsConnecting(false)
    }
  }

  const handleImportLeads = async () => {
    setIsImporting(true)
    try {
      const res = await fetch("/api/integrations/salesforce/import-leads", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Import failed")
      toast.success(`Imported ${data.imported} lead${data.imported !== 1 ? "s" : ""} from Salesforce${data.skipped ? ` (${data.skipped} already existed)` : ""}`)
    } catch (error: any) {
      toast.error(error.message || "Failed to import Salesforce leads")
    } finally {
      setIsImporting(false)
    }
  }

  const handleSyncAll = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch("/api/integrations/salesforce/sync", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Sync failed")
      const { results } = data
      console.log("SF sync results:", JSON.stringify(results, null, 2))
      const total = results.prospects.synced + results.accounts.synced + results.calls.synced + results.emails.synced
      const failures = results.accounts.failed + results.prospects.failed + results.calls.failed + results.emails.failed
      toast.success(
        total > 0
          ? `Synced ${results.accounts.synced} accounts, ${results.prospects.synced} contacts, ${results.calls.synced} calls, ${results.emails.synced} emails${failures > 0 ? ` (${failures} failed)` : ""} — click again if more remain`
          : "Everything is already synced"
      )
    } catch (error: any) {
      toast.error(error.message || "Failed to sync to Salesforce")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const res = await fetch("/api/integrations/salesforce/disconnect", {
        method: "POST",
      })
      if (!res.ok) throw new Error("Disconnect failed")
      toast.success("Salesforce disconnected successfully")
      setStatus({ connected: false, integration: null })
    } catch (error) {
      console.error("Failed to disconnect Salesforce:", error)
      toast.error("Failed to disconnect Salesforce")
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
              <SalesforceIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base">Salesforce</CardTitle>
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

  const isConnected =
    status?.connected &&
    status.integration?.isActive &&
    status.integration?.tokenValid

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
              <SalesforceIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base">Salesforce</CardTitle>
              <CardDescription>Sync accounts, contacts, calls, and emails to your Salesforce org in real time</CardDescription>
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
          <div className="flex items-center justify-between p-3 border border-green-500/30 bg-green-500/5 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-green-500/30 flex items-center justify-center">
                <SalesforceIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  Org: <span className="font-mono">{status.integration.orgId}</span>
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                  {status.integration.instanceUrl}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAll}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                {isSyncing ? "Syncing..." : "Sync All"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportLeads}
                disabled={isImporting}
              >
                {isImporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                )}
                {isImporting ? "Importing..." : "Import Leads"}
              </Button>
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
          </div>
        ) : status?.connected && status.integration && !status.integration.tokenValid ? (
          <div className="flex items-center justify-between p-3 border border-yellow-500/30 bg-yellow-500/5 rounded-lg">
            <div>
              <p className="font-medium text-yellow-600">Reconnection required</p>
              <p className="text-sm text-muted-foreground">
                Your Salesforce token has expired. Please reconnect.
              </p>
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
                <SalesforceIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Connect Salesforce</p>
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
