"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Mail,
  Phone,
  Linkedin,
  Clock,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

type StepType = "email" | "call" | "linkedin" | "task" | "wait"

type SequenceStep = {
  id?: string
  type: StepType
  name: string
  order: number
  delayDays: number
  delayHours: number
  emailSubject?: string
  emailBody?: string
  callScript?: string
  taskNotes?: string
}

export default function NewSequencePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [steps, setSteps] = useState<SequenceStep[]>([])
  const [editingStep, setEditingStep] = useState<number | null>(null)

  const addStep = (type: StepType) => {
    const newStep: SequenceStep = {
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Step ${steps.length + 1}`,
      order: steps.length,
      delayDays: type === "wait" ? 1 : 0,
      delayHours: 0,
    }
    setSteps([...steps, newStep])
    setEditingStep(steps.length)
  }

  const updateStep = (index: number, updates: Partial<SequenceStep>) => {
    const updated = [...steps]
    updated[index] = { ...updated[index], ...updates }
    setSteps(updated)
  }

  const deleteStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index)
    updated.forEach((step, i) => {
      step.order = i
    })
    setSteps(updated)
    setEditingStep(null)
  }

  const moveStep = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) {
      return
    }

    const updated = [...steps]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    ;[updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]]

    updated.forEach((step, i) => {
      step.order = i
    })

    setSteps(updated)
  }

  const saveSequence = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Sequence name is required",
        variant: "destructive",
      })
      return
    }

    if (steps.length === 0) {
      toast({
        title: "Error",
        description: "Add at least one step to the sequence",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const response = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          steps: steps.map((step) => ({
            type: step.type,
            name: step.name,
            delayDays: step.delayDays,
            delayHours: step.delayHours,
            emailSubject: step.emailSubject,
            emailBody: step.emailBody,
            callScript: step.callScript,
            taskNotes: step.taskNotes,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create sequence")
      }

      const data = await response.json()

      toast({
        title: "Success",
        description: "Sequence created successfully",
      })

      router.push(`/sequences/${data.sequence.id}`)
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to create sequence",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getStepIcon = (type: StepType) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "call":
        return <Phone className="h-4 w-4" />
      case "linkedin":
      case "task":
        return <Linkedin className="h-4 w-4" />
      case "wait":
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/sequences")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Sequence</h1>
          <p className="text-muted-foreground">Design your outreach workflow</p>
        </div>
        <Button onClick={saveSequence} disabled={saving} className="ml-auto">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Sequence"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Sequence Details */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sequence Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Enterprise Cold Outreach"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this sequence for?"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Step</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => addStep("email")}
                variant="outline"
                className="w-full justify-start"
              >
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
              <Button
                onClick={() => addStep("call")}
                variant="outline"
                className="w-full justify-start"
              >
                <Phone className="mr-2 h-4 w-4" />
                Call
              </Button>
              <Button
                onClick={() => addStep("linkedin")}
                variant="outline"
                className="w-full justify-start"
              >
                <Linkedin className="mr-2 h-4 w-4" />
                LinkedIn
              </Button>
              <Button
                onClick={() => addStep("wait")}
                variant="outline"
                className="w-full justify-start"
              >
                <Clock className="mr-2 h-4 w-4" />
                Wait / Delay
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Steps Builder */}
        <div className="lg:col-span-2 space-y-4">
          {steps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No steps added yet. Click a step type on the left to get started.</p>
              </CardContent>
            </Card>
          ) : (
            steps.map((step, index) => (
              <Card key={index} className={editingStep === index ? "border-accent" : ""}>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Step {index + 1}</Badge>
                    <div className="flex items-center gap-1">
                      {getStepIcon(step.type)}
                      <span className="font-medium">{step.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveStep(index, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveStep(index, "down")}
                      disabled={index === steps.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteStep(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Step Name</Label>
                    <Input
                      value={step.name}
                      onChange={(e) => updateStep(index, { name: e.target.value })}
                      placeholder="Name this step"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Delay (Days)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={step.delayDays}
                        onChange={(e) =>
                          updateStep(index, { delayDays: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <Label>Delay (Hours)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        value={step.delayHours}
                        onChange={(e) =>
                          updateStep(index, { delayHours: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  {step.type === "email" && (
                    <>
                      <div>
                        <Label>Email Subject</Label>
                        <Input
                          value={step.emailSubject || ""}
                          onChange={(e) =>
                            updateStep(index, { emailSubject: e.target.value })
                          }
                          placeholder="Email subject line"
                        />
                      </div>
                      <div>
                        <Label>Email Body</Label>
                        <Textarea
                          value={step.emailBody || ""}
                          onChange={(e) => updateStep(index, { emailBody: e.target.value })}
                          placeholder="Email template..."
                          rows={6}
                        />
                      </div>
                    </>
                  )}

                  {step.type === "call" && (
                    <div>
                      <Label>Call Script</Label>
                      <Textarea
                        value={step.callScript || ""}
                        onChange={(e) => updateStep(index, { callScript: e.target.value })}
                        placeholder="Call script / talking points..."
                        rows={6}
                      />
                    </div>
                  )}

                  {(step.type === "linkedin" || step.type === "task") && (
                    <div>
                      <Label>Task Notes</Label>
                      <Textarea
                        value={step.taskNotes || ""}
                        onChange={(e) => updateStep(index, { taskNotes: e.target.value })}
                        placeholder="Instructions for this step..."
                        rows={4}
                      />
                    </div>
                  )}

                  {index < steps.length - 1 && (
                    <div className="text-sm text-muted-foreground pt-2 border-t">
                      Wait {step.delayDays} day{step.delayDays !== 1 ? "s" : ""}{" "}
                      {step.delayHours > 0 &&
                        `and ${step.delayHours} hour${step.delayHours !== 1 ? "s" : ""}`}{" "}
                      before next step
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
