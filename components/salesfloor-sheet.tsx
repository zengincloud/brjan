"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, Handshake, CalendarCheck, Clock, ExternalLink, Radio } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

// ─── Types ─────────────────────────────────────────────────────────────────

type PresenceUser = {
  lastSeen: string
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    avatarUrl: string | null
    role: string
  }
}

type ActiveCall = {
  id: string
  startedAt: string | null
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    avatarUrl: string | null
  }
  prospect: { name: string; company: string | null } | null
}

type FloorUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  stats: {
    callsToday: number
    connectsToday: number
    meetingsBooked: number
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getInitials(u: { firstName: string | null; lastName: string | null; email: string }) {
  if (u.firstName && u.lastName) return `${u.firstName[0]}${u.lastName[0]}`
  if (u.firstName) return u.firstName[0]
  return u.email[0].toUpperCase()
}

function getDisplayName(u: { firstName: string | null; lastName: string | null; email: string }) {
  if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`
  if (u.firstName) return u.firstName
  return u.email
}

function callDuration(startedAt: string | null): string {
  if (!startedAt) return "0:00"
  const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`
}

// ─── Component ─────────────────────────────────────────────────────────────

export function SalesfloorSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [present, setPresent] = useState<PresenceUser[]>([])
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([])
  const [topReps, setTopReps] = useState<FloorUser[]>([])
  const [tick, setTick] = useState(0)

  // Tick every second for live durations
  useEffect(() => {
    if (!open) return
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [open])

  const refresh = useCallback(async () => {
    const [presRes, callsRes, statsRes] = await Promise.all([
      fetch("/api/salesfloor/presence"),
      fetch("/api/salesfloor/active-calls"),
      fetch("/api/salesfloor/stats"),
    ])
    if (presRes.ok) setPresent((await presRes.json()).present || [])
    if (callsRes.ok) setActiveCalls((await callsRes.json()).calls || [])
    if (statsRes.ok) {
      const data = await statsRes.json()
      setTopReps((data.users || []).slice(0, 5))
    }
  }, [])

  useEffect(() => {
    if (!open) return
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [open, refresh])

  // Build a Set of userIds currently on a call so we can label them in presence
  const onCallUserIds = new Set(activeCalls.map((c) => c.user.id))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[360px] sm:w-[400px] p-0 flex flex-col bg-sidebar-background border-l border-white/[0.06]"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-white/[0.06] shrink-0">
          <SheetTitle className="flex items-center gap-2 text-white/90 text-[15px]">
            <Radio className="h-4 w-4 text-[hsl(100,78%,44%)]" />
            Salesfloor
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-medium text-green-400">LIVE</span>
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Active Calls */}
          {activeCalls.length > 0 && (
            <section>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Live Calls — {activeCalls.length}
              </p>
              <div className="space-y-2">
                {activeCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-red-500/20 bg-red-500/[0.04]"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={call.user.avatarUrl || undefined} />
                        <AvatarFallback className="bg-accent/20 text-accent text-[10px] font-bold">
                          {getInitials(call.user)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card bg-red-400 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-white/85 truncate">{getDisplayName(call.user)}</p>
                      <p className="text-[11px] text-white/35 truncate">
                        {call.prospect
                          ? `${call.prospect.name}${call.prospect.company ? ` · ${call.prospect.company}` : ""}`
                          : "Unknown prospect"}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-[11px] text-white/30 font-mono">
                      <Clock className="h-3 w-3" />
                      {callDuration(call.startedAt)}
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/salesfloor"
                className="flex items-center gap-1.5 mt-2 text-[11px] text-white/30 hover:text-white/60 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Open Salesfloor to listen in
              </Link>
            </section>
          )}

          {/* On The Floor */}
          <section>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
              On the Floor — {present.length}
            </p>
            {present.length === 0 ? (
              <p className="text-[12px] text-white/25 italic">Nobody on the floor yet</p>
            ) : (
              <div className="space-y-1.5">
                {present.map((p) => {
                  const onCall = onCallUserIds.has(p.user.id)
                  return (
                    <div key={p.user.id} className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={p.user.avatarUrl || undefined} />
                          <AvatarFallback className="bg-accent/20 text-accent text-[9px] font-bold">
                            {getInitials(p.user)}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-sidebar-background",
                          onCall ? "bg-red-400 animate-pulse" : "bg-green-400"
                        )} />
                      </div>
                      <p className="text-[12px] text-white/70 flex-1 truncate">{getDisplayName(p.user)}</p>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full leading-none",
                        onCall
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-green-500/10 text-green-400 border border-green-500/20"
                      )}>
                        {onCall ? "on a call" : "dialing"}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Leaderboard (top 5) */}
          {topReps.length > 0 && (
            <section>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
                Today's Top Reps
              </p>
              <div className="space-y-2">
                {topReps.map((rep, i) => (
                  <div key={rep.id} className="flex items-center gap-2.5">
                    <span className="w-4 text-[11px] text-white/25 font-mono shrink-0">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                    </span>
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={rep.avatarUrl || undefined} />
                      <AvatarFallback className="bg-accent/20 text-accent text-[9px] font-bold">
                        {getInitials(rep)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-[12px] text-white/70 flex-1 truncate">{getDisplayName(rep)}</p>
                    <div className="flex items-center gap-2 shrink-0 text-[11px]">
                      <span className="flex items-center gap-0.5 text-white/35">
                        <Phone className="h-2.5 w-2.5" />
                        {rep.stats.callsToday}
                      </span>
                      <span className="flex items-center gap-0.5 text-green-400/70">
                        <Handshake className="h-2.5 w-2.5" />
                        {rep.stats.connectsToday}
                      </span>
                      {rep.stats.meetingsBooked > 0 && (
                        <span className="flex items-center gap-0.5 text-green-400">
                          <CalendarCheck className="h-2.5 w-2.5" />
                          {rep.stats.meetingsBooked}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] shrink-0">
          <Link href="/salesfloor">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-white/10 text-white/50 hover:text-white/80 hover:bg-white/[0.05] text-[12px]"
            >
              <Radio className="h-3.5 w-3.5 mr-2" />
              Open Full Salesfloor
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
