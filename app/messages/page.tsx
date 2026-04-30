"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, MessageSquare, Loader2, ExternalLink, RefreshCw, RotateCcw, AlertCircle, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { BRLoader } from "@/components/ui/br-loader"

interface Prospect {
  id: string
  name: string
  email: string | null
  company: string | null
}

interface Conversation {
  id: string
  linkedinThreadId: string
  participantName: string
  participantTitle: string | null
  participantAvatar: string | null
  participantLinkedin: string | null
  lastMessageText: string | null
  lastMessageAt: string | null
  unreadCount: number
  prospect: Prospect | null
}

interface Message {
  id: string
  direction: "inbound" | "outbound"
  body: string
  senderName: string
  status: string
  sentAt: string
}

interface PendingMessageItem {
  id: string
  body: string
  status: "pending" | "sending" | "failed"
  errorMessage: string | null
  createdAt: string
}

interface ConversationWithMessages extends Conversation {
  messages: Message[]
  pendingMessages?: PendingMessageItem[]
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithMessages | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Load conversations
  useEffect(() => {
    loadConversations()
  }, [])

  // Scroll to bottom instantly when a thread loads or messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" })
  }, [selectedConversation?.messages, selectedConversation?.pendingMessages])

  async function loadConversations() {
    try {
      setLoading(true)
      const res = await fetch("/api/messages")
      if (!res.ok) throw new Error("Failed to load conversations")
      const data = await res.json()
      setConversations(data.conversations)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load conversations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadThread(conversationId: string) {
    try {
      setLoadingThread(true)
      setSelectedId(conversationId)
      const res = await fetch(`/api/messages?conversationId=${conversationId}`)
      if (!res.ok) throw new Error("Failed to load thread")
      const data = await res.json()
      setSelectedConversation(data.conversation)

      // Update unread count in the list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        )
      )
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load thread",
        variant: "destructive",
      })
    } finally {
      setLoadingThread(false)
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedId) return

    try {
      setSending(true)
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedId,
          message: newMessage.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to send message")
      }

      // Add pending message to the thread locally
      if (selectedConversation) {
        const pendingMsg: Message = {
          id: `pending-${Date.now()}`,
          direction: "outbound",
          body: newMessage.trim(),
          senderName: "You",
          status: "pending",
          sentAt: new Date().toISOString(),
        }
        setSelectedConversation({
          ...selectedConversation,
          messages: [...selectedConversation.messages, pendingMsg],
        })
      }

      setNewMessage("")
      toast({
        title: "Message queued",
        description: "Your message will be sent via LinkedIn when the extension is active.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  async function retryMessage(pendingMessageId: string) {
    try {
      const res = await fetch("/api/messages/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingMessageId }),
      })
      if (!res.ok) throw new Error("Failed to retry message")

      // Refresh thread to show updated status
      if (selectedId) loadThread(selectedId)

      toast({
        title: "Message re-queued",
        description: "The message will be retried via the extension.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to retry message",
        variant: "destructive",
      })
    }
  }

  function formatTime(dateStr: string | null) {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = diff / (1000 * 60 * 60)

    if (hours < 1) return `${Math.floor(diff / 60000)}m`
    if (hours < 24) return `${Math.floor(hours)}h`
    if (hours < 168) return `${Math.floor(hours / 24)}d`
    return date.toLocaleDateString()
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Messages</h1>
          {totalUnread > 0 && (
            <Badge variant="default" className="bg-green-500 text-white">
              {totalUnread}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={loadConversations}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <BRLoader />
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              LinkedIn conversations will appear here once the Boilerroom extension
              syncs your messages. Make sure the extension is installed and you have
              a LinkedIn messaging tab open.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-180px)]">
          {/* Conversation List */}
          <div className="col-span-4 overflow-hidden">
            <Card className="h-full">
              <CardContent className="p-0 h-full overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadThread(conv.id)}
                    className={`w-full text-left px-4 py-3 border-b border-border hover:bg-accent/5 transition-colors ${
                      selectedId === conv.id ? "bg-accent/10" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        {conv.participantAvatar && (
                          <AvatarImage src={conv.participantAvatar} />
                        )}
                        <AvatarFallback className="text-xs">
                          {getInitials(conv.participantName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">
                            {conv.participantName}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatTime(conv.lastMessageAt)}
                          </span>
                        </div>
                        {conv.participantTitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.participantTitle}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {conv.lastMessageText || "No messages"}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge
                          variant="default"
                          className="bg-green-500 text-white text-xs h-5 min-w-5 flex items-center justify-center flex-shrink-0"
                        >
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {conv.prospect && (
                      <div className="mt-1 ml-13">
                        <Badge variant="outline" className="text-xs">
                          {conv.prospect.name}
                        </Badge>
                      </div>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Thread View */}
          <div className="col-span-8 overflow-hidden">
            <Card className="h-full flex flex-col">
              {!selectedId ? (
                <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Select a conversation to view messages</p>
                  </div>
                </CardContent>
              ) : loadingThread ? (
                <CardContent className="flex-1 flex items-center justify-center">
                  <BRLoader />
                </CardContent>
              ) : selectedConversation ? (
                <>
                  {/* Thread Header */}
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {selectedConversation.participantAvatar && (
                          <AvatarImage src={selectedConversation.participantAvatar} />
                        )}
                        <AvatarFallback className="text-xs">
                          {getInitials(selectedConversation.participantName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {selectedConversation.participantName}
                        </p>
                        {selectedConversation.participantTitle && (
                          <p className="text-xs text-muted-foreground">
                            {selectedConversation.participantTitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedConversation.prospect && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/prospects/${selectedConversation.prospect.id}`}>
                            View Prospect
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      )}
                      {selectedConversation.participantLinkedin && (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={selectedConversation.participantLinkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            LinkedIn
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {selectedConversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.direction === "outbound" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                            msg.direction === "outbound"
                              ? "bg-green-500/15 text-foreground"
                              : "bg-accent/10 text-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.body}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.sentAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Pending / Sending / Failed messages */}
                    {selectedConversation.pendingMessages?.map((pm) => (
                      <div key={pm.id} className="flex justify-end">
                        <div className="max-w-[70%] rounded-lg px-3 py-2 text-sm bg-green-500/10 text-foreground border border-dashed border-green-500/30">
                          <p className="whitespace-pre-wrap">{pm.body}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {new Date(pm.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {pm.status === "pending" && (
                              <Badge variant="outline" className="text-xs h-4 gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                Queued
                              </Badge>
                            )}
                            {pm.status === "sending" && (
                              <Badge variant="outline" className="text-xs h-4 gap-1">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                Sending
                              </Badge>
                            )}
                            {pm.status === "failed" && (
                              <>
                                <Badge variant="destructive" className="text-xs h-4 gap-1">
                                  <AlertCircle className="h-2.5 w-2.5" />
                                  Failed
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => retryMessage(pm.id)}
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Compose */}
                  <div className="p-3 border-t border-border">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleSend()
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        disabled={sending}
                        className="flex-1"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!newMessage.trim() || sending}
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>
                    <p className="text-xs text-muted-foreground mt-1">
                      Messages are sent via your LinkedIn account through the Boilerroom extension.
                    </p>
                  </div>
                </>
              ) : null}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
