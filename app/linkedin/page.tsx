"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  UserCheck,
  MessageSquare,
  Reply,
  AlertTriangle,
  Linkedin,
  RefreshCw,
  Link2,
  X,
} from "lucide-react"
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns"
import { useToast } from "@/hooks/use-toast"

type Conversation = {
  id: string
  participantName: string
  participantTitle?: string
  participantAvatar?: string
  participantLinkedin?: string
  lastMessageText?: string
  lastMessageAt?: string
  createdAt: string
  lastMessageDirection?: "inbound" | "outbound" | null
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
  createdAt: string
}

type Stats = {
  invitesSent: number
  invitesAccepted: number
  messagesSent: number
  messagesReplied: number
  unmatchedCount: number
}

function formatMsgDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return format(d, "h:mm a")
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`
  return format(d, "MMM d, h:mm a")
}

function formatConvDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return format(d, "h:mm a")
  if (isYesterday(d)) return "Yesterday"
  return format(d, "MMM d")
}

function Avatar({ name, src, size = "md" }: { name: string; src?: string | null; size?: "sm" | "md" }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  const cls = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"
  if (src) return <img src={src} alt={name} className={cn(cls, "rounded-full object-cover flex-shrink-0")} />
  return (
    <div className={cn(cls, "rounded-full bg-muted flex items-center justify-center font-medium text-muted-foreground flex-shrink-0")}>
      {initials}
    </div>
  )
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
  const [matchFilter, setMatchFilter] = useState("all")
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [matchDialogOpen, setMatchDialogOpen] = useState(false)
  const [matchSearch, setMatchSearch] = useState("")
  const [matchProspects, setMatchProspects] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

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
    if (matchFilter && matchFilter !== "all") params.set("matchStatus", matchFilter)
    if (search) params.set("search", search)
    const res = await fetch(`/api/linkedin/conversations?${params}`)
    const data = await res.json()
    setConversations(data.conversations || [])
  }, [sort, matchFilter, search])

  useEffect(() => { loadStatus() }, [loadStatus])

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
      .then(d => {
        const sorted = (d.messages || []).sort((a: Message, b: Message) => {
          const ta = a.sentAt ? new Date(a.sentAt).getTime() : new Date(a.createdAt).getTime()
          const tb = b.sentAt ? new Date(b.sentAt).getTime() : new Date(b.createdAt).getTime()
          return ta - tb
        })
        setMessages(sorted)
        setTimeout(scrollToBottom, 50)
      })
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const res = await fetch("/api/linkedin/connect", { method: "POST" })
      const data = await res.json()
      if (data.url) window.location.href = data.url
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
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to send")
      }
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      setReplyText("")
    } catch (e: any) {
      toast({ title: "Failed to send message", description: e.message, variant: "destructive" })
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
    setConversations(prev => prev.map(c => c.id === data.conversation.id ? data.conversation : c))
    setMatchDialogOpen(false)
    setMatchSearch("")
    setMatchProspects([])
    toast({ title: prospectId ? "Matched to prospect" : "Unmatched" })
  }

  if (connected === null) return <div className="p-8 text-muted-foreground">Loading...</div>

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

  const displayName = (conv: Conversation) => conv.prospect?.name || conv.participantName
  const displaySub = (conv: Conversation) => conv.prospect?.company || conv.prospect?.title || conv.participantTitle || ""

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-6 py-3 border-b flex items-center justify-between">
        <h1 className="text-xl font-bold">LinkedIn</h1>
        <div className="flex items-center gap-3">
          {stats && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span><span className="font-medium text-foreground">{stats.invitesSent}</span> sent</span>
              <span><span className="font-medium text-foreground">{stats.invitesAccepted}</span> accepted</span>
              <span><span className="font-medium text-foreground">{stats.messagesSent}</span> messages</span>
              <span><span className="font-medium text-foreground">{stats.messagesReplied}</span> replied</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync"}
          </Button>
        </div>
      </div>

      {/* Unmatched banner */}
      {stats && stats.unmatchedCount > 0 && (
        <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-sm">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-amber-700 dark:text-amber-400">
            {stats.unmatchedCount} unmatched conversation{stats.unmatchedCount > 1 ? "s" : ""}
          </span>
          <Button variant="link" size="sm" className="p-0 h-auto text-amber-600 dark:text-amber-400 underline text-sm"
            onClick={() => setMatchFilter("unmatched")}>
            Review
          </Button>
          {matchFilter === "unmatched" && (
            <Button variant="link" size="sm" className="p-0 h-auto text-muted-foreground text-sm"
              onClick={() => setMatchFilter("all")}>
              Clear
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[320px] border-r flex flex-col bg-background">
          {/* Filters */}
          <div className="p-3 space-y-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm" />
            </div>
            <div className="flex gap-2">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="unread">Unread first</SelectItem>
                </SelectContent>
              </Select>
              <Select value={matchFilter} onValueChange={setMatchFilter}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unmatched">Unmatched</SelectItem>
                  <SelectItem value="auto_matched">Auto matched</SelectItem>
                  <SelectItem value="manually_matched">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No conversations</div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b hover:bg-muted/40 transition-colors flex items-start gap-3 relative",
                    selectedConversation?.id === conv.id && "bg-muted",
                    conv.unreadCount > 0 && "border-l-2 border-l-[#0A66C2] pl-[14px]"
                  )}
                >
                  <Avatar name={displayName(conv)} src={conv.participantAvatar} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={cn("text-sm truncate", conv.unreadCount > 0 ? "font-bold text-foreground" : "font-medium")}>
                        {displayName(conv)}
                      </span>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {formatConvDate(conv.lastMessageAt || conv.createdAt)}
                      </span>
                    </div>
                    {displaySub(conv) && (
                      <p className="text-xs text-muted-foreground truncate italic leading-snug mb-0.5">
                        {displaySub(conv)}
                      </p>
                    )}
                    {conv.lastMessageText && (
                      <p className={cn("text-xs truncate", conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {conv.lastMessageDirection === "outbound" ? "You: " : ""}{conv.lastMessageText}
                      </p>
                    )}
                    {conv.matchStatus === "unmatched" && (
                      <span className="text-[10px] text-amber-500 mt-0.5 block">unmatched</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message thread */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Thread header */}
            <div className="px-5 py-3 border-b flex items-center gap-3">
              <Avatar name={displayName(selectedConversation)} src={selectedConversation.participantAvatar} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-sm">{displayName(selectedConversation)}</h2>
                  {selectedConversation.matchStatus === "unmatched" ? (
                    <span className="text-[10px] text-amber-600 border border-amber-400 rounded px-1">unmatched</span>
                  ) : (
                    <span className="text-[10px] text-green-600 border border-green-400 rounded px-1">matched</span>
                  )}
                </div>
                {displaySub(selectedConversation) && (
                  <p className="text-xs text-muted-foreground truncate">{displaySub(selectedConversation)}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedConversation.prospect && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/prospects/${selectedConversation.prospect.id}`} target="_blank">View Prospect</a>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setMatchDialogOpen(true)}>
                  <Link2 className="h-3.5 w-3.5 mr-1.5" />
                  {selectedConversation.matchStatus === "unmatched" ? "Match" : "Re-match"}
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
              <div className="max-w-2xl mx-auto space-y-1">
                {messages.map((msg, i) => {
                  const isOut = msg.direction === "outbound"
                  const prev = messages[i - 1]
                  const next = messages[i + 1]
                  const showDate = !prev || new Date(msg.sentAt).toDateString() !== new Date(prev.sentAt).toDateString()
                  const isGroupStart = !prev || prev.direction !== msg.direction
                  const isGroupEnd = !next || next.direction !== msg.direction

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex items-center gap-3 py-3">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground">
                            {isToday(new Date(msg.sentAt)) ? "Today" : isYesterday(new Date(msg.sentAt)) ? "Yesterday" : format(new Date(msg.sentAt), "MMMM d, yyyy")}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      )}
                      <div className={cn("flex items-end gap-2", isOut ? "justify-end" : "justify-start", !isGroupEnd && "mb-0.5")}>
                        {!isOut && (
                          <div className="w-6 flex-shrink-0">
                            {isGroupEnd && (
                              <Avatar name={selectedConversation.participantName} src={selectedConversation.participantAvatar} size="sm" />
                            )}
                          </div>
                        )}
                        <div className="flex flex-col max-w-[65%]">
                          {!isOut && isGroupStart && (
                            <span className="text-xs text-muted-foreground mb-1 ml-1">{msg.senderName}</span>
                          )}
                          <div
                            className={cn(
                              "px-3.5 py-2 text-sm leading-relaxed",
                              isOut
                                ? "bg-[#0A66C2] text-white rounded-2xl rounded-br-md"
                                : "bg-muted text-foreground rounded-2xl rounded-bl-md",
                              isGroupStart && isOut && "rounded-tr-2xl",
                              isGroupStart && !isOut && "rounded-tl-2xl",
                            )}
                          >
                            {msg.body}
                          </div>
                          {isGroupEnd && (
                            <span className={cn("text-[10px] text-muted-foreground mt-1", isOut ? "text-right" : "text-left ml-1")}>
                              {formatMsgDate(msg.sentAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Reply box */}
            <div className="px-4 py-3 border-t bg-background">
              <div className="max-w-2xl mx-auto flex gap-2 items-end">
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
                  className="flex-1"
                />
                <Button onClick={handleSendReply} disabled={sending || !replyText.trim()} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Select a conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Match dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={open => { setMatchDialogOpen(open); if (!open) { setMatchSearch(""); setMatchProspects([]) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Match to Prospect</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or company..." value={matchSearch}
                onChange={e => handleMatchSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {matchProspects.map(p => (
                <button key={p.id} onClick={() => handleMatchProspect(p.id)}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-muted transition-colors">
                  <p className="text-sm font-medium">{p.name}</p>
                  {p.company && <p className="text-xs text-muted-foreground">{p.company}</p>}
                </button>
              ))}
              {matchSearch && matchProspects.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No prospects found</p>
              )}
            </div>
            {selectedConversation?.matchStatus !== "unmatched" && (
              <>
                <Separator />
                <Button variant="ghost" className="w-full text-destructive" onClick={() => handleMatchProspect(null)}>
                  <X className="h-4 w-4 mr-2" />Unmatch
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
