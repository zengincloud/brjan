"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown, Linkedin, MessageSquare, UserCheck, Send } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { cn } from "@/lib/utils"

type Conversation = {
  id: string
  participantName: string
  lastMessageAt?: string
  matchStatus: string
  messages: {
    id: string
    direction: "inbound" | "outbound"
    body: string
    senderName: string
    sentAt: string
  }[]
}

type CampaignEntry = {
  id: string
  campaignName: string
  status: string
  inviteSentAt?: string
  acceptedAt?: string
  messageSentAt?: string
  repliedAt?: string
}

export function LinkedInProspectSection({ prospectId }: { prospectId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [campaigns, setCampaigns] = useState<CampaignEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedConvs, setExpandedConvs] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([
      fetch(`/api/linkedin/prospect/${prospectId}/conversations`).then(r => r.json()),
      fetch(`/api/linkedin/prospect/${prospectId}/campaigns`).then(r => r.json()),
    ])
      .then(([convData, campData]) => {
        setConversations(convData.conversations || [])
        setCampaigns(campData.entries || [])
      })
      .finally(() => setLoading(false))
  }, [prospectId])

  if (loading) return null
  if (conversations.length === 0 && campaigns.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Linkedin className="h-4 w-4 text-[#0A66C2]" />
          LinkedIn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campaign activity */}
        {campaigns.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign Activity</p>
            <div className="space-y-1.5">
              {campaigns.map(entry => (
                <div key={entry.id} className="text-sm space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{entry.campaignName}</Badge>
                    <Badge className={cn(
                      "text-xs",
                      entry.status === "replied" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                      entry.status === "messaged" ? "bg-purple-500/15 text-purple-700 dark:text-purple-400" :
                      entry.status === "accepted" ? "bg-green-500/15 text-green-700 dark:text-green-400" :
                      entry.status === "invited" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {entry.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 pl-1 text-xs text-muted-foreground">
                    {entry.inviteSentAt && (
                      <span className="flex items-center gap-1">
                        <Send className="h-3 w-3" />
                        Invite sent {format(new Date(entry.inviteSentAt), "MMM d")}
                      </span>
                    )}
                    {entry.acceptedAt && (
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3" />
                        Accepted {format(new Date(entry.acceptedAt), "MMM d")}
                      </span>
                    )}
                    {entry.messageSentAt && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Messaged {format(new Date(entry.messageSentAt), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversations */}
        {conversations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Conversations
            </p>
            <div className="space-y-2">
              {conversations.map(conv => (
                <Collapsible
                  key={conv.id}
                  open={expandedConvs.has(conv.id)}
                  onOpenChange={open =>
                    setExpandedConvs(prev => {
                      const next = new Set(prev)
                      open ? next.add(conv.id) : next.delete(conv.id)
                      return next
                    })
                  }
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between h-auto py-2 px-3 text-left">
                      <div className="flex items-center gap-2 text-sm">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span>
                          {conv.messages.length} message{conv.messages.length !== 1 ? "s" : ""}
                        </span>
                        {conv.lastMessageAt && (
                          <span className="text-xs text-muted-foreground">
                            · {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 text-muted-foreground transition-transform",
                          expandedConvs.has(conv.id) && "rotate-180"
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1 space-y-1.5 pl-3 border-l border-border ml-3">
                      {conv.messages.map(msg => (
                        <div key={msg.id} className="text-xs">
                          <span className={cn(
                            "font-medium",
                            msg.direction === "outbound" ? "text-primary" : "text-foreground"
                          )}>
                            {msg.senderName}
                          </span>
                          <span className="text-muted-foreground ml-1">
                            · {format(new Date(msg.sentAt), "MMM d")}
                          </span>
                          <p className="text-muted-foreground mt-0.5 leading-relaxed">{msg.body}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pl-3">
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs" asChild>
                        <a href={`/linkedin?conversation=${conv.id}`}>View in LinkedIn tab →</a>
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
