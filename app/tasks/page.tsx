"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import {
  Linkedin,
  ExternalLink,
  CheckCircle2,
  Trash2,
  Building2,
  Calendar,
  Clock,
  Flame,
  ThumbsUp,
  MousePointerClick,
  CalendarClock,
  MoreHorizontal,
  Loader2,
  GripVertical,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CreateTaskDialog } from "@/components/create-task-dialog"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
import { BRLoader } from "@/components/ui/br-loader"
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type TaskType = "hot_lead" | "interested" | "website_visit" | "follow_up" | "linkedin" | "other"
type Priority = "high" | "medium" | "low"
type TaskStatus = "to_do" | "in_progress" | "done"

interface Task {
  id: string
  type: TaskType
  title: string
  description: string
  contact?: {
    name: string
    title?: string
    company?: string
    email?: string
    phone?: string
    linkedin?: string
  } | null
  company?: {
    name: string
    website?: string
  } | null
  dueDate?: string | null
  priority: Priority
  status: TaskStatus
  createdAt: string
}

// ── Custom checkbox ────────────────────────────────────────────────────────────

function Cb({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'w-[15px] h-[15px] rounded-[3px] border transition-colors shrink-0 flex items-center justify-center',
        checked
          ? 'bg-[hsl(100,78%,44%)] border-[hsl(100,78%,44%)]'
          : 'border-border bg-transparent hover:border-muted-foreground/60'
      )}
    >
      {checked && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
    </button>
  )
}

const getTaskTypeIcon = (type: TaskType) => {
  switch (type) {
    case "hot_lead":
      return <Flame className="h-4 w-4 text-red-500" />
    case "interested":
      return <ThumbsUp className="h-4 w-4 text-green-500" />
    case "website_visit":
      return <MousePointerClick className="h-4 w-4 text-blue-500" />
    case "follow_up":
      return <Clock className="h-4 w-4 text-yellow-500" />
    case "linkedin":
      return <Linkedin className="h-4 w-4 text-[#0A66C2]" />
    default:
      return <CalendarClock className="h-4 w-4 text-gray-500" />
  }
}

const getTaskTypeLabel = (type: TaskType) => {
  switch (type) {
    case "hot_lead":
      return "Hot Lead"
    case "interested":
      return "Interested"
    case "website_visit":
      return "Website Visit"
    case "follow_up":
      return "Follow Up"
    case "linkedin":
      return "LinkedIn"
    default:
      return "Task"
  }
}

const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case "high":
      return "bg-red-500/20 text-red-500"
    case "medium":
      return "bg-yellow-500/20 text-yellow-500"
    case "low":
      return "bg-blue-500/20 text-blue-500"
    default:
      return "bg-gray-500/20 text-gray-500"
  }
}

const statusConfig = {
  to_do: { label: "To Do", color: "bg-gray-500/20 text-gray-500" },
  in_progress: { label: "In Progress", color: "bg-blue-500/20 text-blue-500" },
  done: { label: "Done", color: "bg-green-500/20 text-green-500" },
}

function TasksContent() {
  const searchParams = useSearchParams()
  const initialView = searchParams.get("view") === "linkedin" ? "linkedin" : "tasks"

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<"linkedin" | "tasks">(initialView)
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [bulkActioning, setBulkActioning] = useState(false)
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/tasks")
      if (!response.ok) throw new Error("Failed to load tasks")
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error("Error loading tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter tasks based on view
  const linkedInTasks = tasks.filter((t) => t.type === "linkedin")
  const regularTasks = tasks.filter((t) => t.type !== "linkedin")
  const displayedTasks = activeView === "linkedin" ? linkedInTasks : regularTasks

  // Group tasks by status for display
  const tasksByStatus = {
    to_do: displayedTasks.filter((t) => t.status === "to_do"),
    in_progress: displayedTasks.filter((t) => t.status === "in_progress"),
    done: displayedTasks.filter((t) => t.status === "done"),
  }

  const handleSelectTask = (taskId: string) => {
    setSelectedTasks((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedTasks.size === displayedTasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(displayedTasks.map((t) => t.id)))
    }
  }

  const openAllLinkedIns = () => {
    const selectedLinkedInTasks = displayedTasks.filter(
      (t) => selectedTasks.has(t.id) && t.contact?.linkedin
    )

    if (selectedLinkedInTasks.length === 0) {
      // If none selected, open all with LinkedIn URLs
      displayedTasks.forEach((t) => {
        if (t.contact?.linkedin) {
          window.open(t.contact.linkedin, "_blank")
        }
      })
    } else {
      // Open selected ones
      selectedLinkedInTasks.forEach((t) => {
        if (t.contact?.linkedin) {
          window.open(t.contact.linkedin, "_blank")
        }
      })
    }
  }

  const markTaskComplete = async (taskId: string) => {
    setUpdatingTasks((prev) => new Set(prev).add(taskId))

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      })

      if (!response.ok) throw new Error("Failed to update task")

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "done" as TaskStatus } : t))
      )
    } catch (error) {
      console.error("Error updating task:", error)
    } finally {
      setUpdatingTasks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const deleteTask = async (taskId: string) => {
    setUpdatingTasks((prev) => new Set(prev).add(taskId))

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete task")

      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      setSelectedTasks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    } catch (error) {
      console.error("Error deleting task:", error)
    } finally {
      setUpdatingTasks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
      setDeleteDialogOpen(false)
      setTaskToDelete(null)
    }
  }

  const confirmDelete = (taskId: string) => {
    setTaskToDelete(taskId)
    setDeleteDialogOpen(true)
  }

  const bulkMarkDone = async () => {
    const ids = Array.from(selectedTasks)
    const notDone = ids.filter((id) => {
      const task = tasks.find((t) => t.id === id)
      return task && task.status !== "done"
    })

    if (notDone.length === 0) {
      toast.info("All selected tasks are already done")
      return
    }

    setBulkActioning(true)
    let successCount = 0

    for (const taskId of notDone) {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "done" }),
        })
        if (response.ok) {
          successCount++
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: "done" as TaskStatus } : t))
          )
        }
      } catch (error) {
        console.error(`Error marking task ${taskId} as done:`, error)
      }
    }

    toast.success(`${successCount} task${successCount !== 1 ? "s" : ""} marked as done`)
    setSelectedTasks(new Set())
    setBulkActioning(false)
  }

  const bulkOpenLinkedIns = () => {
    const ids = Array.from(selectedTasks)
    const withLinkedIn = ids
      .map((id) => tasks.find((t) => t.id === id))
      .filter((t) => t?.contact?.linkedin)

    if (withLinkedIn.length === 0) {
      toast.error("No selected tasks have LinkedIn URLs")
      return
    }

    withLinkedIn.forEach((t) => {
      if (t?.contact?.linkedin) {
        window.open(t.contact.linkedin, "_blank")
      }
    })

    toast.success(`Opened ${withLinkedIn.length} LinkedIn profile${withLinkedIn.length !== 1 ? "s" : ""}`)
  }

  const bulkDeleteTasks = async () => {
    const ids = Array.from(selectedTasks)
    setBulkActioning(true)
    let successCount = 0

    for (const taskId of ids) {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "DELETE",
        })
        if (response.ok) {
          successCount++
          setTasks((prev) => prev.filter((t) => t.id !== taskId))
        }
      } catch (error) {
        console.error(`Error deleting task ${taskId}:`, error)
      }
    }

    toast.success(`${successCount} task${successCount !== 1 ? "s" : ""} deleted`)
    setSelectedTasks(new Set())
    setBulkActioning(false)
    setBulkDeleteDialogOpen(false)
  }

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    setUpdatingTasks((prev) => new Set(prev).add(taskId))

    // Optimistic update
    const previousTasks = tasks
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error("Failed to update task")

      toast.success(`Task moved to ${statusConfig[newStatus].label}`)
    } catch (error) {
      console.error("Error updating task:", error)
      setTasks(previousTasks) // Revert on error
      toast.error("Failed to update task")
    } finally {
      setUpdatingTasks((prev) => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    // If no destination or dropped in same place
    if (!destination ||
        (destination.droppableId === source.droppableId &&
         destination.index === source.index)) {
      return
    }

    const newStatus = destination.droppableId as TaskStatus
    updateTaskStatus(draggableId, newStatus)
  }

  const renderTaskCard = (task: Task, index: number) => {
    const isUpdating = updatingTasks.has(task.id)
    const isSelected = selectedTasks.has(task.id)

    return (
      <Draggable key={task.id} draggableId={task.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              "p-3 rounded-lg border border-border bg-card transition-colors group",
              isSelected && "border-[hsl(100,78%,44%)]/40 bg-[hsl(100,78%,44%)]/5",
              task.status === "done" && "opacity-60",
              snapshot.isDragging && "shadow-lg border-accent/50"
            )}
          >
            <div className="flex items-start gap-2.5">
              <div
                {...provided.dragHandleProps}
                className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </div>
              <div className="mt-0.5" onClick={(e) => { e.stopPropagation(); handleSelectTask(task.id) }}>
                <Cb checked={isSelected} onChange={() => handleSelectTask(task.id)} />
              </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              {getTaskTypeIcon(task.type)}
              <span className="text-[11px] font-medium text-muted-foreground">{getTaskTypeLabel(task.type)}</span>
              <span className={cn("ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-medium", getPriorityColor(task.priority))}>
                {task.priority}
              </span>
            </div>

            <p className="text-[13px] font-medium leading-snug">{task.title}</p>
            {task.description && (
              <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
            )}

            {task.contact && (
              <div className="flex items-center gap-2 mt-2.5">
                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-semibold text-white shrink-0">
                  {task.contact.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate">{task.contact.name}</p>
                  {task.contact.title && (
                    <p className="text-[11px] text-muted-foreground truncate">{task.contact.title}</p>
                  )}
                </div>
                {task.contact.linkedin && (
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); window.open(task.contact?.linkedin, "_blank") }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {task.company && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[12px] text-muted-foreground truncate">{task.company.name}</span>
              </div>
            )}

            {task.dueDate && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground">
                  {format(new Date(task.dueDate), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity" disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-3.5 w-3.5" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {task.status !== "done" && (
                <DropdownMenuItem onClick={() => markTaskComplete(task.id)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Done
                </DropdownMenuItem>
              )}
              {task.contact?.linkedin && (
                <DropdownMenuItem onClick={() => window.open(task.contact?.linkedin, "_blank")}>
                  <Linkedin className="h-4 w-4 mr-2" />
                  Open LinkedIn
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => confirmDelete(task.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            </div>
          </div>
        )}
      </Draggable>
    )
  }

  return (
    <div className="-m-5 flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        {/* View tabs */}
        <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
          <button
            onClick={() => { setActiveView("tasks"); setSelectedTasks(new Set()) }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
              activeView === "tasks"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Tasks
            <span className={cn(
              "px-1.5 py-0 rounded-full text-[10px] font-semibold leading-5",
              activeView === "tasks" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
            )}>{regularTasks.length}</span>
          </button>
          <button
            onClick={() => { setActiveView("linkedin"); setSelectedTasks(new Set()) }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
              activeView === "linkedin"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Linkedin className="h-3.5 w-3.5" />
            LinkedIn
            <span className={cn(
              "px-1.5 py-0 rounded-full text-[10px] font-semibold leading-5",
              activeView === "linkedin" ? "bg-[#0A66C2]/10 text-[#0A66C2]" : "bg-muted text-muted-foreground"
            )}>{linkedInTasks.length}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {displayedTasks.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-[12px] text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
            >
              {selectedTasks.size === displayedTasks.length ? "Deselect All" : "Select All"}
            </button>
          )}
          {activeView === "linkedin" && displayedTasks.length > 0 && (
            <Button
              size="sm"
              className="h-8 text-[12px] gap-1.5 bg-[#0A66C2] hover:bg-[#0A66C2]/90"
              onClick={openAllLinkedIns}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open {selectedTasks.size > 0 ? `${selectedTasks.size} ` : "All "}LinkedIns
            </Button>
          )}
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="h-8 text-[12px] gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Create Task
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedTasks.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-accent/5 shrink-0">
          <span className="text-[12px] font-medium text-muted-foreground">{selectedTasks.size} selected</span>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={bulkMarkDone}
            disabled={bulkActioning}
            className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-md border border-border hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {bulkActioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Mark as Done
          </button>
          <button
            onClick={bulkOpenLinkedIns}
            disabled={bulkActioning}
            className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-md border border-border hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <Linkedin className="h-3.5 w-3.5" />
            Open LinkedIns
          </button>
          <button
            onClick={() => setBulkDeleteDialogOpen(true)}
            disabled={bulkActioning}
            className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <button
            onClick={() => setSelectedTasks(new Set())}
            disabled={bulkActioning}
            className="text-[12px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/50 transition-colors ml-1"
          >
            Clear
          </button>
        </div>
      )}

      {/* Board area */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <BRLoader />
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            {activeView === "linkedin" ? (
              <>
                <Linkedin className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-[14px] font-medium">No LinkedIn tasks</p>
                <p className="text-[13px] text-muted-foreground">LinkedIn connection and messaging tasks from sequences will appear here</p>
              </>
            ) : (
              <>
                <CalendarClock className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-[14px] font-medium">No tasks yet</p>
                <p className="text-[13px] text-muted-foreground">Create your first task to get started</p>
                <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="h-8 text-[12px] gap-1.5 mt-1">
                  <Plus className="h-3.5 w-3.5" /> Create Task
                </Button>
              </>
            )}
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
              {/* To Do Column */}
              <div className="flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">To Do</h3>
                  <span className="text-[10px] font-semibold px-1.5 py-0 rounded-full bg-muted text-muted-foreground leading-5">{tasksByStatus.to_do.length}</span>
                </div>
                <Droppable droppableId="to_do">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex-1 min-h-[200px] p-2 rounded-lg border border-dashed transition-colors",
                        snapshot.isDraggingOver ? "bg-accent/5 border-accent/40" : "border-border/50 bg-muted/20"
                      )}
                    >
                      <div className="space-y-2">
                        {tasksByStatus.to_do.map((task, index) => renderTaskCard(task, index))}
                        {tasksByStatus.to_do.length === 0 && !snapshot.isDraggingOver && (
                          <p className="text-[12px] text-muted-foreground text-center py-8">No tasks to do</p>
                        )}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* In Progress Column */}
              <div className="flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">In Progress</h3>
                  <span className="text-[10px] font-semibold px-1.5 py-0 rounded-full bg-blue-500/10 text-blue-400 leading-5">{tasksByStatus.in_progress.length}</span>
                </div>
                <Droppable droppableId="in_progress">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex-1 min-h-[200px] p-2 rounded-lg border border-dashed transition-colors",
                        snapshot.isDraggingOver ? "bg-blue-500/5 border-blue-500/30" : "border-border/50 bg-muted/20"
                      )}
                    >
                      <div className="space-y-2">
                        {tasksByStatus.in_progress.map((task, index) => renderTaskCard(task, index))}
                        {tasksByStatus.in_progress.length === 0 && !snapshot.isDraggingOver && (
                          <p className="text-[12px] text-muted-foreground text-center py-8">No tasks in progress</p>
                        )}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Done Column */}
              <div className="flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Done</h3>
                  <span className="text-[10px] font-semibold px-1.5 py-0 rounded-full bg-[hsl(100,78%,44%)]/10 text-[hsl(100,78%,44%)] leading-5">{tasksByStatus.done.length}</span>
                </div>
                <Droppable droppableId="done">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex-1 min-h-[200px] p-2 rounded-lg border border-dashed transition-colors",
                        snapshot.isDraggingOver ? "bg-[hsl(100,78%,44%)]/5 border-[hsl(100,78%,44%)]/30" : "border-border/50 bg-muted/20"
                      )}
                    >
                      <div className="space-y-2">
                        {tasksByStatus.done.map((task, index) => renderTaskCard(task, index))}
                        {tasksByStatus.done.length === 0 && !snapshot.isDraggingOver && (
                          <p className="text-[12px] text-muted-foreground text-center py-8">No completed tasks</p>
                        )}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          </DragDropContext>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => taskToDelete && deleteTask(taskToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedTasks.size} task{selectedTasks.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedTasks.size} selected task{selectedTasks.size !== 1 ? "s" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={bulkDeleteTasks}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkActioning}
            >
              {bulkActioning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedTasks.size} task${selectedTasks.size !== 1 ? "s" : ""}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTaskCreated={loadTasks}
      />
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="-m-5 flex flex-col items-center justify-center" style={{ height: 'calc(100vh - 3rem)' }}>
          <BRLoader />
        </div>
      }
    >
      <TasksContent />
    </Suspense>
  )
}
