"use client"

import { useState, useEffect, useRef } from "react"
import { Phone, PhoneOff, Trophy, RotateCcw, Mic, Clock, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Types ───────────────────────────────────────────────────────────────────

type Difficulty = "easy" | "medium" | "hard"
type View = "setup" | "calling" | "scoring" | "results"
type CallStatus = "connecting" | "listening" | "thinking" | "speaking"
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

type HistoryCall = {
  id: string
  difficulty: string
  character: string
  whatYouSell: string | null
  score: number | null
  feedback: string | null
  scoringBreakdown: ScoringBreakdown | null
  status: string
  createdAt: string
}

type HistoryCallDetail = HistoryCall & {
  messages: Message[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CHARACTERS = {
  mike_reynolds: {
    id: "mike_reynolds",
    name: "Sheldon Cooper",
    role: "Marketing Manager",
    company: "Launchpad Co.",
    initials: "SC",
    image: "/sheldon.jpg",
    difficulty: "easy" as Difficulty,
    description: "Friendly and open. Gives you a fair shot — but still needs to see the value.",
    traits: ["Has 3 minutes", "Curious by nature", "One soft objection"],
    tip: "Lead with a problem, not a product. He responds well to confidence and brevity. Handle his 'not a priority' objection with a specific reason why now — vague reassurance won't cut it.",
    sampleQuestion: "Quick question — how are you currently handling [the problem you solve]?",
    avatarClass: "from-emerald-400 to-emerald-600",
    dotClass: "bg-emerald-500",
  },
  jessica_park: {
    id: "jessica_park",
    name: "Adele Adkins",
    role: "VP of Sales",
    company: "GrowthForce",
    initials: "AA",
    image: "/adele.webp",
    difficulty: "medium" as Difficulty,
    description: "Busy and results-focused. No fluff — lead with proof or lose her.",
    traits: ["Results over features", "Two objections", "Wants hard numbers"],
    tip: "She'll shut you down if you pitch without understanding her situation. Skip buzzwords — lead with a measurable outcome. When she objects, give her specifics, not promises.",
    sampleQuestion: "Before I go further — what does your current process for [relevant area] look like?",
    avatarClass: "from-amber-400 to-amber-600",
    dotClass: "bg-amber-500",
  },
  derek_walsh: {
    id: "derek_walsh",
    name: "Paddy Pimblett",
    role: "Chief Revenue Officer",
    company: "Enterprise Corp",
    initials: "PP",
    image: "/paddy.jpg",
    difficulty: "hard" as Difficulty,
    description: "Hostile to cold calls. Locked-in vendor, high BS radar, no patience.",
    traits: ["Locked-in contract", "Three objections", "Almost impossible"],
    tip: "He will try to end the call in the first 10 seconds. Your only goal early on is to say something specific enough to earn 30 more. Never ramble, never be vague — one weak answer and he's gone.",
    sampleQuestion: "I'll keep it short — are you currently using anything for [specific problem]?",
    avatarClass: "from-red-400 to-red-600",
    dotClass: "bg-red-500",
  },
}

const DIFFICULTY_BY_ID: Record<Difficulty, keyof typeof CHARACTERS> = {
  easy: "mike_reynolds",
  medium: "jessica_park",
  hard: "derek_walsh",
}

const DIFF_STYLE: Record<Difficulty, { label: string; pill: string; activeBg: string; activeBorder: string; dot: string }> = {
  easy:   { label: "Easy",   pill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", activeBg: "bg-emerald-500/10", activeBorder: "border-emerald-500/40", dot: "bg-emerald-500" },
  medium: { label: "Medium", pill: "bg-amber-500/10 text-amber-400 border-amber-500/30",       activeBg: "bg-amber-500/10",   activeBorder: "border-amber-500/40",   dot: "bg-amber-500"   },
  hard:   { label: "Hard",   pill: "bg-red-500/10 text-red-400 border-red-500/30",             activeBg: "bg-red-500/10",     activeBorder: "border-red-500/40",     dot: "bg-red-500"     },
}

const CRITERIA_LABELS: Record<keyof ScoringBreakdown, string> = {
  opener:             "Strong Opener",
  permission:         "Asked for Time",
  value_prop:         "Clear Value Prop",
  discovery:          "Discovery Questions",
  objection_handling: "Handled Objections",
  close:              "Asked for Meeting",
}


// ─── Component ───────────────────────────────────────────────────────────────

export default function ColdCallPracticePage() {
  const [view, setView]                         = useState<View>("setup")
  const [tab, setTab]                           = useState<"practice" | "history">("practice")
  const [selectedDifficulty, setSelected]       = useState<Difficulty>("easy")
  const [whatYouSell, setWhatYouSell]           = useState("")
  const [messages, setMessages]                 = useState<Message[]>([])
  const [callStatus, setCallStatus]             = useState<CallStatus>("connecting")
  const [callSeconds, setCallSeconds]           = useState(0)
  const [score, setScore]                       = useState<number | null>(null)
  const [feedback, setFeedback]                 = useState<string | null>(null)
  const [scoringBreakdown, setScoringBreakdown] = useState<ScoringBreakdown | null>(null)
  const [speechSupported, setSpeechSupported]   = useState(true)
  const [isStarting, setIsStarting]             = useState(false)
  const [historyCalls, setHistoryCalls]         = useState<HistoryCall[]>([])
  const [expandedCallId, setExpandedCallId]     = useState<string | null>(null)
  const [expandedDetail, setExpandedDetail]     = useState<HistoryCallDetail | null>(null)
  const [loadingDetail, setLoadingDetail]       = useState(false)

  // Refs that don't need to trigger re-renders
  const isCallActiveRef  = useRef(false)
  const isSpeakingRef    = useRef(false)
  const isProcessingRef  = useRef(false)
  const mockCallIdRef    = useRef<string | null>(null)
  const recognitionRef   = useRef<any>(null)
  const currentAudioRef  = useRef<HTMLAudioElement | null>(null)
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptRef    = useRef<HTMLDivElement>(null)

  const character  = CHARACTERS[DIFFICULTY_BY_ID[selectedDifficulty]]
  const diffStyle  = DIFF_STYLE[selectedDifficulty]

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/mock-calls")
      .then(r => r.json())
      .then(d => { if (d.mockCalls) setHistoryCalls(d.mockCalls.filter((c: HistoryCall) => c.status === "completed")) })
      .catch(() => {})

    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setSpeechSupported(false)
    }
  }, [])

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (view === "calling") {
      timerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setCallSeconds(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [view])

  function formatTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`
  }

  // ── Recognition ───────────────────────────────────────────────────────────

  function buildRecognition(callId: string) {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return null

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = "en-US"

    rec.onresult = async (event: any) => {
      if (!isCallActiveRef.current) return
      const transcript = event.results[0][0].transcript?.trim()
      if (!transcript) return

      isProcessingRef.current = true
      setMessages(prev => [...prev, { role: "user", content: transcript }])
      setCallStatus("thinking")

      try {
        const chatRes = await fetch(`/api/mock-calls/${callId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userMessage: transcript }),
        })
        const { reply } = await chatRes.json()
        if (!reply || !isCallActiveRef.current) {
          isProcessingRef.current = false
          return
        }

        setMessages(prev => [...prev, { role: "prospect", content: reply }])
        isSpeakingRef.current = true
        setCallStatus("speaking")

        const ttsRes = await fetch(`/api/mock-calls/${callId}/speak`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: reply }),
        })

        if (!ttsRes.ok) throw new Error("TTS failed")

        const blob = await ttsRes.blob()
        const url  = URL.createObjectURL(blob)
        const audio = new Audio(url)
        currentAudioRef.current = audio

        const onDone = () => {
          URL.revokeObjectURL(url)
          currentAudioRef.current = null
          isSpeakingRef.current = false
          isProcessingRef.current = false
          if (isCallActiveRef.current) {
            setCallStatus("listening")
            try { rec.start() } catch {}
          }
        }

        audio.onended = onDone
        audio.onerror = onDone
        audio.play()
      } catch {
        isProcessingRef.current = false
        isSpeakingRef.current = false
        if (isCallActiveRef.current) {
          toast.error("Something went wrong.")
          setCallStatus("listening")
          try { rec.start() } catch {}
        }
      }
    }

    rec.onend = () => {
      if (isCallActiveRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
        setCallStatus("listening")
        setTimeout(() => {
          if (isCallActiveRef.current && !isProcessingRef.current) {
            try { rec.start() } catch {}
          }
        }, 150)
      }
    }

    rec.onerror = (event: any) => {
      if (!isCallActiveRef.current) return
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied.")
        endCall()
      }
      // no-speech and aborted are harmless — onend handles restart
    }

    return rec
  }

  // ── History helpers ───────────────────────────────────────────────────────

  async function toggleCallDetail(id: string) {
    if (expandedCallId === id) {
      setExpandedCallId(null)
      setExpandedDetail(null)
      return
    }
    setExpandedCallId(id)
    setExpandedDetail(null)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/mock-calls/${id}`)
      const data = await res.json()
      setExpandedDetail(data.mockCall)
    } catch {
      toast.error("Failed to load call details.")
    } finally {
      setLoadingDetail(false)
    }
  }

  // ── Call flow ─────────────────────────────────────────────────────────────

  async function startCall() {
    if (callsRemaining === 0 || isStarting) return
    setIsStarting(true)

    try {
      const res = await fetch("/api/mock-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulty: selectedDifficulty,
          character: DIFFICULTY_BY_ID[selectedDifficulty],
          whatYouSell: whatYouSell.trim() || null,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Failed to start call. Check your credits.")
        setIsStarting(false)
        return
      }

      const call = data.mockCall
      mockCallIdRef.current = call.id
      setMessages(call.messages as Message[])
      isCallActiveRef.current = true
      setCallStatus("connecting")
      setView("calling")
      setIsStarting(false)

      // Build recognition bound to this callId
      recognitionRef.current = buildRecognition(call.id)

      // Play opener, then start listening
      const opener = (call.messages as Message[])[0]?.content
      if (opener) {
        isSpeakingRef.current = true
        setCallStatus("speaking")

        setTimeout(async () => {
          try {
            const ttsRes = await fetch(`/api/mock-calls/${call.id}/speak`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: opener }),
            })
            if (!ttsRes.ok) throw new Error()
            const blob  = await ttsRes.blob()
            const url   = URL.createObjectURL(blob)
            const audio = new Audio(url)
            currentAudioRef.current = audio

            const onDone = () => {
              URL.revokeObjectURL(url)
              currentAudioRef.current = null
              isSpeakingRef.current = false
              if (isCallActiveRef.current) {
                setCallStatus("listening")
                try { recognitionRef.current?.start() } catch {}
              }
            }
            audio.onended = onDone
            audio.onerror = onDone
            audio.play()
          } catch {
            isSpeakingRef.current = false
            if (isCallActiveRef.current) {
              setCallStatus("listening")
              try { recognitionRef.current?.start() } catch {}
            }
          }
        }, 600)
      } else {
        isSpeakingRef.current = false
        setCallStatus("listening")
        setTimeout(() => { try { recognitionRef.current?.start() } catch {} }, 600)
      }

    } catch {
      toast.error("Something went wrong.")
      setIsStarting(false)
    }
  }

  function endCall() {
    isCallActiveRef.current = false
    isSpeakingRef.current   = false
    isProcessingRef.current = false

    try { recognitionRef.current?.stop() } catch {}
    recognitionRef.current = null

    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }

    const callId = mockCallIdRef.current
    if (!callId) return

    setView("scoring")

    fetch(`/api/mock-calls/${callId}/end`, { method: "POST" })
      .then(r => r.json())
      .then(data => {
        setScore(data.score)
        setFeedback(data.feedback)
        setScoringBreakdown(data.scoringBreakdown)
        // Refresh history list
        fetch("/api/mock-calls")
          .then(r => r.json())
          .then(d => { if (d.mockCalls) setHistoryCalls(d.mockCalls.filter((c: HistoryCall) => c.status === "completed")) })
          .catch(() => {})
        setView("results")
      })
      .catch(() => {
        toast.error("Scoring failed.")
        setView("results")
      })
  }

  function resetToSetup() {
    isCallActiveRef.current = false
    mockCallIdRef.current   = null
    setView("setup")
    setMessages([])
    setCallStatus("connecting")
    setScore(null)
    setFeedback(null)
    setScoringBreakdown(null)
  }

  // ─── HISTORY HELPERS ─────────────────────────────────────────────────────

  const CHARACTER_DISPLAY: Record<string, { name: string; initials: string; image: string; avatarClass: string; dotClass: string }> = {
    mike_reynolds: { name: "Sheldon Cooper",  initials: "SC", image: "/sheldon.jpg", avatarClass: "from-emerald-400 to-emerald-600", dotClass: "bg-emerald-500" },
    jessica_park:  { name: "Adele Adkins",    initials: "AA", image: "/adele.webp",  avatarClass: "from-amber-400 to-amber-600",    dotClass: "bg-amber-500"   },
    derek_walsh:   { name: "Paddy Pimblett",  initials: "PP", image: "/paddy.jpg",   avatarClass: "from-red-400 to-red-600",        dotClass: "bg-red-500"     },
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
  }

  // ─── SETUP VIEW ───────────────────────────────────────────────────────────

  if (view === "setup") {
    return (
      <div className="space-y-4">
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06] w-fit">
          {(["practice", "history"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize",
                tab === t
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              {t === "history" ? `Past Calls${historyCalls.length > 0 ? ` (${historyCalls.length})` : ""}` : "Practice"}
            </button>
          ))}
        </div>

      {tab === "history" ? (
        /* ── HISTORY TAB ──────────────────────────────────────────────── */
        <div className="space-y-2">
          {historyCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Clock className="h-8 w-8 text-white/10 mb-3" />
              <p className="text-sm text-white/40">No completed calls yet</p>
              <p className="text-xs text-white/25 mt-1">Your past sessions will appear here</p>
            </div>
          ) : (
            historyCalls.map(call => {
              const char  = CHARACTER_DISPLAY[call.character] ?? CHARACTER_DISPLAY.mike_reynolds
              const ds    = DIFF_STYLE[(call.difficulty as Difficulty) ?? "easy"]
              const isExp = expandedCallId === call.id

              return (
                <div key={call.id} className="rounded-xl border border-white/[0.07] overflow-hidden">
                  {/* Call summary row */}
                  <button
                    onClick={() => toggleCallDetail(call.id)}
                    className="w-full flex items-center gap-3.5 p-4 text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                      <img src={char.image} alt={char.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white/90">{char.name}</p>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-semibold", ds.pill)}>{ds.label}</span>
                      </div>
                      <p className="text-xs text-white/35 mt-0.5">{formatDate(call.createdAt)}</p>
                      {call.whatYouSell && (
                        <p className="text-xs text-white/25 truncate mt-0.5">{call.whatYouSell}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {call.score !== null && (
                        <div className={cn(
                          "text-lg font-bold tabular-nums",
                          call.score >= 80 ? "text-emerald-400" : call.score >= 50 ? "text-amber-400" : "text-red-400"
                        )}>
                          {call.score}
                          <span className="text-xs font-normal text-white/30">/100</span>
                        </div>
                      )}
                      <ChevronDown className={cn("h-4 w-4 text-white/25 transition-transform", isExp && "rotate-180")} />
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExp && (
                    <div className="border-t border-white/[0.06] p-4 space-y-4 bg-white/[0.01]">
                      {loadingDetail && !expandedDetail ? (
                        <div className="flex items-center gap-2 py-4 justify-center">
                          <div className="w-4 h-4 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
                          <p className="text-xs text-white/30">Loading…</p>
                        </div>
                      ) : expandedDetail ? (
                        <>
                          {/* Coach feedback */}
                          {expandedDetail.feedback && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-medium text-white/35 uppercase tracking-wider">Coach Feedback</p>
                              <p className="text-sm text-white/65 leading-relaxed">{expandedDetail.feedback}</p>
                            </div>
                          )}

                          {/* Scoring breakdown */}
                          {expandedDetail.scoringBreakdown && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-medium text-white/35 uppercase tracking-wider">Score Breakdown</p>
                              {(Object.entries(expandedDetail.scoringBreakdown) as [keyof ScoringBreakdown, ScoringCriterion][]).map(([key, c]) => (
                                <div key={key} className={cn(
                                  "flex items-center gap-3 px-3 py-2 rounded-lg border text-xs",
                                  c.passed ? "bg-emerald-500/[0.06] border-emerald-500/20" : "bg-white/[0.02] border-white/[0.05]"
                                )}>
                                  <div className={cn(
                                    "w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold",
                                    c.passed ? "bg-emerald-500 text-white" : "bg-white/10 text-white/30"
                                  )}>
                                    {c.passed ? "✓" : "✗"}
                                  </div>
                                  <p className={cn("flex-1", c.passed ? "text-white/70" : "text-white/35")}>{CRITERIA_LABELS[key]}</p>
                                  <span className={cn("font-mono shrink-0", c.passed ? "text-emerald-400" : "text-white/20")}>
                                    +{c.points}/{c.maxPoints}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Transcript */}
                          {expandedDetail.messages.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-medium text-white/35 uppercase tracking-wider">Transcript</p>
                              <div className="max-h-52 overflow-y-auto space-y-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                                {expandedDetail.messages.map((msg, i) => (
                                  <p key={i} className="text-xs text-white/50 leading-relaxed">
                                    <span className={cn("font-semibold", msg.role === "user" ? "text-blue-400" : "text-white/30")}>
                                    {msg.role === "user" ? "You" : char.name}:
                                    </span>{" "}
                                    {msg.content}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      ) : (
      <div className="flex rounded-xl border border-white/[0.07] overflow-hidden" style={{ minHeight: 540 }}>

        {/* Left panel — character preview */}
        <div className="w-[260px] shrink-0 flex flex-col items-center p-6 bg-white/[0.02] border-r border-white/[0.06]">
          {/* Avatar */}
          <div className="w-[88px] h-[88px] rounded-full overflow-hidden shrink-0">
            <img src={character.image} alt={character.name} className="w-full h-full object-cover" />
          </div>

          <p className="mt-4 text-[15px] font-semibold text-white text-center leading-tight">{character.name}</p>
          <p className="mt-1 text-xs text-white/50 text-center">{character.role}</p>
          <p className="text-xs text-white/30 text-center">{character.company}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 justify-center mt-3">
            <span className={cn("text-[10px] px-2.5 py-0.5 rounded-full border font-medium", diffStyle.pill)}>
              {diffStyle.label}
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-white/10 bg-white/[0.05] text-white/40">
              Cold Call
            </span>
          </div>

          <p className="mt-4 text-xs text-white/45 text-center leading-relaxed">{character.description}</p>

          {/* Traits */}
          <div className="w-full mt-4 space-y-1.5">
            {character.traits.map(t => (
              <div key={t} className="flex items-center gap-2 text-[11px] text-white/40">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", character.dotClass)} />
                {t}
              </div>
            ))}
          </div>

          {/* Tips box */}
          <div className="w-full mt-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-2.5">
            <p className="text-[10px] font-medium text-white/35 uppercase tracking-wider">Tips</p>
            <p className="text-[11px] text-white/50 leading-relaxed">{character.tip}</p>
            <div className="pt-1 border-t border-white/[0.05]">
              <p className="text-[10px] text-white/30 mb-1">Try asking:</p>
              <p className="text-[11px] text-white/45 italic leading-relaxed">"{character.sampleQuestion}"</p>
            </div>
          </div>

          <div className="flex-1" />

          <p className="text-[10px] text-white/20 text-center mt-2">2 credits per call</p>
        </div>

        {/* Right panel — configuration */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div>
              <h2 className="text-[15px] font-semibold text-white flex items-center gap-2">
                Quick Start <span className="text-white/25">✦</span> Set Up Your Cold Call
              </h2>
              <p className="text-xs text-white/35 mt-0.5">
                These are preset prospects. Customize your pitch below, then start.
              </p>
            </div>

            {/* What you're selling */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
                What are you selling?
              </label>
              <textarea
                value={whatYouSell}
                onChange={e => setWhatYouSell(e.target.value)}
                placeholder="e.g. A B2B SaaS platform that helps sales teams automate outreach and book 3x more meetings…"
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-colors leading-relaxed"
              />
            </div>

            {/* Prospect selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
                Select your prospect
              </label>
              <div className="space-y-2">
                {(Object.values(CHARACTERS) as (typeof CHARACTERS)[keyof typeof CHARACTERS][]).map(char => {
                  const ds        = DIFF_STYLE[char.difficulty]
                  const isSelected = selectedDifficulty === char.difficulty
                  return (
                    <button
                      key={char.id}
                      onClick={() => setSelected(char.difficulty)}
                      className={cn(
                        "w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all",
                        isSelected
                          ? `${ds.activeBg} ${ds.activeBorder}`
                          : "bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.04] hover:border-white/[0.12]"
                      )}
                    >
                      {/* Mini avatar */}
                      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                        <img src={char.image} alt={char.name} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-white/90 leading-tight">{char.name}</p>
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-semibold", ds.pill)}>
                            {ds.label}
                          </span>
                        </div>
                        <p className="text-xs text-white/35 truncate mt-0.5">{char.role} · {char.company}</p>
                      </div>

                      {/* Radio indicator */}
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                        isSelected ? ds.activeBorder : "border-white/20"
                      )}>
                        {isSelected && <div className={cn("w-2 h-2 rounded-full", ds.dot)} />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Browser warning */}
            {!speechSupported && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Voice recognition requires Chrome or Edge. Other browsers are not supported.</span>
              </div>
            )}
          </div>

          {/* Start button — pinned to bottom */}
          <div className="p-4 border-t border-white/[0.06]">
            <Button
              onClick={startCall}
              disabled={!speechSupported || isStarting}
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm"
            >
              <Phone className="h-4 w-4 mr-2" />
              {isStarting ? "Connecting…" : `Start AI Roleplay with ${character.name}`}
            </Button>
          </div>
        </div>
      </div>
      )}
      </div>
    )
  }

  // ─── CALLING VIEW ─────────────────────────────────────────────────────────

  if (view === "calling") {
    return (
      <div className="max-w-md mx-auto flex flex-col" style={{ minHeight: 560 }}>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={cn(
                "w-10 h-10 rounded-full overflow-hidden transition-all",
                callStatus === "speaking" && "ring-2 ring-offset-2 ring-offset-[hsl(240,10%,8%)] ring-white/25 scale-110"
              )}>
                <img src={character.image} alt={character.name} className="w-full h-full object-cover" />
              </div>
              {callStatus === "speaking" && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[hsl(240,10%,8%)] animate-pulse" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{character.name}</p>
              <p className="text-xs text-white/40 leading-tight">{character.role} · {character.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-white/35">{formatTime(callSeconds)}</span>
            <Button variant="destructive" size="sm" onClick={endCall} className="gap-1.5">
              <PhoneOff className="h-3.5 w-3.5" />
              Hang Up
            </Button>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-center gap-2 py-2.5">
          {callStatus === "listening" && (
            <>
              <div className="flex gap-0.5 items-end h-3.5">
                {[60, 100, 80, 100, 70].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-red-400 rounded-full animate-pulse"
                    style={{ height: `${h}%`, animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-red-400 font-medium">Listening…</p>
            </>
          )}
          {callStatus === "speaking" && (
            <>
              <div className="flex gap-0.5 items-end h-3.5">
                {[50, 90, 70, 100, 60].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-emerald-400 rounded-full animate-bounce"
                    style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-emerald-400 font-medium">Speaking…</p>
            </>
          )}
          {callStatus === "thinking" && (
            <p className="text-[11px] text-amber-400 font-medium">Thinking…</p>
          )}
          {callStatus === "connecting" && (
            <p className="text-[11px] text-white/30 font-medium">Connecting…</p>
          )}
        </div>

        {/* Transcript */}
        <div
          ref={transcriptRef}
          className="flex-1 overflow-y-auto space-y-3 py-3 min-h-[280px] max-h-[380px]"
        >
          {messages.length === 0 && (
            <p className="text-xs text-white/20 text-center mt-10">Connecting to {character.name}…</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex items-end gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "prospect" && (
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mb-0.5">
                  <img src={character.image} alt={character.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white/[0.07] text-white/80 rounded-bl-sm"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {callStatus === "thinking" && (
            <div className="flex items-end gap-2 justify-start">
              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mb-0.5">
                <img src={character.image} alt={character.name} className="w-full h-full object-cover" />
              </div>
              <div className="bg-white/[0.07] px-3.5 py-2.5 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mic indicator */}
        <div className="flex flex-col items-center gap-2 pt-4 border-t border-white/[0.06]">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
            callStatus === "listening"
              ? "bg-red-500/15 border-2 border-red-500/40 scale-110"
              : "bg-white/[0.04] border border-white/10"
          )}>
            <Mic className={cn(
              "h-6 w-6 transition-colors",
              callStatus === "listening" ? "text-red-400" : "text-white/20"
            )} />
          </div>
          <p className="text-[11px] text-white/25">
            {callStatus === "listening" ? "Speak naturally — just like a real call" : ""}
          </p>
        </div>
      </div>
    )
  }

  // ─── SCORING VIEW ─────────────────────────────────────────────────────────

  if (view === "scoring") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[hsl(100,78%,44%)] animate-spin" />
        <p className="text-sm text-white/50">Scoring your call…</p>
        <p className="text-xs text-white/30">Our coach is reviewing your technique</p>
      </div>
    )
  }

  // ─── RESULTS VIEW ─────────────────────────────────────────────────────────

  if (view === "results" && score !== null) {
    return (
      <div className="space-y-5 max-w-lg mx-auto">
        {/* Score card */}
        <div className="text-center py-6 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
              <img src={character.image} alt={character.name} className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white">{character.name}</p>
              <p className="text-xs text-white/40">{character.company}</p>
            </div>
          </div>
          <div className={cn("text-5xl font-bold tabular-nums",
            score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"
          )}>
            {score}
          </div>
          <p className="text-sm text-white/50">out of 100</p>
          <p className={cn("text-sm font-medium",
            score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"
          )}>
            {score >= 80 ? "Excellent — booking material" :
             score >= 60 ? "Good — a few things to sharpen" :
             score >= 40 ? "Decent start — keep practicing" :
             "Back to basics — study the framework"}
          </p>
        </div>

        {/* Breakdown */}
        {scoringBreakdown && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Score Breakdown</p>
            {(Object.entries(scoringBreakdown) as [keyof ScoringBreakdown, ScoringCriterion][]).map(([key, c]) => (
              <div key={key} className={cn(
                "flex items-start gap-3 p-3 rounded-lg border text-sm",
                c.passed ? "bg-emerald-500/[0.06] border-emerald-500/20" : "bg-white/[0.02] border-white/[0.06]"
              )}>
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold",
                  c.passed ? "bg-emerald-500 text-white" : "bg-white/10 text-white/30"
                )}>
                  {c.passed ? "✓" : "✗"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("font-medium", c.passed ? "text-white/80" : "text-white/40")}>
                      {CRITERIA_LABELS[key]}
                    </p>
                    <span className={cn("text-xs font-mono shrink-0", c.passed ? "text-emerald-400" : "text-white/25")}>
                      +{c.points}/{c.maxPoints}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">{c.note}</p>
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

        {/* Transcript */}
        <details>
          <summary className="text-xs text-white/30 cursor-pointer hover:text-white/50 transition-colors select-none">
            View call transcript
          </summary>
          <div className="mt-3 h-48 overflow-y-auto space-y-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
            {messages.map((msg, i) => (
              <p key={i} className="text-xs text-white/50 leading-relaxed">
                <span className={cn("font-semibold", msg.role === "user" ? "text-blue-400" : "text-white/30")}>
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
          {selectedDifficulty !== "hard" && (
            <Button
              onClick={() => {
                setSelected(selectedDifficulty === "easy" ? "medium" : "hard")
                resetToSetup()
              }}
              className="flex-1 bg-white/[0.06] hover:bg-white/10 text-white/70 border border-white/10"
            >
              <Trophy className="h-3.5 w-3.5 mr-2" />
              Try Harder
            </Button>
          )}
        </div>
      </div>
    )
  }

  return null
}
