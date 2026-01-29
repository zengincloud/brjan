"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Mail,
  Phone,
  Linkedin,
  Clock,
  Trash2,
  ArrowLeft,
  Save,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

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

export default function EditSequencePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [steps, setSteps] = useState<SequenceStep[]>([])
  const [editingStep, setEditingStep] = useState<number | null>(null)

  useEffect(() => {
    if (params.id) {
      loadSequence(params.id as string)
    }
  }, [params.id])

  const loadSequence = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sequences/${id}`)
      if (!response.ok) throw new Error("Failed to load sequence")
      const data = await response.json()

      setName(data.sequence.name)
      setDescription(data.sequence.description || "")
      setSteps(data.sequence.steps || [])
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to load sequence",
        variant: "destructive",
      })
      router.push("/sequences")
    } finally {
      setLoading(false)
    }
  }

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
      const response = await fetch(`/api/sequences/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          steps: steps.map((step) => ({
            id: step.id, // Include id for existing steps
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
        throw new Error("Failed to update sequence")
      }

      const data = await response.json()

      toast({
        title: "Success",
        description: "Sequence updated successfully",
      })

      router.push(`/sequences/${data.sequence.id}`)
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to update sequence",
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

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push(`/sequences/${params.id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Sequence</h1>
          <p className="text-muted-foreground">Update your outreach workflow</p>
        </div>
        <Button onClick={saveSequence} disabled={saving} className="ml-auto">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
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
            </CardContent>
          </Card>
        </div>

        {/* Right: Steps Builder */}
        <div className="lg:col-span-2 space-y-0">
          {steps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No steps added yet. Click a step type on the left to get started.</p>
              </CardContent>
            </Card>
          ) : (
            steps.map((step, index) => (
              <div key={index} className="relative">
                <Card className={editingStep === index ? "border-accent" : ""}>
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

                </CardContent>
              </Card>

              {/* Delay Adjuster Between Steps */}
              {index < steps.length - 1 && (
                <div className="relative flex items-center justify-center py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-dashed border-border"></div>
                  </div>
                  <div className="relative z-10 bg-background px-4">
                    <Card className="border-2">
                      <CardContent className="p-3">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-4">
                            <Clock className="h-4 w-4 text-muted-foreground" />

                            <div className="flex items-center gap-2">
                              <div className="flex flex-col items-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => updateStep(index, { delayDays: step.delayDays + 1 })}
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <div className="text-center px-2 py-1 min-w-[60px]">
                                  <div className="text-lg font-bold">{step.delayDays}</div>
                                  <div className="text-xs text-muted-foreground">days</div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => updateStep(index, { delayDays: Math.max(0, step.delayDays - 1) })}
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>

                              <div className="flex flex-col items-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => updateStep(index, { delayHours: Math.min(23, step.delayHours + 1) })}
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <div className="text-center px-2 py-1 min-w-[60px]">
                                  <div className="text-lg font-bold">{step.delayHours}</div>
                                  <div className="text-xs text-muted-foreground">hours</div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => updateStep(index, { delayHours: Math.max(0, step.delayHours - 1) })}
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            <div className="text-sm text-muted-foreground">
                              {step.delayDays === 0 && step.delayHours === 0 ? (
                                <span>Immediate</span>
                              ) : (
                                <span>
                                  Wait{" "}
                                  {step.delayDays > 0 && `${step.delayDays}d`}
                                  {step.delayDays > 0 && step.delayHours > 0 && " "}
                                  {step.delayHours > 0 && `${step.delayHours}h`}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick presets */}
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => updateStep(index, { delayDays: 0, delayHours: 0 })}
                            >
                              Now
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => updateStep(index, { delayDays: 0, delayHours: 2 })}
                            >
                              2h
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => updateStep(index, { delayDays: 0, delayHours: 4 })}
                            >
                              4h
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => updateStep(index, { delayDays: 1, delayHours: 0 })}
                            >
                              1d
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => updateStep(index, { delayDays: 2, delayHours: 0 })}
                            >
                              2d
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => updateStep(index, { delayDays: 3, delayHours: 0 })}
                            >
                              3d
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => updateStep(index, { delayDays: 7, delayHours: 0 })}
                            >
                              1w
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
