"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
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
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set())

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
              "p-4 rounded-lg border bg-card transition-colors",
              isSelected && "ring-2 ring-primary",
              task.status === "done" && "opacity-70",
              snapshot.isDragging && "shadow-lg ring-2 ring-primary/50"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                {...provided.dragHandleProps}
                className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              >
                <GripVertical className="h-4 w-4" />
              </div>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleSelectTask(task.id)}
                className="mt-1"
              />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getTaskTypeIcon(task.type)}
              <Badge variant="outline" className="text-xs">
                {getTaskTypeLabel(task.type)}
              </Badge>
              <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                {task.priority}
              </Badge>
              <Badge className={cn("text-xs", statusConfig[task.status].color)}>
                {statusConfig[task.status].label}
              </Badge>
            </div>

            <h4 className="font-medium text-sm">{task.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>

            {task.contact && (
              <div className="flex items-center gap-2 mt-3">
                <Avatar className="h-6 w-6">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback>
                    {task.contact.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="text-xs">
                  <div className="font-medium">{task.contact.name}</div>
                  {task.contact.title && (
                    <div className="text-muted-foreground">{task.contact.title}</div>
                  )}
                </div>
                {task.contact.linkedin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-auto"
                    onClick={() => window.open(task.contact?.linkedin, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}

            {task.company && (
              <div className="flex items-center gap-2 mt-2">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">{task.company.name}</span>
              </div>
            )}

            {task.dueDate && (
              <div className="flex items-center gap-2 mt-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs">
                  Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Tasks</h1>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tasks</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Tabs
              value={activeView}
              onValueChange={(v) => {
                setActiveView(v as "linkedin" | "tasks")
                setSelectedTasks(new Set())
              }}
            >
              <TabsList>
                <TabsTrigger value="linkedin" className="gap-2">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn ({linkedInTasks.length})
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Tasks ({regularTasks.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              {displayedTasks.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedTasks.size === displayedTasks.length ? "Deselect All" : "Select All"}
                </Button>
              )}

              {activeView === "linkedin" && displayedTasks.length > 0 && (
                <Button
                  size="sm"
                  className="gap-2 bg-[#0A66C2] hover:bg-[#0A66C2]/90"
                  onClick={openAllLinkedIns}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open {selectedTasks.size > 0 ? `${selectedTasks.size} ` : "All "}LinkedIns
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {displayedTasks.length === 0 ? (
            <div className="py-12 text-center">
              {activeView === "linkedin" ? (
                <>
                  <Linkedin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-1">No LinkedIn tasks</p>
                  <p className="text-sm text-muted-foreground">
                    LinkedIn connection and messaging tasks from sequences will appear here
                  </p>
                </>
              ) : (
                <>
                  <CalendarClock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-1">No tasks</p>
                  <p className="text-sm text-muted-foreground">
                    Your tasks will appear here
                  </p>
                </>
              )}
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* To Do Column */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-medium">To Do</h3>
                    <Badge variant="secondary" className="text-xs">
                      {tasksByStatus.to_do.length}
                    </Badge>
                  </div>
                  <Droppable droppableId="to_do">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "min-h-[500px] p-2 rounded-lg border border-dashed transition-colors",
                          snapshot.isDraggingOver ? "bg-primary/10 border-primary" : "bg-muted/30 border-transparent"
                        )}
                      >
                        <div className="space-y-3">
                          {tasksByStatus.to_do.map((task, index) => renderTaskCard(task, index))}
                          {tasksByStatus.to_do.length === 0 && !snapshot.isDraggingOver && (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No tasks to do
                            </p>
                          )}
                        </div>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* In Progress Column */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-medium">In Progress</h3>
                    <Badge variant="secondary" className="text-xs">
                      {tasksByStatus.in_progress.length}
                    </Badge>
                  </div>
                  <Droppable droppableId="in_progress">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "min-h-[500px] p-2 rounded-lg border border-dashed transition-colors",
                          snapshot.isDraggingOver ? "bg-primary/10 border-primary" : "bg-muted/30 border-transparent"
                        )}
                      >
                        <div className="space-y-3">
                          {tasksByStatus.in_progress.map((task, index) => renderTaskCard(task, index))}
                          {tasksByStatus.in_progress.length === 0 && !snapshot.isDraggingOver && (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No tasks in progress
                            </p>
                          )}
                        </div>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Done Column */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-medium">Done</h3>
                    <Badge variant="secondary" className="text-xs">
                      {tasksByStatus.done.length}
                    </Badge>
                  </div>
                  <Droppable droppableId="done">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "min-h-[500px] p-2 rounded-lg border border-dashed transition-colors",
                          snapshot.isDraggingOver ? "bg-primary/10 border-primary" : "bg-muted/30 border-transparent"
                        )}
                      >
                        <div className="space-y-3">
                          {tasksByStatus.done.map((task, index) => renderTaskCard(task, index))}
                          {tasksByStatus.done.length === 0 && !snapshot.isDraggingOver && (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No completed tasks
                            </p>
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
        </CardContent>
      </Card>

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
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Tasks</h1>
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <TasksContent />
    </Suspense>
  )
}
