"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Mail, Phone, Loader2, MessageSquare } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type CorrespondenceItem = {
  id: string
  type: "email" | "call"
  date: string
  subject?: string
  outcome?: string
  notes?: string
  from?: string
  status?: string
}

type CorrespondenceSummaryProps = {
  prospectId: string
  prospectName: string
}

export function CorrespondenceSummary({ prospectId, prospectName }: CorrespondenceSummaryProps) {
  const [loading, setLoading] = useState(true)
  const [emails, setEmails] = useState<any[]>([])
  const [calls, setCalls] = useState<any[]>([])
  const [summary, setSummary] = useState<string>("")
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadCorrespondence()
  }, [prospectId])

  const loadCorrespondence = async () => {
    setLoading(true)
    try {
      // Load emails and calls in parallel
      const [emailsRes, callsRes] = await Promise.all([
        fetch(`/api/emails?prospectId=${prospectId}`).catch(() => null),
        fetch(`/api/calls?prospectId=${prospectId}`).catch(() => null),
      ])

      const emailsData = emailsRes?.ok ? await emailsRes.json() : { emails: [] }
      const callsData = callsRes?.ok ? await callsRes.json() : { calls: [] }

      setEmails(emailsData.emails || [])
      setCalls(callsData.calls || [])

      // Generate summary based on correspondence
      generateSummary(emailsData.emails || [], callsData.calls || [])
    } catch (error) {
      console.error("Failed to load correspondence:", error)
      setSummary("Unable to load correspondence history.")
    } finally {
      setLoading(false)
    }
  }

  const generateSummary = (emailList: any[], callList: any[]) => {
    setGenerating(true)

    const totalEmails = emailList.length
    const totalCalls = callList.length
    const totalCorrespondence = totalEmails + totalCalls

    if (totalCorrespondence === 0) {
      setSummary("No prior contact correspondence with this prospect.")
      setGenerating(false)
      return
    }

    // Build summary based on available data
    const parts: string[] = []

    // Email summary
    if (totalEmails > 0) {
      const sentEmails = emailList.filter((e) => e.status === "sent")
      const recentEmail = emailList[0]
      parts.push(
        `${totalEmails} email${totalEmails > 1 ? "s" : ""} sent${
          recentEmail ? `, most recent ${formatDistanceToNow(new Date(recentEmail.sentAt || recentEmail.createdAt), { addSuffix: true })}` : ""
        }`
      )
    }

    // Call summary
    if (totalCalls > 0) {
      const connectedCalls = callList.filter((c) => c.outcome === "connected")
      const voicemails = callList.filter((c) => c.outcome === "voicemail")
      const recentCall = callList[0]

      let callPart = `${totalCalls} call${totalCalls > 1 ? "s" : ""} made`
      if (connectedCalls.length > 0) {
        callPart += ` (${connectedCalls.length} connected)`
      }
      if (voicemails.length > 0) {
        callPart += `, ${voicemails.length} voicemail${voicemails.length > 1 ? "s" : ""} left`
      }
      if (recentCall) {
        callPart += `. Last call ${formatDistanceToNow(new Date(recentCall.startedAt || recentCall.createdAt), { addSuffix: true })}`
        if (recentCall.outcome) {
          callPart += ` - ${recentCall.outcome.replace(/_/g, " ")}`
        }
      }
      parts.push(callPart)
    }

    // Get latest notes from calls
    const callWithNotes = callList.find((c) => c.notes && c.notes.trim())
    if (callWithNotes) {
      parts.push(`Latest note: "${callWithNotes.notes.substring(0, 100)}${callWithNotes.notes.length > 100 ? "..." : ""}"`)
    }

    setSummary(parts.join(". ") + ".")
    setGenerating(false)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Correspondence Summary
          </CardTitle>
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Correspondence Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            {emails.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <Mail className="h-3 w-3" />
                {emails.length}
              </Badge>
            )}
            {calls.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <Phone className="h-3 w-3" />
                {calls.length}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {generating ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating summary...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary}
            </p>

            {/* Recent activity timeline */}
            {(emails.length > 0 || calls.length > 0) && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Recent Activity</p>
                <div className="space-y-2">
                  {[...emails.slice(0, 2), ...calls.slice(0, 2)]
                    .sort((a, b) => {
                      const dateA = new Date(a.sentAt || a.startedAt || a.createdAt)
                      const dateB = new Date(b.sentAt || b.startedAt || b.createdAt)
                      return dateB.getTime() - dateA.getTime()
                    })
                    .slice(0, 3)
                    .map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        {"subject" in item ? (
                          <>
                            <Mail className="h-3 w-3 text-blue-500" />
                            <span className="text-muted-foreground">Email:</span>
                            <span className="truncate flex-1">{item.subject || "No subject"}</span>
                          </>
                        ) : (
                          <>
                            <Phone className="h-3 w-3 text-green-500" />
                            <span className="text-muted-foreground">Call:</span>
                            <span className="capitalize">{item.outcome?.replace(/_/g, " ") || "Unknown"}</span>
                          </>
                        )}
                        <span className="text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(
                            new Date(item.sentAt || item.startedAt || item.createdAt),
                            { addSuffix: true }
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
