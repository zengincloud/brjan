"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  ChevronRight,
  ChevronsUpDown,
  ChevronsDownUp,
  ArrowLeft,
  Save,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@/hooks/use-user"
import { TrialLimitBanner } from "@/components/trial-limit-banner"
import { TRIAL_LIMITS } from "@/lib/trial-limits"
import { SequenceStepCard, type SequenceStep, type StepType } from "@/components/sequence-step-card"
import { SequenceEmptyState, AddStepMenu, STEP_TYPE_OPTIONS } from "@/components/sequence-empty-state"

export default function NewSequencePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [steps, setSteps] = useState<SequenceStep[]>([])
  const [collapsedIndexes, setCollapsedIndexes] = useState<Set<number>>(new Set())
  const [templates, setTemplates] = useState<{ id: string; name: string; subject: string; body: string }[]>([])
  const [existingSequenceCount, setExistingSequenceCount] = useState<number | null>(null)

  const isTrial = user?.tier === 'trial' && user?.role !== 'super_admin'
  const atSequenceLimit = isTrial && existingSequenceCount !== null && existingSequenceCount >= TRIAL_LIMITS.sequences
  const atStepLimit = isTrial && steps.length >= TRIAL_LIMITS.sequenceSteps

  useEffect(() => {
    fetch("/api/email-templates")
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((d) => setTemplates(d.templates || []))
      .catch(() => {})

    fetch("/api/sequences")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.sequences) setExistingSequenceCount(d.sequences.length) })
      .catch(() => {})
  }, [])

  const addStep = (type: StepType, afterIndex?: number) => {
    if (atStepLimit) return
    setSteps((prev) => {
      const newStep: SequenceStep = {
        type,
        name: STEP_TYPE_OPTIONS.find((o) => o.type === type)?.label || type,
        order: 0,
        delayDays: prev.length === 0 ? 0 : 1,
        delayHours: 0,
        priority: "medium",
      }
      const insertAt = afterIndex === undefined ? prev.length : afterIndex + 1
      const updated = [...prev.slice(0, insertAt), newStep, ...prev.slice(insertAt)]
      return updated.map((s, i) => ({ ...s, order: i }))
    })
  }

  const updateStep = (index: number, patch: Partial<SequenceStep>) => {
    setSteps((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...patch }
      return updated
    })
  }

  const deleteStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })))
  }

  const moveStep = (index: number, direction: "up" | "down") => {
    setSteps((prev) => {
      if ((direction === "up" && index === 0) || (direction === "down" && index === prev.length - 1)) return prev
      const updated = [...prev]
      const target = direction === "up" ? index - 1 : index + 1
      ;[updated[index], updated[target]] = [updated[target], updated[index]]
      return updated.map((s, i) => ({ ...s, order: i }))
    })
  }

  const toggleCollapse = (index: number) => {
    setCollapsedIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const collapseAll = () => setCollapsedIndexes(new Set(steps.map((_, i) => i)))
  const expandAll = () => setCollapsedIndexes(new Set())
  const allCollapsed = steps.length > 0 && collapsedIndexes.size === steps.length

  const saveSequence = async () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Sequence name is required", variant: "destructive" })
      return
    }
    if (steps.length === 0) {
      toast({ title: "Error", description: "Add at least one step to the sequence", variant: "destructive" })
      return
    }

    try {
      setSaving(true)
      const response = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, steps }),
      })

      if (!response.ok) throw new Error("Failed to create sequence")

      const data = await response.json()
      toast({ title: "Success", description: "Sequence created successfully" })
      router.push(`/sequences/${data.sequence.id}`)
    } catch (error: any) {
      console.error(error)
      toast({ title: "Error", description: "Failed to create sequence", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button onClick={() => router.push("/sequences")} className="hover:text-foreground">Sequences</button>
        <span>/</span>
        <span className="text-foreground font-medium">{name || "New sequence"}</span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.push("/sequences")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this sequence"
          className="text-xl font-semibold h-10 max-w-sm"
        />
        <Button onClick={saveSequence} disabled={saving || atSequenceLimit} className="ml-auto">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Sequence"}
        </Button>
      </div>

      {atSequenceLimit && (
        <TrialLimitBanner current={existingSequenceCount!} limit={TRIAL_LIMITS.sequences} resourceLabel="sequences" />
      )}

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this sequence for? (optional)"
          rows={2}
          className="max-w-xl"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Badge variant="outline" className="gap-1 font-normal">
          {steps.length} step{steps.length === 1 ? "" : "s"}
          <ChevronRight className="h-3 w-3" />
        </Badge>
        {steps.length > 0 && (
          <Button variant="outline" size="sm" onClick={allCollapsed ? expandAll : collapseAll}>
            {allCollapsed ? <ChevronsUpDown className="h-4 w-4 mr-2" /> : <ChevronsDownUp className="h-4 w-4 mr-2" />}
            {allCollapsed ? "Expand" : "Collapse"} steps
          </Button>
        )}
      </div>

      {isTrial && (
        <TrialLimitBanner current={steps.length} limit={TRIAL_LIMITS.sequenceSteps} resourceLabel="steps" />
      )}

      {steps.length === 0 ? (
        <SequenceEmptyState onAddStep={addStep} />
      ) : (
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={index}>
              <SequenceStepCard
                step={step}
                index={index}
                totalSteps={steps.length}
                templates={templates}
                collapsed={collapsedIndexes.has(index)}
                onToggleCollapse={() => toggleCollapse(index)}
                onUpdate={(patch) => updateStep(index, patch)}
                onDelete={() => deleteStep(index)}
                onMove={(dir) => moveStep(index, dir)}
              />
              {index < steps.length - 1 && (
                <div className="flex justify-center py-2">
                  <AddStepMenu onAddStep={(type) => addStep(type, index)} compact disabled={atStepLimit} />
                </div>
              )}
            </div>
          ))}
          <div className="w-px h-3 border-l border-dotted border-border mx-auto" />
          <AddStepMenu onAddStep={addStep} disabled={atStepLimit} />
        </div>
      )}
    </div>
  )
}
