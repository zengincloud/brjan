"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Zap, Mail, Phone, Linkedin, CheckSquare, Clock, ClipboardList } from "lucide-react"
import { toast } from "sonner"

type SequenceStep = {
  id: string
  name: string
  type: string
  order: number
  delayDays: number
  delayHours: number
}

type Sequence = {
  id: string
  name: string
  description?: string
  status: string
  steps: SequenceStep[]
  stats: {
    active: number
    completed: number
    total: number
  }
}

type AddToSequenceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  prospectId: string
  prospectName: string
  currentSequence?: string | null
  onSequenceAdded?: () => void
}

export function AddToSequenceDialog({
  open,
  onOpenChange,
  prospectId,
  prospectName,
  currentSequence,
  onSequenceAdded,
}: AddToSequenceDialogProps) {
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSequences, setLoadingSequences] = useState(true)
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>("")

  useEffect(() => {
    if (open) {
      loadSequences()
    }
  }, [open])

  const loadSequences = async () => {
    try {
      setLoadingSequences(true)
      const response = await fetch("/api/sequences?status=active")
      if (response.ok) {
        const data = await response.json()
        setSequences(data.sequences || [])
      }
    } catch (error) {
      console.error("Error loading sequences:", error)
      toast.error("Failed to load sequences")
    } finally {
      setLoadingSequences(false)
    }
  }

  const handleAddToSequence = async () => {
    if (!selectedSequenceId) {
      toast.error("Please select a sequence")
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/sequences/${selectedSequenceId}/prospects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectIds: [prospectId],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add to sequence")
      }

      toast.success(`${prospectName} added to sequence`)
      onOpenChange(false)
      setSelectedSequenceId("")
      onSequenceAdded?.()
    } catch (error: any) {
      console.error("Error adding to sequence:", error)
      toast.error(error.message || "Failed to add to sequence")
    } finally {
      setLoading(false)
    }
  }

  const selectedSequence = sequences.find(s => s.id === selectedSequenceId)

  const getStepIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-3 w-3" />
      case "call":
        return <Phone className="h-3 w-3" />
      case "linkedin":
        return <Linkedin className="h-3 w-3" />
      case "task":
        return <ClipboardList className="h-3 w-3" />
      case "wait":
        return <Clock className="h-3 w-3" />
      default:
        return <Zap className="h-3 w-3" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add to Sequence</DialogTitle>
          <DialogDescription>
            {currentSequence
              ? `${prospectName} is currently in "${currentSequence}". Select a new sequence to move them.`
              : `Select a sequence to add ${prospectName} to.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sequence">Sequence</Label>
            {loadingSequences ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sequences.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No active sequences available. Create a sequence first.
              </p>
            ) : (
              <Select value={selectedSequenceId} onValueChange={setSelectedSequenceId}>
                <SelectTrigger id="sequence">
                  <SelectValue placeholder="Select a sequence" />
                </SelectTrigger>
                <SelectContent>
                  {sequences.map((sequence) => (
                    <SelectItem key={sequence.id} value={sequence.id}>
                      <div className="flex items-center gap-2">
                        <span>{sequence.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {sequence.steps.length} steps
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedSequence && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
              <div>
                <p className="text-sm font-medium">{selectedSequence.name}</p>
                {selectedSequence.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedSequence.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{selectedSequence.stats.active} active</span>
                <span>•</span>
                <span>{selectedSequence.stats.completed} completed</span>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Steps:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSequence.steps.map((step, idx) => (
                    <Badge
                      key={step.id}
                      variant="outline"
                      className="text-xs flex items-center gap-1"
                    >
                      {getStepIcon(step.type)}
                      <span>{step.name || step.type}</span>
                      {step.delayDays > 0 || step.delayHours > 0 ? (
                        <span className="text-muted-foreground ml-1">
                          +{step.delayDays > 0 ? `${step.delayDays}d` : ""}{step.delayHours > 0 ? `${step.delayHours}h` : ""}
                        </span>
                      ) : null}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleAddToSequence}
            disabled={loading || !selectedSequenceId || sequences.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Add to Sequence
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
