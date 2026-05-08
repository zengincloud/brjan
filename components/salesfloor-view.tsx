"use client"

import { useState, useEffect, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Phone,
  Mail,
  Users,
  Handshake,
  CalendarCheck,
  RefreshCw,
  Plus,
  Trash2,
  Zap,
  Radio,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────

type FloorUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  role: string
  org: { id: string; name: string } | null
  stats: {
    callsToday: number
    emailsToday: number
    connectsToday: number
    meetingsBooked: number
  }
}

type ActivityEvent = {
  id: string
  type: "call" | "meeting"
  outcome: string
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    avatarUrl: string | null
  }
  prospect: string | null
  company: string | null
  duration: number | null
  time: string
}

type Room = {
  id: string
  name: string
  emoji: string
  createdAt: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getInitials(user: Pick<FloorUser, "firstName" | "lastName" | "email">): string {
  if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`
  if (user.firstName) return user.firstName[0]
  return user.email[0].toUpperCase()
}

function getDisplayName(user: Pick<FloorUser, "firstName" | "lastName" | "email">): string {
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  if (user.firstName) return user.firstName
  return user.email
}

function outcomeLabel(outcome: string): string {
  switch (outcome) {
    case "connected_intro_booked": return "booked a meeting"
    case "connected_referral": return "got a referral"
    case "connected_info_gathered": return "gathered info"
    case "connected_not_interested": return "connected (not interested)"
    case "connected": return "connected"
    case "meeting_scheduled": return "has a meeting scheduled"
    default: return outcome.replace(/_/g, " ")
  }
}

function outcomeIcon(outcome: string): string {
  switch (outcome) {
    case "connected_intro_booked":
    case "meeting_scheduled": return "🏆"
    case "connected_referral": return "🤝"
    case "connected_info_gathered": return "📝"
    case "connected": return "📞"
    default: return "⚡"
  }
}

function outcomeIsHighlight(outcome: string): boolean {
  return outcome === "connected_intro_booked" || outcome === "meeting_scheduled"
}

const ROOM_EMOJIS = ["🏠", "⚡", "🎯", "💪", "🔥", "🌟", "🚀", "💎"]

// ─── Sub-components ────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  value,
  label,
  highlight = false,
}: {
  icon: React.ElementType
  value: number
  label: string
  highlight?: boolean
}) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg",
      highlight && value > 0
        ? "bg-green-500/10 border border-green-500/20"
        : "bg-white/[0.03] border border-white/[0.06]"
    )}>
      <div className="flex items-center gap-1">
        <Icon className={cn("h-3 w-3", highlight && value > 0 ? "text-green-400" : "text-white/30")} />
        <span className={cn("text-base font-bold leading-none", highlight && value > 0 ? "text-green-400" : "text-white/80")}>
          {value}
        </span>
      </div>
      <span className="text-[10px] text-white/30 leading-none">{label}</span>
    </div>
  )
}

function UserCard({ user, rank }: { user: FloorUser; rank: number }) {
  const totalActivity = user.stats.callsToday + user.stats.emailsToday
  const isActive = totalActivity > 0

  return (
    <Card className={cn(
      "border transition-colors",
      isActive ? "border-white/10 bg-white/[0.03]" : "border-white/[0.05] bg-white/[0.015] opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {/* Rank */}
          <div className="flex-shrink-0 w-5 text-center">
            {rank === 1 && isActive ? (
              <span className="text-sm">🥇</span>
            ) : rank === 2 && isActive ? (
              <span className="text-sm">🥈</span>
            ) : rank === 3 && isActive ? (
              <span className="text-sm">🥉</span>
            ) : (
              <span className="text-xs text-white/20 font-mono">{rank}</span>
            )}
          </div>

          {/* Avatar + name */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="relative shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="bg-accent/20 text-accent text-xs font-bold">
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                isActive ? "bg-green-400" : "bg-white/20"
              )} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-white/90 truncate leading-tight">
                {getDisplayName(user)}
              </p>
              {user.org && (
                <p className="text-[11px] text-white/35 truncate leading-tight">{user.org.name}</p>
              )}
            </div>
          </div>

          {/* Role badge */}
          <Badge variant="outline" className="text-[10px] border-white/10 text-white/30 shrink-0">
            {user.role}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-1.5">
          <StatPill icon={Phone} value={user.stats.callsToday} label="calls" />
          <StatPill icon={Handshake} value={user.stats.connectsToday} label="connects" highlight />
          <StatPill icon={Mail} value={user.stats.emailsToday} label="emails" />
          <StatPill icon={CalendarCheck} value={user.stats.meetingsBooked} label="meetings" highlight />
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Radio className="h-8 w-8 text-white/10 mb-3" />
        <p className="text-sm text-white/30">No notable activity in the last 24 hours</p>
        <p className="text-xs text-white/20 mt-1">Connected calls and booked meetings will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {events.map((event) => (
        <div
          key={event.id}
          className={cn(
            "flex items-start gap-3 px-4 py-3 rounded-lg transition-colors",
            outcomeIsHighlight(event.outcome)
              ? "bg-green-500/[0.06] border border-green-500/10"
              : "bg-white/[0.02] border border-transparent hover:bg-white/[0.04]"
          )}
        >
          <span className="text-base shrink-0 leading-tight mt-0.5">{outcomeIcon(event.outcome)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-white/80 leading-snug">
              <span className="font-medium text-white/95">{getDisplayName(event.user)}</span>
              {" "}{outcomeLabel(event.outcome)}
              {event.prospect && (
                <>
                  {" with "}
                  <span className="text-white/95 font-medium">{event.prospect}</span>
                  {event.company && <span className="text-white/40"> at {event.company}</span>}
                </>
              )}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-white/25">{timeAgo(event.time)}</span>
              {event.duration && event.duration > 0 && (
                <span className="text-[11px] text-white/25">
                  · {Math.floor(event.duration / 60)}:{String(event.duration % 60).padStart(2, "0")}
                </span>
              )}
              {event.user.org && (
                <span className="text-[11px] text-white/20">· {(event.user as any).org?.name}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function RoomsPanel({
  rooms,
  onCreateRoom,
  onDeleteRoom,
}: {
  rooms: Room[]
  onCreateRoom: (name: string, emoji: string) => Promise<void>
  onDeleteRoom: (id: string) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("🏠")
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    await onCreateRoom(name.trim(), emoji)
    setName("")
    setCreating(false)
  }

  return (
    <div className="space-y-6">
      {/* Create room */}
      <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
        <p className="text-[12px] font-medium text-white/40 uppercase tracking-wider mb-3">Create Room</p>
        <div className="flex gap-2">
          {/* Emoji picker */}
          <div className="flex gap-1 flex-wrap">
            {ROOM_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={cn(
                  "w-8 h-8 rounded-lg text-base flex items-center justify-center transition-colors",
                  emoji === e ? "bg-white/10" : "hover:bg-white/[0.05]"
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Room name..."
            className="h-9 text-sm bg-white/[0.03] border-white/[0.08]"
          />
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            size="sm"
            className="h-9 shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>
      </div>

      {/* Room list */}
      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-3">🏠</div>
          <p className="text-sm text-white/30">No rooms yet</p>
          <p className="text-xs text-white/20 mt-1">Create a room to group team sessions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] group"
            >
              <span className="text-2xl shrink-0">{room.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white/80 truncate">{room.name}</p>
                <p className="text-[11px] text-white/25">0 members · video ready</p>
              </div>
              <button
                onClick={() => onDeleteRoom(room.id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-red-500/10 text-white/30 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-[11px] text-white/20 pt-2">
        Video + audio coming soon · rooms are placeholders for now
      </p>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

type Tab = "floor" | "activity" | "rooms"

export function SalesfloorView() {
  const [tab, setTab] = useState<Tab>("floor")
  const [users, setUsers] = useState<FloorUser[]>([])
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/salesfloor/stats")
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users || [])
    }
  }, [])

  const loadActivity = useCallback(async () => {
    const res = await fetch("/api/salesfloor/activity")
    if (res.ok) {
      const data = await res.json()
      setEvents(data.events || [])
    }
  }, [])

  const loadRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/salesfloor/rooms")
      if (res.ok) {
        const data = await res.json()
        setRooms(data.rooms || [])
      }
    } catch {
      // rooms table may not exist yet if migration hasn't run
    }
  }, [])

  const loadAll = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)

    await Promise.all([loadStats(), loadActivity(), loadRooms()])
    setLastRefreshed(new Date())

    if (showRefreshing) setRefreshing(false)
    else setLoading(false)
  }, [loadStats, loadActivity, loadRooms])

  useEffect(() => {
    loadAll()
    const interval = setInterval(() => loadAll(), 30_000)
    return () => clearInterval(interval)
  }, [loadAll])

  const handleCreateRoom = useCallback(async (name: string, emoji: string) => {
    const res = await fetch("/api/salesfloor/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, emoji }),
    })
    if (res.ok) {
      const data = await res.json()
      setRooms((prev) => [data.room, ...prev])
    }
  }, [])

  const handleDeleteRoom = useCallback(async (id: string) => {
    await fetch(`/api/salesfloor/rooms/${id}`, { method: "DELETE" })
    setRooms((prev) => prev.filter((r) => r.id !== id))
  }, [])

  // Summary numbers
  const totalCallsToday = users.reduce((s, u) => s + u.stats.callsToday, 0)
  const totalConnectsToday = users.reduce((s, u) => s + u.stats.connectsToday, 0)
  const totalEmailsToday = users.reduce((s, u) => s + u.stats.emailsToday, 0)
  const totalMeetings = users.reduce((s, u) => s + u.stats.meetingsBooked, 0)
  const activeReps = users.filter((u) => u.stats.callsToday + u.stats.emailsToday > 0).length

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "floor", label: "Floor", count: users.length },
    { id: "activity", label: "Activity", count: events.length },
    { id: "rooms", label: "Rooms", count: rooms.length },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Zap className="h-5 w-5 text-[hsl(100,78%,44%)]" />
            <h1 className="text-xl font-semibold text-white/90">Salesfloor</h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-medium text-green-400">LIVE</span>
            </span>
            <Badge variant="outline" className="text-[10px] border-white/10 text-white/30">
              super admin only
            </Badge>
          </div>
          <p className="text-sm text-white/35">
            {activeReps} active rep{activeReps !== 1 ? "s" : ""} today · refreshes every 30s
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadAll(true)}
          disabled={refreshing || loading}
          className="border-white/10 text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Platform summary bar */}
      {!loading && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { icon: Phone, label: "Calls Today", value: totalCallsToday },
            { icon: Handshake, label: "Connects", value: totalConnectsToday },
            { icon: Mail, label: "Emails Sent", value: totalEmailsToday },
            { icon: CalendarCheck, label: "Meetings Booked", value: totalMeetings },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
            >
              <Icon className="h-4 w-4 text-white/25 shrink-0" />
              <div>
                <p className="text-xl font-bold text-white/90 leading-none">{value}</p>
                <p className="text-[11px] text-white/30 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-white/[0.06] pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5",
              tab === t.id
                ? "text-white border-[hsl(100,78%,44%)]"
                : "text-white/40 border-transparent hover:text-white/65"
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full leading-none",
                tab === t.id ? "bg-white/10 text-white/60" : "bg-white/[0.05] text-white/25"
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-white/[0.05] bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {tab === "floor" && (
            <div>
              {users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Users className="h-10 w-10 text-white/10 mb-3" />
                  <p className="text-sm text-white/30">No users on the platform yet</p>
                  <p className="text-xs text-white/20 mt-1">
                    Invite team members — they will appear here once they sign up
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {users.map((user, i) => (
                    <UserCard key={user.id} user={user} rank={i + 1} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "activity" && (
            <div className="max-w-3xl">
              <ActivityFeed events={events} />
            </div>
          )}

          {tab === "rooms" && (
            <div className="max-w-4xl">
              <RoomsPanel
                rooms={rooms}
                onCreateRoom={handleCreateRoom}
                onDeleteRoom={handleDeleteRoom}
              />
            </div>
          )}
        </>
      )}

      {/* Last refreshed */}
      {!loading && (
        <p className="text-center text-[11px] text-white/15 mt-8">
          Last updated {lastRefreshed.toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}
