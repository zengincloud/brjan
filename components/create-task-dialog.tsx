"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, ClipboardList, Flame, ThumbsUp, MousePointerClick, Clock, Linkedin, CalendarClock } from "lucide-react"
import { toast } from "sonner"

type TaskType = "hot_lead" | "interested" | "website_visit" | "follow_up" | "linkedin" | "other"
type Priority = "high" | "medium" | "low"

type CreateTaskDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  prospect?: {
    id: string
    name: string
    title?: string | null
    company?: string | null
    email?: string | null
    phone?: string | null
    linkedin?: string | null
  }
  onTaskCreated?: () => void
}

const taskTypeOptions = [
  { value: "follow_up", label: "Follow Up", icon: Clock },
  { value: "hot_lead", label: "Hot Lead", icon: Flame },
  { value: "interested", label: "Interested", icon: ThumbsUp },
  { value: "website_visit", label: "Website Visit", icon: MousePointerClick },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "other", label: "Other", icon: CalendarClock },
]

const priorityOptions = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]

export function CreateTaskDialog({
  open,
  onOpenChange,
  prospect,
  onTaskCreated,
}: CreateTaskDialogProps) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<TaskType>("follow_up")
  const [priority, setPriority] = useState<Priority>("medium")
  const [dueDate, setDueDate] = useState("")

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setType("follow_up")
    setPriority("medium")
    setDueDate("")
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a task title")
      return
    }

    if (!description.trim()) {
      toast.error("Please enter a task description")
      return
    }

    try {
      setLoading(true)

      const taskData: any = {
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        dueDate: dueDate || null,
      }

      if (prospect) {
        taskData.contact = {
          name: prospect.name,
          title: prospect.title || undefined,
          company: prospect.company || undefined,
          email: prospect.email || undefined,
          phone: prospect.phone || undefined,
          linkedin: prospect.linkedin || undefined,
        }

        if (prospect.company) {
          taskData.company = {
            name: prospect.company,
          }
        }
      }

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create task")
      }

      toast.success("Task created successfully")
      resetForm()
      onOpenChange(false)
      onTaskCreated?.()
    } catch (error: any) {
      console.error("Error creating task:", error)
      toast.error(error.message || "Failed to create task")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm()
      onOpenChange(isOpen)
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Create Task
          </DialogTitle>
          <DialogDescription>
            {prospect
              ? `Create a new task for ${prospect.name}`
              : "Create a new task"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter task description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {taskTypeOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {prospect && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Linked Contact</p>
              <div className="text-sm">
                <p className="font-medium">{prospect.name}</p>
                {prospect.title && prospect.company && (
                  <p className="text-muted-foreground text-xs">
                    {prospect.title} at {prospect.company}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4 mr-2" />
                Create Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
