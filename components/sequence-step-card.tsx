"use client"

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RichTextEditor } from "@/components/rich-text-editor"
import { TEMPLATE_VARIABLES } from "@/lib/template-variables"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import {
  Mail,
  Phone,
  Linkedin,
  CheckSquare,
  Clock,
  Maximize2,
  Minimize2,
  ArrowUp,
  ArrowDown,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  Settings,
  Sparkles,
  Braces,
  Keyboard,
  Monitor,
  Smartphone,
  RefreshCw,
  FileText,
  Info,
  Plus,
  Loader2,
} from "lucide-react"

export type StepType = "email" | "call" | "linkedin" | "task" | "wait"

export type SequenceStep = {
  id?: string
  type: StepType
  name: string
  order: number
  delayDays: number
  delayHours: number
  emailSubject?: string | null
  emailBody?: string | null
  callScript?: string | null
  taskNotes?: string | null
  priority?: string | null
  skipAfterDays?: number | null
  /** UI-only for now — not persisted (no backing column yet, see PR notes). */
  enabled?: boolean
}

type EmailTemplate = {
  id: string
  name: string
  subject: string
  body: string
}

const STEP_META: Record<StepType, { icon: any; label: string }> = {
  email: { icon: Mail, label: "Manual email" },
  call: { icon: Phone, label: "Phone call" },
  linkedin: { icon: Linkedin, label: "LinkedIn" },
  task: { icon: CheckSquare, label: "Action item" },
  wait: { icon: Clock, label: "Wait" },
}

function delaySummary(step: SequenceStep) {
  if (step.delayDays === 0 && step.delayHours === 0) {
    return "Schedules task immediately with due date in 30 minutes"
  }
  const parts = []
  if (step.delayDays > 0) parts.push(`${step.delayDays} day${step.delayDays === 1 ? "" : "s"}`)
  if (step.delayHours > 0) parts.push(`${step.delayHours} hour${step.delayHours === 1 ? "" : "s"}`)
  return `Schedules task immediately with due date in ${parts.join(" ")}`
}

function DelayEditor({
  step,
  onChange,
  children,
}: {
  step: SequenceStep
  onChange: (patch: Partial<SequenceStep>) => void
  children: ReactNode
}) {
  const presets: [string, number, number][] = [
    ["Now", 0, 0],
    ["2h", 0, 2],
    ["4h", 0, 4],
    ["1d", 1, 0],
    ["2d", 2, 0],
    ["3d", 3, 0],
    ["1w", 7, 0],
  ]
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-72" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-medium mb-1">When should this step run?</p>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Days</label>
              <Input
                type="number"
                min={0}
                value={step.delayDays}
                onChange={(e) => onChange({ delayDays: Math.max(0, parseInt(e.target.value) || 0) })}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Hours</label>
              <Input
                type="number"
                min={0}
                max={23}
                value={step.delayHours}
                onChange={(e) => onChange({ delayHours: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) })}
              />
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            {presets.map(([label, d, h]) => (
              <Button
                key={label}
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => onChange({ delayDays: d, delayHours: h })}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function SequenceStepCard({
  step,
  index,
  totalSteps,
  templates,
  collapsed,
  onToggleCollapse,
  onUpdate,
  onDelete,
  onMove,
}: {
  step: SequenceStep
  index: number
  totalSteps: number
  templates: EmailTemplate[]
  collapsed: boolean
  onToggleCollapse: () => void
  onUpdate: (patch: Partial<SequenceStep>) => void
  onDelete: () => void
  onMove: (direction: "up" | "down") => void
}) {
  const { toast } = useToast()
  const meta = STEP_META[step.type]
  const Icon = meta.icon
  const stepEnabled = step.enabled !== false

  const [showPreviewPanel, setShowPreviewPanel] = useState(true)
  const [contentMode, setContentMode] = useState<"assisted" | "prompt" | "template">("assisted")
  const [emailKind, setEmailKind] = useState<"Outreach" | "Follow-up" | "Last pitch">("Outreach")
  const [tone, setTone] = useState("Default")
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [guidelines, setGuidelines] = useState("")
  const [aiPrompt, setAiPrompt] = useState("")
  const [research, setResearch] = useState<string[]>(["Executive Persona Research", "Strategic Company Research"])
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<{ subject?: string; body: string } | null>(null)
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop")

  const researchOptions = [
    "Recent company news",
    "Relevant job postings",
    "Executive Persona Research",
    "Strategic Company Research",
  ]

  const toggleResearch = (label: string) => {
    setResearch((r) => (r.includes(label) ? r.filter((x) => x !== label) : [...r, label]))
  }

  const insertVariable = (variable: string, field: "callScript" | "taskNotes") => {
    onUpdate({ [field]: `${step[field] || ""}${variable}` })
  }

  const loadTemplate = (templateId: string) => {
    const t = templates.find((t) => t.id === templateId)
    if (t) {
      onUpdate({ emailSubject: t.subject, emailBody: t.body })
      toast({ title: "Template loaded", description: `"${t.name}" applied to this step` })
    }
  }

  const generateAiContent = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/sequences/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepType: step.type,
          tone,
          guidelines: guidelines || aiPrompt,
          stepName: step.name,
        }),
      })
      if (!res.ok) throw new Error("Failed to generate")
      const data = await res.json()
      if (step.type === "email") {
        onUpdate({ emailSubject: data.subject, emailBody: data.body })
        setPreview({ subject: data.subject, body: data.body })
      } else if (step.type === "call") {
        onUpdate({ callScript: data.note })
      } else {
        onUpdate({ taskNotes: data.note })
      }
      toast({ title: "Draft generated", description: "AI content applied to this step" })
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Failed to generate AI content", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  const showRightPanel = step.type === "email" && showPreviewPanel

  return (
    <div className="relative">
      {/* Floating delay connector above the card */}
      {step.type !== "wait" && (
        <div className="flex flex-col items-center mb-2">
          <DelayEditor step={step} onChange={onUpdate}>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-secondary/40 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Clock className="h-3 w-3" />
              {delaySummary(step)}
              <Pencil className="h-3 w-3" />
            </button>
          </DelayEditor>
          <div className="w-px h-3 border-l border-dotted border-border" />
        </div>
      )}

      <div className={cn("rounded-xl border border-border bg-card overflow-hidden", !stepEnabled && "opacity-60")}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Switch
            checked={stepEnabled}
            onCheckedChange={(checked) => onUpdate({ enabled: checked })}
            title="Enable/disable this step"
          />
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <button className="font-semibold text-sm text-left" onClick={onToggleCollapse}>
            Step {index + 1}: {meta.label}
          </button>

          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            {step.type !== "wait" && (
              <DelayEditor step={step} onChange={onUpdate}>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="hidden sm:flex items-center gap-1.5 hover:text-foreground"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>{delaySummary(step)}</span>
                  <Pencil className="h-3 w-3" />
                </button>
              </DelayEditor>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMove("up")
              }}
              disabled={index === 0}
              title="Move up"
              className="hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMove("down")
              }}
              disabled={index === totalSteps - 1}
              title="Move down"
              className="hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              title="Delete step"
              className="hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={onToggleCollapse} className="hover:text-foreground">
              {collapsed ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="p-4 space-y-4">
            {/* Name / variant row */}
            <div className="flex items-center gap-2">
              <Input
                value={step.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="h-7 w-40 text-xs font-medium"
              />
              <Badge className="bg-primary/15 text-primary border-0 text-[10px]">Active</Badge>
              {(step.type === "email" || step.type === "call") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => toast({ title: "Coming soon", description: "A/B test variants aren't wired up yet." })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add test
                </Button>
              )}
              {step.type === "email" && (
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={!preview}
                    onClick={() => toast({ title: "Coming soon", description: "Sending test emails isn't wired up yet." })}
                  >
                    Send me a test mail
                  </Button>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    title={showPreviewPanel ? "Hide preview panel" : "Show preview panel"}
                    onClick={() => setShowPreviewPanel((v) => !v)}
                  >
                    {showPreviewPanel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    title="Preview settings"
                    onClick={() => toast({ title: "Coming soon" })}
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className={cn("grid gap-6", showRightPanel ? "lg:grid-cols-2" : "grid-cols-1")}>
              {/* LEFT: content editor */}
              <div className="space-y-4">
                {step.type === "email" && (
                  <>
                    <Tabs value={contentMode} onValueChange={(v) => setContentMode(v as any)}>
                      <TabsList>
                        <TabsTrigger value="assisted">Assisted</TabsTrigger>
                        <TabsTrigger value="prompt">Prompt</TabsTrigger>
                        <TabsTrigger value="template">Template</TabsTrigger>
                      </TabsList>

                      <TabsContent value="assisted" className="space-y-4 mt-4">
                        <div>
                          <p className="text-xs font-medium mb-2">Choose the email type</p>
                          <div className="flex gap-1">
                            {(["Outreach", "Follow-up", "Last pitch"] as const).map((k) => (
                              <Button
                                key={k}
                                variant={emailKind === k ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setEmailKind(k)}
                              >
                                {k}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-2">Personalize with AI Research</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {researchOptions.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => toggleResearch(opt)}
                                className={cn(
                                  "px-2 py-1 rounded text-xs border flex items-center gap-1",
                                  research.includes(opt)
                                    ? "bg-primary/15 border-primary/40 text-primary"
                                    : "bg-secondary/50 border-border text-muted-foreground"
                                )}
                              >
                                {research.includes(opt) && "✓ "}
                                {opt}
                              </button>
                            ))}
                            <button
                              className="px-2 py-1 rounded text-xs border border-dashed border-border text-muted-foreground flex items-center gap-1"
                              onClick={() => toast({ title: "Coming soon" })}
                            >
                              <Plus className="h-3 w-3" /> Add
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-2">Set your tone</p>
                          <div className="flex gap-1 flex-wrap">
                            {["Default", "Direct", "Formal", "Casual", "Creative", "Custom"].map((t) => (
                              <Button
                                key={t}
                                variant={tone === t ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setTone(t)}
                              >
                                {t}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium mb-2">Set your guidelines</p>
                          {showGuidelines ? (
                            <Textarea
                              autoFocus
                              value={guidelines}
                              onChange={(e) => setGuidelines(e.target.value)}
                              placeholder="e.g. Keep it under 80 words, always mention our case study..."
                              rows={2}
                              className="text-xs"
                            />
                          ) : (
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowGuidelines(true)}>
                              <Plus className="h-3 w-3" />
                              Add guidelines
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <Badge variant="secondary" className="gap-1 font-normal text-[11px]">
                            Standard · 1 credit
                          </Badge>
                          <Button size="sm" className="gap-2" onClick={generateAiContent} disabled={generating}>
                            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            {generating ? "Generating..." : "Generate preview"}
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="prompt" className="space-y-3 mt-4">
                        <Textarea
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="Describe what you want this email to say..."
                          rows={4}
                        />
                        <div className="flex justify-end">
                          <Button size="sm" className="gap-2" onClick={generateAiContent} disabled={generating}>
                            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            {generating ? "Generating..." : "Generate preview"}
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="template" className="space-y-3 mt-4">
                        {templates.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No saved templates yet.</p>
                        ) : (
                          <Select onValueChange={loadTemplate}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a template..." />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    {t.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TabsContent>
                    </Tabs>

                    <div className="space-y-2 pt-2 border-t border-border">
                      <p className="text-xs font-medium">Email content</p>
                      <Input
                        value={step.emailSubject || ""}
                        onChange={(e) => onUpdate({ emailSubject: e.target.value })}
                        placeholder="Subject line"
                      />
                      <RichTextEditor
                        content={step.emailBody || ""}
                        onChange={(content) => onUpdate({ emailBody: content })}
                        placeholder="Write your email..."
                        minHeight="160px"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Variables: {TEMPLATE_VARIABLES.map((v) => v.variable).join(", ")}
                      </p>
                    </div>
                  </>
                )}

                {step.type === "call" && (
                  <>
                    <div>
                      <label className="text-xs font-medium">
                        Task priority<span className="text-destructive">*</span>
                      </label>
                      <Select value={step.priority || "medium"} onValueChange={(v) => onUpdate({ priority: v })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-medium">Task note</label>
                      <Textarea
                        value={step.callScript || ""}
                        onChange={(e) => onUpdate({ callScript: e.target.value })}
                        placeholder="e.g. Ask prospects about their pain points and share our compatibility case study with them"
                        rows={6}
                        className="mt-1"
                      />
                      <div className="mt-2 space-y-1.5">
                        <p className="text-xs font-medium">Write with AI</p>
                        <Button variant="outline" size="sm" className="gap-2" onClick={generateAiContent} disabled={generating}>
                          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          Personalized call guide
                        </Button>
                      </div>
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Insert variable">
                              <Braces className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {TEMPLATE_VARIABLES.map((v) => (
                              <DropdownMenuItem key={v.variable} onClick={() => insertVariable(v.variable, "callScript")}>
                                {v.label} — {v.variable}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Keyboard shortcuts">
                              <Keyboard className="h-3.5 w-3.5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 text-xs space-y-1">
                            <p className="font-medium mb-1">Shortcuts</p>
                            <p>⌘+Enter — Save changes</p>
                            <p>{"{{ }}"} — Insert variable</p>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <SkipTasksControl step={step} onUpdate={onUpdate} />
                  </>
                )}

                {step.type === "linkedin" && (
                  <>
                    <div>
                      <label className="text-xs font-medium">
                        Task priority<span className="text-destructive">*</span>
                      </label>
                      <Select value={step.priority || "medium"} onValueChange={(v) => onUpdate({ priority: v })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Task note</label>
                      <Textarea
                        value={step.taskNotes || ""}
                        onChange={(e) => onUpdate({ taskNotes: e.target.value })}
                        placeholder="e.g. Reach out to the prospect on LinkedIn and reference their recent post"
                        rows={5}
                        className="mt-1"
                      />
                      <div className="mt-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={generateAiContent} disabled={generating}>
                          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          Personalized message
                        </Button>
                      </div>
                    </div>
                    <SkipTasksControl step={step} onUpdate={onUpdate} />
                  </>
                )}

                {step.type === "task" && (
                  <>
                    <div>
                      <label className="text-xs font-medium">
                        Task priority<span className="text-destructive">*</span>
                      </label>
                      <Select value={step.priority || "medium"} onValueChange={(v) => onUpdate({ priority: v })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Task note</label>
                      <Textarea
                        value={step.taskNotes || ""}
                        onChange={(e) => onUpdate({ taskNotes: e.target.value })}
                        placeholder="e.g. Ask prospects about their pain points and share our compatibility case study with them"
                        rows={8}
                        className="mt-1"
                      />
                    </div>
                    <SkipTasksControl step={step} onUpdate={onUpdate} />
                  </>
                )}
              </div>

              {/* RIGHT: generic preview */}
              {showRightPanel && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">Preview</label>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground"
                        title="Refresh preview"
                        onClick={generateAiContent}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          className={cn("p-1.5 rounded border border-border", device === "desktop" ? "bg-secondary" : "text-muted-foreground")}
                          onClick={() => setDevice("desktop")}
                        >
                          <Monitor className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className={cn("p-1.5 rounded border border-border", device === "mobile" ? "bg-secondary" : "text-muted-foreground")}
                          onClick={() => setDevice("mobile")}
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {preview && (
                    <div className={cn("rounded-lg border border-border overflow-hidden", device === "mobile" && "max-w-[320px] mx-auto")}>
                      <div className="p-3 space-y-1 text-xs border-b border-border bg-secondary/20">
                        <p><span className="text-muted-foreground">To:</span> bob@boilerroom.ai</p>
                        <p><span className="text-muted-foreground">Subject:</span> {preview.subject}</p>
                      </div>
                      <div
                        className="p-3 text-sm prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: preview.body }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {step.type === "email" && (
              <div className="flex items-center justify-between pt-3 border-t border-border text-[11px] text-muted-foreground">
                <label className="flex items-center gap-2">
                  <Checkbox defaultChecked />
                  Include signature
                </label>
                <div className="flex items-center gap-3">
                  <span>· Scheduled</span>
                  <span>· Delivered</span>
                  <span>· Bounce</span>
                  <span>· Spam Blocked</span>
                  <span>· Reply</span>
                  <span>· Interested</span>
                  <span>· Opt out</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SkipTasksControl({ step, onUpdate }: { step: SequenceStep; onUpdate: (patch: Partial<SequenceStep>) => void }) {
  const enabled = step.skipAfterDays != null
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2 pt-2 border-t border-border text-xs">
        <Checkbox
          checked={enabled}
          onCheckedChange={(checked) => onUpdate({ skipAfterDays: checked ? 0 : null })}
        />
        <span>Skip tasks</span>
        <Input
          type="number"
          min={0}
          disabled={!enabled}
          value={step.skipAfterDays ?? 0}
          onChange={(e) => onUpdate({ skipAfterDays: Math.max(0, parseInt(e.target.value) || 0) })}
          className="h-7 w-16"
        />
        <span>days after due date</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-64 text-xs">
            If this task is still incomplete N days after its due date, it gets marked skipped and the
            contact automatically moves to the next step — so a stale overdue task doesn't block the
            sequence forever.
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
