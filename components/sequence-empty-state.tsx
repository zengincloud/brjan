"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { Mail, Phone, Linkedin, CheckSquare, Plus, Send, BookOpen, Sparkles } from "lucide-react"
import type { StepType } from "@/components/sequence-step-card"

export const STEP_TYPE_OPTIONS: { type: StepType; label: string; icon: any }[] = [
  { type: "email", label: "Manual email", icon: Mail },
  { type: "call", label: "Phone call", icon: Phone },
  { type: "linkedin", label: "LinkedIn", icon: Linkedin },
  { type: "task", label: "Action item", icon: CheckSquare },
]

export function AddStepMenu({
  onAddStep,
  disabled,
  compact,
}: {
  onAddStep: (type: StepType) => void
  disabled?: boolean
  compact?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex justify-center">
          {compact ? (
            <button
              disabled={disabled}
              title="Insert a step here"
              className="h-6 w-6 rounded-full border border-dashed border-border text-muted-foreground flex items-center justify-center hover:border-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Button className="gap-2" disabled={disabled}>
              <Plus className="h-4 w-4" />
              Add a step
            </Button>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {STEP_TYPE_OPTIONS.map((opt) => (
          <DropdownMenuItem key={opt.type} onClick={() => onAddStep(opt.type)}>
            <opt.icon className="h-4 w-4 mr-2" />
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SequenceEmptyState({ onAddStep }: { onAddStep: (type: StepType) => void }) {
  const { toast } = useToast()
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <Send className="h-12 w-12 -rotate-45 text-muted-foreground" />
      <div>
        <p className="font-medium">Your sequence is empty</p>
        <p className="text-sm text-muted-foreground">Add steps to build your sequence</p>
      </div>
      <AddStepMenu onAddStep={onAddStep} />
      <p className="text-xs text-muted-foreground">Or</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => toast({ title: "Coming soon", description: "A sequence template library isn't wired up yet." })}
        >
          <BookOpen className="h-4 w-4" />
          Select a template
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => toast({ title: "Coming soon", description: "AI-assisted sequence generation isn't wired up yet." })}
        >
          <Sparkles className="h-4 w-4" />
          AI-Assisted Sequence
        </Button>
      </div>
    </div>
  )
}
