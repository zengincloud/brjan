"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  Search,
  Send,
  Users,
  UserCheck,
  MessageSquare,
  Reply,
  AlertTriangle,
  Linkedin,
  RefreshCw,
  Link2,
  X,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"

type Conversation = {
  id: string
  participantName: string
  participantTitle?: string
  participantAvatar?: string
  participantLinkedin?: string
  lastMessageText?: string
  lastMessageAt?: string
  unreadCount: number
  matchStatus: "auto_matched" | "manually_matched" | "unmatched"
  tags: string[]
  prospect?: { id: string; name: string; company?: string; title?: string } | null
}

type Message = {
  id: string
  direction: "inbound" | "outbound"
  body: string
  senderName: string
  sentAt: string
}

type Stats = {
  invitesSent: number
  invitesAccepted: number
  messagesSent: number
  messagesReplied: number
  unmatchedCount: number
}

export default function LinkedInPage() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("recent")
  const [matchFilter, setMatchFilter] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [matchDialogOpen, setMatchDialogOpen] = useState(false)
  const [matchSearch, setMatchSearch] = useState("")
  const [matchProspects, setMatchProspects] = useState<any[]>([])
  const { toast } = useToast()

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/linkedin/status")
    const data = await res.json()
    setConnected(data.connected)
  }, [])

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/linkedin/stats")
    const data = await res.json()
    setStats(data)
  }, [])

  const loadConversations = useCallback(async () => {
    const params = new URLSearchParams({ sort })
    if (matchFilter) params.set("matchStatus", matchFilter)
    if (search) params.set("search", search)
    const res = await fetch(`/api/linkedin/conversations?${params}`)
    const data = await res.json()
    setConversations(data.conversations || [])
  }, [sort, matchFilter, search])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (connected) {
      loadStats()
      loadConversations()
    }
  }, [connected, loadStats, loadConversations])

  useEffect(() => {
    if (!selectedConversation) return
    fetch(`/api/linkedin/conversations/${selectedConversation.id}/messages`)
      .then(r => r.json())
      .then(d => setMessages(d.messages || []))
  }, [selectedConversation])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await fetch("/api/linkedin/connect", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      toast({ title: "Failed to connect LinkedIn", variant: "destructive" })
      setConnecting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch("/api/linkedin/sync", { method: "POST" })
      const data = await res.json()
      await loadConversations()
      await loadStats()
      toast({ title: `Sync complete`, description: `${data.synced} conversations synced` })
    } catch {
      toast({ title: "Sync failed", variant: "destructive" })
    } finally {
      setSyncing(false)
    }
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConversation) return
    setSending(true)
    try {
      const res = await fetch(`/api/linkedin/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText.trim() }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      setReplyText("")
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const handleMatchSearch = async (q: string) => {
    setMatchSearch(q)
    if (!q.trim()) { setMatchProspects([]); return }
    const res = await fetch(`/api/prospects?search=${encodeURIComponent(q)}&limit=10`)
    const data = await res.json()
    setMatchProspects(data.prospects || [])
  }

  const handleMatchProspect = async (prospectId: string | null) => {
    if (!selectedConversation) return
    const res = await fetch(`/api/linkedin/conversations/${selectedConversation.id}/match`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectId }),
    })
    const data = await res.json()
    setSelectedConversation(data.conversation)
    setConversations(prev =>
      prev.map(c => (c.id === data.conversation.id ? data.conversation : c))
    )
    setMatchDialogOpen(false)
    toast({ title: prospectId ? "Matched to prospect" : "Unmatched" })
  }

  if (connected === null) {
    return <div className="p-8 text-muted-foreground">Loading...</div>
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center">
          <Linkedin className="h-12 w-12 mx-auto mb-4 text-[#0A66C2]" />
          <h1 className="text-2xl font-bold mb-2">Connect LinkedIn</h1>
          <p className="text-muted-foreground max-w-md">
            Connect your LinkedIn account to sync conversations, send messages, and run outreach campaigns.
          </p>
        </div>
        <Button onClick={handleConnect} disabled={connecting} size="lg">
          <Linkedin className="h-4 w-4 mr-2" />
          {connecting ? "Connecting..." : "Connect LinkedIn"}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h1 className="text-2xl font-bold">LinkedIn</h1>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
          {syncing ? "Syncing..." : "Sync Inbox"}
        </Button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="px-6 py-3 border-b bg-muted/30 flex gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{stats.invitesSent}</span>
            <span className="text-muted-foreground">Invites sent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{stats.invitesAccepted}</span>
            <span className="text-muted-foreground">Accepted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{stats.messagesSent}</span>
            <span className="text-muted-foreground">Messages sent</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Reply className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{stats.messagesReplied}</span>
            <span className="text-muted-foreground">Replied</span>
          </div>
        </div>
      )}

      {/* Unmatched banner */}
      {stats && stats.unmatchedCount > 0 && (
        <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span className="text-amber-700 dark:text-amber-400">
            {stats.unmatchedCount} conversation{stats.unmatchedCount > 1 ? "s" : ""} not matched to a prospect.
          </span>
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto text-amber-600 dark:text-amber-400 underline"
            onClick={() => setMatchFilter("unmatched")}
          >
            Review
          </Button>
          {matchFilter === "unmatched" && (
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-muted-foreground"
              onClick={() => setMatchFilter("")}
            >
              Clear filter
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list */}
        <div className="w-80 border-r flex flex-col">
          {/* Filters */}
          <div className="p-3 space-y-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="unread">Unread first</SelectItem>
                </SelectContent>
              </Select>
              <Select value={matchFilter} onValueChange={setMatchFilter}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="unmatched">Unmatched</SelectItem>
                  <SelectItem value="auto_matched">Auto matched</SelectItem>
                  <SelectItem value="manually_matched">Manual match</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No conversations found
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors",
                    selectedConversation?.id === conv.id && "bg-muted"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">
                          {conv.prospect?.name || conv.participantName}
                        </span>
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="h-4 px-1.5 text-[10px]">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {(conv.prospect?.company || conv.participantTitle) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.prospect?.company || conv.participantTitle}
                        </p>
                      )}
                      {conv.lastMessageText && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.lastMessageText}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {conv.lastMessageAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                        </span>
                      )}
                      {conv.matchStatus === "unmatched" && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-amber-600 border-amber-400">
                          unmatched
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Message thread */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Thread header */}
            <div className="px-6 py-3 border-b flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">
                    {selectedConversation.prospect?.name || selectedConversation.participantName}
                  </h2>
                  {selectedConversation.matchStatus === "unmatched" ? (
                    <Badge variant="outline" className="text-amber-600 border-amber-400 text-xs">
                      unmatched
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-400 text-xs">
                      matched
                    </Badge>
                  )}
                </div>
                {selectedConversation.prospect?.company && (
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.prospect.company}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedConversation.prospect && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/prospects/${selectedConversation.prospect.id}`} target="_blank">
                      View Prospect
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMatchDialogOpen(true)}
                >
                  <Link2 className="h-3.5 w-3.5 mr-1.5" />
                  {selectedConversation.matchStatus === "unmatched" ? "Match" : "Re-match"}
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3 max-w-2xl mx-auto">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.direction === "outbound" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
                        msg.direction === "outbound"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                      <p
                        className={cn(
                          "text-[10px] mt-1",
                          msg.direction === "outbound"
                            ? "text-primary-foreground/60"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatDistanceToNow(new Date(msg.sentAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Reply box */}
            <div className="p-4 border-t">
              <div className="flex gap-2 max-w-2xl mx-auto">
                <Input
                  placeholder="Write a message..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendReply()
                    }
                  }}
                />
                <Button onClick={handleSendReply} disabled={sending || !replyText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select a conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Match dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match to Prospect</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prospects by name or company..."
                value={matchSearch}
                onChange={e => handleMatchSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {matchProspects.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleMatchProspect(p.id)}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-muted transition-colors"
                >
                  <p className="text-sm font-medium">{p.name}</p>
                  {p.company && (
                    <p className="text-xs text-muted-foreground">{p.company}</p>
                  )}
                </button>
              ))}
              {matchSearch && matchProspects.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No prospects found</p>
              )}
            </div>
            {selectedConversation?.matchStatus !== "unmatched" && (
              <>
                <Separator />
                <Button
                  variant="ghost"
                  className="w-full text-destructive"
                  onClick={() => handleMatchProspect(null)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Unmatch
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
