"use client"

import { useState, useEffect, useRef } from "react"
import { Phone, PhoneOff, Send, ChevronRight, AlertTriangle, Trophy, RotateCcw, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { toast } from "sonner"

// ─── Types ───────────────────────────────────────────────────────────────────

type Difficulty = "easy" | "medium" | "hard"
type View = "setup" | "calling" | "scoring" | "results"
type Message = { role: "user" | "prospect"; content: string }

type ScoringCriterion = {
  passed: boolean
  points: number
  maxPoints: number
  note: string
}

type ScoringBreakdown = {
  opener: ScoringCriterion
  permission: ScoringCriterion
  value_prop: ScoringCriterion
  discovery: ScoringCriterion
  objection_handling: ScoringCriterion
  close: ScoringCriterion
}

// ─── Character definitions ────────────────────────────────────────────────────

const CHARACTERS = {
  mike_reynolds: {
    id: "mike_reynolds",
    name: "Mike Reynolds",
    role: "Marketing Manager",
    company: "Launchpad Co.",
    initials: "MR",
    difficulty: "easy" as Difficulty,
    description: "Friendly and open to new ideas. He'll give you a fair shot.",
    traits: ["Has 3 minutes", "Curious", "One soft objection"],
    color: "bg-emerald-500",
  },
  jessica_park: {
    id: "jessica_park",
    name: "Jessica Park",
    role: "VP of Sales",
    company: "GrowthForce",
    initials: "JP",
    difficulty: "medium" as Difficulty,
    description: "Busy and skeptical. Needs to see real value fast.",
    traits: ["Results-focused", "Two objections", "Wants proof"],
    color: "bg-amber-500",
  },
  derek_walsh: {
    id: "derek_walsh",
    name: "Derek Walsh",
    role: "Chief Revenue Officer",
    company: "Enterprise Corp",
    initials: "DW",
    difficulty: "hard" as Difficulty,
    description: "Hostile to cold calls. Won't give an inch without proof.",
    traits: ["Locked-in vendor", "Three objections", "Almost impossible"],
    color: "bg-red-500",
  },
}

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string; bgColor: string; borderColor: string }> = {
  easy: { label: "Easy", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
  medium: { label: "Medium", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
  hard: { label: "Hard", color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" },
}

const CRITERIA_LABELS: Record<keyof ScoringBreakdown, string> = {
  opener: "Strong Opener",
  permission: "Asked for Time",
  value_prop: "Clear Value Prop",
  discovery: "Discovery Questions",
  objection_handling: "Handled Objections",
  close: "Asked for Meeting",
}

const FREE_CALL_LIMIT = 12
const WARNING_THRESHOLD = 5

// ─── Component ───────────────────────────────────────────────────────────────

export default function ColdCallPracticePage() {
  const [view, setView] = useState<View>("setup")
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)
  const [mockCallId, setMockCallId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isEndingCall, setIsEndingCall] = useState(false)
  const [callSeconds, setCallSeconds] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [scoringBreakdown, setScoringBreakdown] = useState<ScoringBreakdown | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch stats on mount
  useEffect(() => {
    fetch("/api/mock-calls")
      .then((r) => r.json())
      .then((data) => {
        if (data.completedCount !== undefined) setCompletedCount(data.completedCount)
      })
      .catch(() => {})
  }, [])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Call timer
  useEffect(() => {
    if (view === "calling") {
      timerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setCallSeconds(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [view])

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0")
    const sec = (s % 60).toString().padStart(2, "0")
    return `${m}:${sec}`
  }

  const character = selectedCharacter ? CHARACTERS[selectedCharacter as keyof typeof CHARACTERS] : null
  const diffConfig = selectedDifficulty ? DIFFICULTY_CONFIG[selectedDifficulty] : null

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function startCall() {
    if (!selectedCharacter || !selectedDifficulty) return

    if (completedCount >= FREE_CALL_LIMIT) {
      toast.error("You've used all your free cold calls. Upgrade to keep practicing.")
      return
    }

    try {
      const res = await fetch("/api/mock-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: selectedDifficulty, character: selectedCharacter }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Failed to start call. Check your credits.")
        return
      }

      setMockCallId(data.mockCall.id)
      setMessages(data.mockCall.messages as Message[])
      setView("calling")

      if (data.showWarning) {
        setTimeout(() => {
          toast.warning("Heads up — you're running low on free practice calls.", {
            description: `You've used ${completedCount + 1} of ${FREE_CALL_LIMIT} free calls.`,
            duration: 6000,
          })
        }, 2000)
      }
    } catch {
      toast.error("Something went wrong. Try again.")
    }
  }

  async function sendMessage() {
    if (!input.trim() || !mockCallId || isSending) return

    const userMessage = input.trim()
    setInput("")
    setIsSending(true)

    // Optimistically add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])

    try {
      const res = await fetch(`/api/mock-calls/${mockCallId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Failed to get response")
        return
      }

      setMessages((prev) => [...prev, { role: "prospect", content: data.reply }])
    } catch {
      toast.error("Connection error. Try again.")
    } finally {
      setIsSending(false)
      textareaRef.current?.focus()
    }
  }

  async function endCall() {
    if (!mockCallId || isEndingCall) return
    setIsEndingCall(true)
    setView("scoring")

    try {
      const res = await fetch(`/api/mock-calls/${mockCallId}/end`, {
        method: "POST",
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error("Failed to score your call. Don't worry — it still counted.")
        setView("results")
        return
      }

      setScore(data.score)
      setFeedback(data.feedback)
      setScoringBreakdown(data.scoringBreakdown)
      setCompletedCount((c) => c + 1)
      setView("results")
    } catch {
      toast.error("Scoring failed. Try again.")
      setView("calling")
    } finally {
      setIsEndingCall(false)
    }
  }

  function resetToSetup() {
    setView("setup")
    setMockCallId(null)
    setMessages([])
    setInput("")
    setScore(null)
    setFeedback(null)
    setScoringBreakdown(null)
    setSelectedCharacter(null)
    setSelectedDifficulty(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const callsRemaining = Math.max(0, FREE_CALL_LIMIT - completedCount)
  const isNearLimit = completedCount >= WARNING_THRESHOLD

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Cold Call Practice</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Practice cold calls against AI prospects. Get scored and coached after each call.
          </p>
        </div>
        {view === "setup" && (
          <div className="text-right shrink-0">
            <p className={cn("text-sm font-medium", isNearLimit ? "text-amber-400" : "text-muted-foreground")}>
              {callsRemaining} call{callsRemaining !== 1 ? "s" : ""} remaining
            </p>
            <p className="text-xs text-muted-foreground">Each call costs 2 credits</p>
          </div>
        )}
      </div>

      {/* Warning banner */}
      {isNearLimit && view === "setup" && callsRemaining > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">You're running low on free calls</p>
            <p className="text-amber-400/70">
              You've used {completedCount} of {FREE_CALL_LIMIT} free cold call practice sessions.{" "}
              <Link href="/upgrade" className="underline hover:text-amber-300">Upgrade</Link> for unlimited practice.
            </p>
          </div>
        </div>
      )}

      {callsRemaining === 0 && view === "setup" && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-white/[0.03] border border-white/10 text-sm">
          <Zap className="h-4 w-4 shrink-0 mt-0.5 text-[hsl(100,78%,44%)]" />
          <div>
            <p className="font-medium text-white/80">You've used all {FREE_CALL_LIMIT} free practice calls</p>
            <p className="text-muted-foreground mt-0.5">
              Upgrade to keep sharpening your pitch.
            </p>
            <Link href="/upgrade">
              <Button size="sm" className="mt-3 bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white">
                Upgrade Plan
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── SETUP VIEW ─────────────────────────────────────────────────── */}
      {view === "setup" && (
        <div className="space-y-6">
          {/* Step 1: Choose difficulty */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-white/70">Choose your difficulty</p>
            <div className="grid grid-cols-3 gap-3">
              {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => {
                const cfg = DIFFICULTY_CONFIG[diff]
                const isSelected = selectedDifficulty === diff
                return (
                  <button
                    key={diff}
                    onClick={() => {
                      setSelectedDifficulty(diff)
                      // Auto-select the matching character
                      const match = Object.values(CHARACTERS).find((c) => c.difficulty === diff)
                      if (match) setSelectedCharacter(match.id)
                    }}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all",
                      isSelected
                        ? `${cfg.bgColor} ${cfg.borderColor} ${cfg.color}`
                        : "bg-white/[0.03] border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                    )}
                  >
                    <p className="text-sm font-semibold">{cfg.label}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step 2: Character card (auto-selected by difficulty) */}
          {character && (
            <div className={cn(
              "p-4 rounded-xl border transition-all",
              diffConfig ? `${diffConfig.bgColor} ${diffConfig.borderColor}` : "bg-white/[0.03] border-white/10"
            )}>
              <div className="flex items-start gap-4">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-lg", character.color)}>
                  {character.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white">{character.name}</p>
                    <Badge variant="outline" className={cn("text-xs border-0", diffConfig?.bgColor, diffConfig?.color)}>
                      {DIFFICULTY_CONFIG[character.difficulty].label}
                    </Badge>
                  </div>
                  <p className="text-sm text-white/50 mt-0.5">{character.role} · {character.company}</p>
                  <p className="text-sm text-white/70 mt-2">{character.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {character.traits.map((t) => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50 border border-white/10">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tip */}
          {character && (
            <div className="text-xs text-white/35 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 space-y-1">
              <p className="font-medium text-white/50">Tips for a good cold call</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Open with a pattern interrupt — skip "How are you?"</li>
                <li>Ask permission early: "Did I catch you at a bad time?"</li>
                <li>Lead with the problem you solve, not your product</li>
                <li>Ask at least one discovery question before pitching</li>
                <li>Always end with a specific meeting ask</li>
              </ul>
            </div>
          )}

          <Button
            onClick={startCall}
            disabled={!selectedCharacter || callsRemaining === 0}
            className="w-full bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white font-semibold"
            size="lg"
          >
            <Phone className="h-4 w-4 mr-2" />
            Dial {character?.name ?? "a prospect"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* ── CALLING VIEW ───────────────────────────────────────────────── */}
      {view === "calling" && character && (
        <div className="space-y-4">
          {/* Call status bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0", character.color)}>
                  {character.initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[hsl(240,10%,8%)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">{character.name}</p>
                <p className="text-xs text-white/40 leading-tight">{character.role} · {character.company}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-white/50">{formatTime(callSeconds)}</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={endCall}
                disabled={isEndingCall}
                className="gap-1.5"
              >
                <PhoneOff className="h-3.5 w-3.5" />
                Hang Up
              </Button>
            </div>
          </div>

          {/* Conversation */}
          <div className="h-[360px] overflow-y-auto space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-[hsl(100,78%,44%)] text-white rounded-br-sm"
                      : "bg-white/[0.07] text-white/80 rounded-bl-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-white/[0.07] px-3.5 py-2.5 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type what you'd say on the call… (Enter to send)"
              className="resize-none min-h-[60px] max-h-[140px] bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-white/20"
              rows={2}
              disabled={isSending}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isSending}
              size="icon"
              className="h-[60px] w-11 shrink-0 bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[11px] text-white/25 text-center">
            Shift+Enter for new line · Enter to send
          </p>
        </div>
      )}

      {/* ── SCORING VIEW ───────────────────────────────────────────────── */}
      {view === "scoring" && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[hsl(100,78%,44%)] animate-spin" />
          <p className="text-sm text-white/50">Analyzing your call…</p>
          <p className="text-xs text-white/30">Our coach is reviewing your technique</p>
        </div>
      )}

      {/* ── RESULTS VIEW ───────────────────────────────────────────────── */}
      {view === "results" && character && score !== null && (
        <div className="space-y-5">
          {/* Score header */}
          <div className="text-center py-6 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm", character.color)}>
                {character.initials}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">{character.name}</p>
                <p className="text-xs text-white/40">{character.company}</p>
              </div>
            </div>
            <div className={cn(
              "text-5xl font-bold tabular-nums",
              score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"
            )}>
              {score}
            </div>
            <p className="text-sm text-white/50">out of 100</p>
            <p className={cn(
              "text-sm font-medium mt-1",
              score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"
            )}>
              {score >= 80 ? "Excellent — booking material" : score >= 60 ? "Good — a few things to sharpen" : score >= 40 ? "Decent start — keep practicing" : "Back to basics — study the tips above"}
            </p>
          </div>

          {/* Score breakdown */}
          {scoringBreakdown && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider px-0.5">Score Breakdown</p>
              {(Object.entries(scoringBreakdown) as [keyof ScoringBreakdown, ScoringCriterion][]).map(([key, criterion]) => (
                <div
                  key={key}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border text-sm",
                    criterion.passed
                      ? "bg-emerald-500/[0.06] border-emerald-500/20"
                      : "bg-white/[0.02] border-white/[0.06]"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold",
                    criterion.passed ? "bg-emerald-500 text-white" : "bg-white/10 text-white/30"
                  )}>
                    {criterion.passed ? "✓" : "✗"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("font-medium", criterion.passed ? "text-white/80" : "text-white/40")}>
                        {CRITERIA_LABELS[key]}
                      </p>
                      <span className={cn("text-xs font-mono shrink-0", criterion.passed ? "text-emerald-400" : "text-white/25")}>
                        +{criterion.points}/{criterion.maxPoints}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">{criterion.note}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Coach feedback */}
          {feedback && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1.5">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Coach Feedback</p>
              <p className="text-sm text-white/70 leading-relaxed">{feedback}</p>
            </div>
          )}

          {/* Call transcript */}
          <details className="group">
            <summary className="text-xs text-white/30 cursor-pointer hover:text-white/50 transition-colors select-none">
              View call transcript
            </summary>
            <div className="mt-3 h-48 overflow-y-auto space-y-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              {messages.map((msg, i) => (
                <p key={i} className="text-xs text-white/50 leading-relaxed">
                  <span className={cn("font-semibold", msg.role === "user" ? "text-[hsl(100,78%,44%)]" : "text-white/30")}>
                    {msg.role === "user" ? "You" : character.name}:
                  </span>{" "}
                  {msg.content}
                </p>
              ))}
            </div>
          </details>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={resetToSetup}
              variant="outline"
              className="flex-1 border-white/10 text-white/70 hover:bg-white/[0.05] hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-2" />
              Practice Again
            </Button>
            {selectedDifficulty !== "hard" && callsRemaining > 0 && (
              <Button
                onClick={() => {
                  const difficulties: Difficulty[] = ["easy", "medium", "hard"]
                  const currentIdx = difficulties.indexOf(selectedDifficulty ?? "easy")
                  const next = difficulties[currentIdx + 1]
                  if (next) {
                    setSelectedDifficulty(next)
                    const match = Object.values(CHARACTERS).find((c) => c.difficulty === next)
                    if (match) setSelectedCharacter(match.id)
                    setMessages([])
                    setScore(null)
                    setFeedback(null)
                    setScoringBreakdown(null)
                    setMockCallId(null)
                    startCall()
                  }
                }}
                className="flex-1 bg-white/[0.06] hover:bg-white/10 text-white/70 border border-white/10"
              >
                <Trophy className="h-3.5 w-3.5 mr-2" />
                Try Harder
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
