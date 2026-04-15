"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Loader2, Flame, ThumbsUp, MousePointerClick, Clock, Linkedin, CalendarClock, CalendarIcon, Clock3, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useUser } from "@/hooks/use-user"

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
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<TaskType>("follow_up")
  const [priority, setPriority] = useState<Priority>("medium")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [dueTime, setDueTime] = useState("")
  const [calendarOpen, setCalendarOpen] = useState(false)

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setType("follow_up")
    setPriority("medium")
    setDueDate(undefined)
    setDueTime("")
    setCalendarOpen(false)
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a task title")
      return
    }

    try {
      setLoading(true)

      let dueDatetime: string | null = null
      if (dueDate) {
        const d = new Date(dueDate)
        if (dueTime) {
          const [hours, minutes] = dueTime.split(":").map(Number)
          d.setHours(hours, minutes, 0, 0)
        }
        dueDatetime = d.toISOString()
      }

      const taskData: any = {
        title: title.trim(),
        description: description.trim() || title.trim(),
        type,
        priority,
        dueDate: dueDatetime,
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

  const assigneeName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
    : "You"

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm()
      onOpenChange(isOpen)
    }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-[15px] font-semibold">New task</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Associated with */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">
              Associated with <span className="text-red-500">*</span>
            </label>
            {prospect ? (
              <div className="flex items-center h-9 px-3 rounded-md border border-border bg-muted/40 text-[13px]">
                {prospect.name}{prospect.company ? ` · ${prospect.company}` : ""}
              </div>
            ) : (
              <Select disabled>
                <SelectTrigger className="text-[13px] h-9 text-muted-foreground">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent />
              </Select>
            )}
          </div>

          {/* Type + Title */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Type</label>
              <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
                <SelectTrigger className="text-[13px] h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {taskTypeOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <SelectItem key={option.value} value={option.value} className="text-[13px]">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-[13px] h-9"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Description</label>
            <Textarea
              placeholder="Add description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-[13px] resize-none"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[12px] gap-1.5 text-muted-foreground"
              onClick={() => {}}
            >
              <Sparkles className="h-3 w-3" />
              Add snippet
            </Button>
          </div>

          {/* Due date + Due time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Due date</label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-[13px] h-9",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dueDate ? format(dueDate, "MM / dd / yyyy") : "MM / DD / YYYY"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      setDueDate(date)
                      setCalendarOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground flex items-center gap-1">
                Due time
                <span className="text-muted-foreground/60 cursor-help" title="Time is in your local timezone">ⓘ</span>
              </label>
              <div className="relative">
                <Clock3 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="text-[13px] h-9 pl-8"
                />
              </div>
            </div>
          </div>

          {/* Priority + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="text-[13px] h-9">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-[13px]">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Assignee</label>
              <Select defaultValue="me" disabled>
                <SelectTrigger className="text-[13px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="me" className="text-[13px]">
                    {assigneeName} (You)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-[13px] h-8"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="text-[13px] h-8 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Creating...
              </>
            ) : (
              "Create task"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
