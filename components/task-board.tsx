"use client"

import { CardDescription } from "@/components/ui/card"

import { CardTitle } from "@/components/ui/card"

import { CardHeader } from "@/components/ui/card"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Flame,
  ThumbsUp,
  MousePointerClick,
  Clock,
  CalendarClock,
  MoreHorizontal,
  Building2,
  Phone,
  Mail,
  Calendar,
  Filter,
  Plus,
  Linkedin,
} from "lucide-react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { cn } from "@/lib/utils"

// Task types
type TaskType = "hot_lead" | "interested" | "website_visit" | "follow_up" | "linkedin" | "other"

// Task priority
type Priority = "high" | "medium" | "low"

// Task interface
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
  }
  company?: {
    name: string
    website?: string
  }
  dueDate?: string
  priority: Priority
  status: string
  createdAt: string
}

// Sample dummy tasks data - these won't update backend when moved
const dummyTasks: Task[] = [
  {
    id: "dummy-1",
    type: "hot_lead",
    title: "Follow up with Sarah from TechCorp",
    description: "Showed high interest in our enterprise solution",
    contact: {
      name: "Sarah Johnson",
      title: "CTO",
      company: "TechCorp",
      email: "sarah@techcorp.com",
      phone: "+1 (555) 123-4567",
    },
    company: {
      name: "TechCorp",
      website: "techcorp.com",
    },
    dueDate: "2024-02-15",
    priority: "high",
    status: "to_do",
    createdAt: "2024-02-10",
  },
  {
    id: "dummy-2",
    type: "interested",
    title: "Send proposal to Michael at GlobalTech",
    description: "Requested pricing information for 50 seats",
    contact: {
      name: "Michael Chen",
      title: "VP of Sales",
      company: "GlobalTech",
      email: "michael@globaltech.com",
      phone: "+1 (555) 987-6543",
    },
    company: {
      name: "GlobalTech",
      website: "globaltech.com",
    },
    dueDate: "2024-02-18",
    priority: "medium",
    status: "to_do",
    createdAt: "2024-02-11",
  },
  {
    id: "dummy-3",
    type: "follow_up",
    title: "Demo for NextGen Solutions",
    description: "CEO requested a personalized demo",
    contact: {
      name: "Robert Taylor",
      title: "CEO",
      company: "NextGen Solutions",
      email: "robert@nextgensolutions.com",
      phone: "+1 (555) 345-6789",
    },
    company: {
      name: "NextGen Solutions",
      website: "nextgensolutions.com",
    },
    dueDate: "2024-02-16",
    priority: "high",
    status: "in_progress",
    createdAt: "2024-02-09",
  },
  {
    id: "dummy-4",
    type: "website_visit",
    title: "Follow up with DataDrive",
    description: "Downloaded whitepaper on data security",
    company: {
      name: "DataDrive",
      website: "datadrive.com",
    },
    priority: "low",
    status: "in_progress",
    createdAt: "2024-02-14",
  },
  {
    id: "dummy-5",
    type: "interested",
    title: "Schedule demo with CloudNine",
    description: "Interested in our analytics platform",
    contact: {
      name: "Jessica Lee",
      title: "Head of Operations",
      company: "CloudNine",
      email: "jessica@cloudnine.com",
      phone: "+1 (555) 456-7890",
    },
    company: {
      name: "CloudNine",
      website: "cloudnine.com",
    },
    dueDate: "2024-02-19",
    priority: "medium",
    status: "done",
    createdAt: "2024-02-08",
  },
]

// Aggregated LinkedIn task card interface
interface LinkedInAggregateCard {
  id: string
  type: "linkedin_aggregate"
  subType: "connection" | "message"
  count: number
  status: string
  tasks: Task[]
}

// Type for board items (can be regular task or LinkedIn aggregate)
type BoardItem = Task | LinkedInAggregateCard

const isLinkedInAggregate = (item: BoardItem): item is LinkedInAggregateCard => {
  return "type" in item && item.type === "linkedin_aggregate"
}

// Column definitions
const columns = {
  to_do: {
    id: "to_do",
    title: "To Do",
    description: "Tasks that need to be started",
  },
  in_progress: {
    id: "in_progress",
    title: "In Progress",
    description: "Tasks currently being worked on",
  },
  done: {
    id: "done",
    title: "Done",
    description: "Completed tasks",
  },
}

type ApiTask = Omit<Task, "dueDate" | "contact" | "company"> & {
  dueDate: string | null
  contact?: Task["contact"] | null
  company?: Task["company"] | null
}

const normalizeTask = (task: ApiTask): Task => ({
  ...task,
  dueDate: task.dueDate ? task.dueDate.slice(0, 10) : undefined,
  contact: task.contact ?? undefined,
  company: task.company ?? undefined,
})

// Get icon for task type
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

// Get label for task type
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

// Get color for priority
const getPriorityColor = (priority: Priority) => {
  switch (priority) {
    case "high":
      return "bg-red-500/20 text-red-500 hover:bg-red-500/30"
    case "medium":
      return "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
    case "low":
      return "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
    default:
      return "bg-gray-500/20 text-gray-500 hover:bg-gray-500/30"
  }
}

export function TaskBoard() {
  const [realTasks, setRealTasks] = useState<Task[]>([])
  const [dummyTasksState, setDummyTasksState] = useState<Task[]>(dummyTasks)
  const [activeTab, setActiveTab] = useState<"board" | "list">("board")
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailTask, setEmailTask] = useState<Task | null>(null)
  const [emailTo, setEmailTo] = useState("")
  const [emailName, setEmailName] = useState("")
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "error">("idle")
  const [emailError, setEmailError] = useState<string | null>(null)
  const router = useRouter()

  // Combine real and dummy tasks, but separate LinkedIn tasks for aggregation
  const allTasks = [...realTasks, ...dummyTasksState]
  const nonLinkedInTasks = allTasks.filter(t => t.type !== "linkedin")
  const linkedInTasks = allTasks.filter(t => t.type === "linkedin")

  // Create LinkedIn aggregate counts by status
  const getLinkedInAggregates = (status: string): LinkedInAggregateCard[] => {
    const tasksForStatus = linkedInTasks.filter(t => t.status === status)
    if (tasksForStatus.length === 0) return []

    // Group by connection vs message based on title keywords
    const connectionTasks = tasksForStatus.filter(t =>
      t.title.toLowerCase().includes("connect") || t.title.toLowerCase().includes("connection")
    )
    const messageTasks = tasksForStatus.filter(t =>
      !t.title.toLowerCase().includes("connect") && !t.title.toLowerCase().includes("connection")
    )

    const aggregates: LinkedInAggregateCard[] = []

    if (connectionTasks.length > 0) {
      aggregates.push({
        id: `linkedin-connections-${status}`,
        type: "linkedin_aggregate",
        subType: "connection",
        count: connectionTasks.length,
        status,
        tasks: connectionTasks,
      })
    }

    if (messageTasks.length > 0) {
      aggregates.push({
        id: `linkedin-messages-${status}`,
        type: "linkedin_aggregate",
        subType: "message",
        count: messageTasks.length,
        status,
        tasks: messageTasks,
      })
    }

    return aggregates
  }

  useEffect(() => {
    let isMounted = true

    const loadTasks = async () => {
      try {
        const response = await fetch("/api/tasks")
        if (!response.ok) {
          throw new Error("Failed to load tasks")
        }
        const data = (await response.json()) as { tasks: ApiTask[] }
        if (isMounted) {
          setRealTasks(data.tasks.map(normalizeTask))
        }
      } catch (error) {
        console.error(error)
      }
    }

    loadTasks()

    return () => {
      isMounted = false
    }
  }, [])

  const openEmailComposer = (task: Task) => {
    const contactName = task.contact?.name ?? ""
    setEmailTask(task)
    setEmailTo(task.contact?.email ?? "")
    setEmailName(contactName)
    setEmailSubject(`Quick follow-up: ${task.title}`)
    setEmailBody(`Hello ${contactName || "there"},\n\n`)
    setEmailStatus("idle")
    setEmailError(null)
    setEmailOpen(true)
  }

  const sendEmail = async () => {
    if (!emailTask) return
    setEmailStatus("sending")
    setEmailError(null)

    try {
      const response = await fetch(`/api/tasks/${emailTask.id}/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: emailTo,
          name: emailName || undefined,
          subject: emailSubject,
          body: emailBody,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send email")
      }

      setEmailStatus("idle")
      setEmailOpen(false)
    } catch (error) {
      console.error(error)
      setEmailStatus("error")
      setEmailError("Unable to send email")
    }
  }

  // Group all tasks by status - showing individually for drag support
  const getItemsByStatus = (status: string): Task[] => {
    return allTasks.filter(t => t.status === status)
  }

  const totalTaskCount = allTasks.length

  // Handle drag end
  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result

    // If there's no destination or the item was dropped back in the same place
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return
    }

    // Don't allow dragging LinkedIn aggregate cards
    if (draggableId.startsWith("linkedin-")) {
      return
    }

    // Check if this is a dummy task
    const isDummyTask = draggableId.startsWith("dummy-")

    if (isDummyTask) {
      // Just update local state for dummy tasks, no backend call
      setDummyTasksState((current) =>
        current.map((task) => {
          if (task.id === draggableId) {
            return { ...task, status: destination.droppableId }
          }
          return task
        })
      )
      return
    }

    // Real task - update backend
    const previousTasks = realTasks
    setRealTasks((current) =>
      current.map((task) => {
        if (task.id === draggableId) {
          return { ...task, status: destination.droppableId }
        }
        return task
      })
    )

    try {
      const response = await fetch(`/api/tasks/${draggableId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: destination.droppableId }),
      })

      if (!response.ok) {
        throw new Error("Failed to update task")
      }

      const data = (await response.json()) as { task: ApiTask }
      const normalizedTask = normalizeTask(data.task)

      setRealTasks((current) =>
        current.map((task) => (task.id === normalizedTask.id ? { ...task, ...normalizedTask } : task)),
      )
    } catch (error) {
      console.error(error)
      setRealTasks(previousTasks)
    }
  }

  return (
    <Card className="border-border bg-card overflow-hidden">
      {/* Window Controls Bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/20">
        <span className="text-xs text-muted-foreground">Task Manager</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{totalTaskCount} tasks</span>
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Flame className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">My Tasks</h3>
              <p className="text-xs text-muted-foreground">Manage accounts, prospects, and follow-ups</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button size="sm" className="gap-2 bg-accent hover:bg-accent/90">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "board" | "list")}>
          <TabsList className="mb-4">
            <TabsTrigger value="board">Board View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          <TabsContent value="board">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.values(columns).map((column) => {
                  const items = getItemsByStatus(column.id)
                  return (
                    <div key={column.id} className="flex flex-col h-full">
                      <div className="mb-2">
                        <h3 className="text-sm font-medium">{column.title}</h3>
                        <p className="text-xs text-muted-foreground">{column.description}</p>
                      </div>
                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              "flex-1 p-2 rounded-md min-h-[400px] border border-dashed",
                              snapshot.isDraggingOver ? "bg-accent/50" : "bg-muted/30",
                            )}
                          >
                            {items.map((task, index) => (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={cn(
                                      "mb-2 p-3 rounded-md border bg-card",
                                      snapshot.isDragging ? "shadow-lg" : "",
                                      task.id.startsWith("dummy-") ? "border-dashed opacity-80" : "",
                                      task.type === "linkedin" ? "border-[#0A66C2]/30" : "",
                                    )}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-2">
                                        {getTaskTypeIcon(task.type)}
                                        <Badge variant="outline" className={cn(
                                          "text-xs",
                                          task.type === "linkedin" && "border-[#0A66C2]/30 text-[#0A66C2]"
                                        )}>
                                          {getTaskTypeLabel(task.type)}
                                        </Badge>
                                        {task.id.startsWith("dummy-") && (
                                          <Badge variant="secondary" className="text-xs">
                                            Demo
                                          </Badge>
                                        )}
                                        </div>
                                        <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                                          {task.priority}
                                        </Badge>
                                      </div>
                                      <h4 className="font-medium mt-2">{task.title}</h4>
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
                                          <span className="text-xs">Due: {task.dueDate}</span>
                                        </div>
                                      )}

                                      <div className="flex justify-end mt-3">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => openEmailComposer(task)}
                                        >
                                          <Mail className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => router.push(`/dialer?taskId=${task.id}`)}
                                        >
                                          <Phone className="h-3 w-3" />
                                        </Button>
                                        {task.contact?.linkedin && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => window.open(task.contact?.linkedin, "_blank")}
                                          >
                                            <Linkedin className="h-3 w-3 text-[#0A66C2]" />
                                          </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))
                            }
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )
                })}
              </div>
            </DragDropContext>
          </TabsContent>

          <TabsContent value="list">
            <div className="border rounded-md">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Task</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Contact/Company</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Due Date</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Priority</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allTasks.map((task) => (
                    <tr key={task.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getTaskTypeIcon(task.type)}
                          <Badge variant="outline" className="text-xs">
                            {getTaskTypeLabel(task.type)}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-xs text-muted-foreground">{task.description}</div>
                      </td>
                      <td className="p-3">
                        {task.contact && (
                          <div className="flex items-center gap-2">
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
                              {task.company && <div className="text-muted-foreground">{task.company.name}</div>}
                            </div>
                          </div>
                        )}
                        {!task.contact && task.company && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs">{task.company.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {task.dueDate ? (
                          <div className="text-xs">{task.dueDate}</div>
                        ) : (
                          <div className="text-xs text-muted-foreground">—</div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className={cn("text-xs", getPriorityColor(task.priority))}>{task.priority}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {columns[task.status as keyof typeof columns]?.title || task.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => router.push(`/dialer?taskId=${task.id}`)}
                          >
                            <Phone className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEmailComposer(task)}
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                          {task.contact?.linkedin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => window.open(task.contact?.linkedin, "_blank")}
                            >
                              <Linkedin className="h-3 w-3 text-[#0A66C2]" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                value={emailTo}
                onChange={(event) => setEmailTo(event.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(event) => setEmailSubject(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-body">Body</Label>
              <Textarea
                id="email-body"
                value={emailBody}
                onChange={(event) => setEmailBody(event.target.value)}
                rows={6}
              />
            </div>
            {emailError && <div className="text-xs text-destructive">{emailError}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendEmail} disabled={emailStatus === "sending"}>
              {emailStatus === "sending" ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
