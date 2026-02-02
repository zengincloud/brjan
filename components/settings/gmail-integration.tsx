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
import { Check, X, Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"

// Google icon component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

interface GmailStatus {
  connected: boolean
  integration: {
    email: string
    isActive: boolean
    connectedAt: string
    tokenValid: boolean
  } | null
}

export function GmailIntegration() {
  const [status, setStatus] = useState<GmailStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations/gmail/status")
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        return data
      }
    } catch (error) {
      console.error("Failed to fetch Gmail status:", error)
    } finally {
      setIsLoading(false)
    }
    return null
  }, [])

  useEffect(() => {
    fetchStatus()

    // Check for success/error from OAuth callback
    const params = new URLSearchParams(window.location.search)
    if (params.get("gmail_success") === "true") {
      toast.success("Gmail connected successfully!")
      // Clean URL
      window.history.replaceState({}, "", "/settings?tab=integrations")
      // Refresh status
      fetchStatus()
    }
    if (params.get("gmail_error")) {
      const error = params.get("gmail_error")
      const errorMessages: Record<string, string> = {
        access_denied: "You declined the Gmail connection request",
        missing_params: "Missing OAuth parameters",
        invalid_state: "Invalid state - please try again",
        user_mismatch: "User mismatch - please try again",
        token_error: "Failed to get Gmail tokens",
        callback_failed: "OAuth callback failed",
      }
      toast.error(errorMessages[error!] || `Gmail connection failed: ${error}`)
      window.history.replaceState({}, "", "/settings?tab=integrations")
    }
  }, [fetchStatus])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch("/api/integrations/gmail/connect")
      const data = await response.json()

      if (data.authUrl) {
        // Open Google OAuth in a new tab
        const authWindow = window.open(data.authUrl, "_blank", "noopener,noreferrer")

        // Poll for connection status while window is open
        const pollInterval = setInterval(async () => {
          const newStatus = await fetchStatus()
          if (newStatus?.connected) {
            clearInterval(pollInterval)
            setIsConnecting(false)
            toast.success("Gmail connected successfully!")
          }
        }, 2000)

        // Stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval)
          setIsConnecting(false)
        }, 5 * 60 * 1000)

        // Also listen for window focus to check status
        const handleFocus = async () => {
          const newStatus = await fetchStatus()
          if (newStatus?.connected) {
            clearInterval(pollInterval)
            setIsConnecting(false)
            window.removeEventListener("focus", handleFocus)
            toast.success("Gmail connected successfully!")
          }
        }
        window.addEventListener("focus", handleFocus)
      } else {
        throw new Error(data.error || "No auth URL received")
      }
    } catch (error: any) {
      console.error("Failed to initiate Gmail connection:", error)
      toast.error(error.message || "Failed to connect Gmail")
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const response = await fetch("/api/integrations/gmail/disconnect", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Disconnect failed")
      }

      toast.success("Gmail disconnected successfully")
      setStatus({ connected: false, integration: null })
    } catch (error) {
      console.error("Failed to disconnect Gmail:", error)
      toast.error("Failed to disconnect Gmail")
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Integration</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Integration</CardTitle>
        <CardDescription>
          Connect your Gmail to send emails from your own inbox
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected && status.integration ? (
          <div className="flex items-center justify-between p-4 border border-primary/30 bg-primary/5 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center">
                <GoogleIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{status.integration.email}</p>
                  {status.integration.isActive && status.integration.tokenValid ? (
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-600"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-yellow-600 border-yellow-600"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Reconnect Required
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Connected on{" "}
                  {new Date(status.integration.connectedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center">
                <GoogleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Google Gmail</p>
                <p className="text-xs text-muted-foreground">
                  Send emails from your Gmail account
                </p>
              </div>
            </div>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="gap-2"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {isConnecting ? "Connecting..." : "Connect"}
            </Button>
          </div>
        )}

        <div className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg">
          <p className="font-medium mb-1">Why connect Gmail?</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Emails appear from your address, not a shared domain</li>
            <li>Better deliverability and inbox placement</li>
            <li>Recipients can reply directly to you</li>
            <li>Build trust with personalized sender identity</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
