"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Search,
  Filter,
  MoreHorizontal,
  Zap,
  Plus,
  ArrowUpDown,
  SlidersHorizontal,
  Bookmark,
  Trash2,
  Send,
} from "lucide-react"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@/hooks/use-user"
import { TrialLimitBanner } from "@/components/trial-limit-banner"
import { TRIAL_LIMITS } from "@/lib/trial-limits"
import { BRLoader } from "@/components/ui/br-loader"

type Sequence = {
  id: string
  name: string
  description?: string
  status: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  steps: {
    id: string
    type: string
    name: string
    order: number
    delayDays: number
    delayHours: number
  }[]
  user?: {
    firstName?: string | null
    lastName?: string | null
    email: string
    avatarUrl?: string | null
  }
  stats: {
    active: number
    completed: number
    paused: number
    failed: number
    total: number
  }
}

function initialsFor(user: Sequence["user"]) {
  if (!user) return "?"
  if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  if (user.firstName) return user.firstName[0].toUpperCase()
  return user.email[0]?.toUpperCase() || "?"
}

function nameFor(user: Sequence["user"]) {
  if (!user) return "Unknown"
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
  if (user.firstName) return user.firstName
  return user.email
}

export function SequencesList() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  const [searchTerm, setSearchTerm] = useState("")
  const [topTab, setTopTab] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingSequence, setDeletingSequence] = useState<Sequence | null>(null)
  const [sortBy, setSortBy] = useState<"updated" | "name" | "active">("updated")

  useEffect(() => {
    loadSequences()
  }, [])

  const loadSequences = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/sequences")
      if (!response.ok) throw new Error("Failed to load sequences")
      const data = await response.json()
      setSequences(data.sequences)
    } catch (error) {
      console.error("Error loading sequences:", error)
    } finally {
      setLoading(false)
    }
  }

  const processSequences = async () => {
    try {
      setProcessing(true)
      const response = await fetch("/api/sequences/process", {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to process sequences")
      const data = await response.json()

      toast({
        title: "Sequences Processed",
        description: `Created ${data.callsCreated} calls, ${data.emailsCreated} emails, and ${data.tasksCreated} tasks`,
      })

      loadSequences()
    } catch (error) {
      console.error("Error processing sequences:", error)
      toast({
        title: "Error",
        description: "Failed to process sequences",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const toggleSequenceStatus = async (sequenceId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active"
    const isActive = newStatus === "active"

    const original = [...sequences]
    setSequences(sequences.map(s =>
      s.id === sequenceId ? { ...s, status: newStatus, isActive } : s
    ))

    try {
      const response = await fetch(`/api/sequences/${sequenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, isActive }),
      })

      if (!response.ok) {
        setSequences(original)
        throw new Error("Failed to update sequence")
      }

      toast({
        title: newStatus === "active" ? "Sequence Activated" : "Sequence Paused",
        description: `Sequence has been ${newStatus === "active" ? "activated" : "paused"}`,
      })
    } catch (error) {
      console.error("Error toggling sequence status:", error)
      toast({
        title: "Error",
        description: "Failed to update sequence status",
        variant: "destructive",
      })
    }
  }

  const deleteSequence = async () => {
    if (!deletingSequence) return

    const original = [...sequences]
    setSequences(sequences.filter(s => s.id !== deletingSequence.id))
    setDeleteDialogOpen(false)

    try {
      const response = await fetch(`/api/sequences/${deletingSequence.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        setSequences(original)
        throw new Error("Failed to delete sequence")
      }

      toast({
        title: "Sequence Deleted",
        description: `"${deletingSequence.name}" has been deleted`,
      })
    } catch (error) {
      console.error("Error deleting sequence:", error)
      toast({
        title: "Error",
        description: "Failed to delete sequence",
        variant: "destructive",
      })
    } finally {
      setDeletingSequence(null)
    }
  }

  const notBuilt = () => {
    toast({ title: "Coming soon", description: "This isn't wired up yet." })
  }

  let filteredSequences = sequences.filter((sequence) => {
    const matchesSearch = sequence.name.toLowerCase().includes(searchTerm.toLowerCase())
    if (statusFilter === "all") return matchesSearch
    if (statusFilter === "active") return matchesSearch && sequence.status === "active"
    if (statusFilter === "paused") return matchesSearch && sequence.status === "paused"
    if (statusFilter === "completed") return matchesSearch && sequence.stats.completed > 0
    return matchesSearch
  })

  filteredSequences = [...filteredSequences].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name)
    if (sortBy === "active") return b.stats.active - a.stats.active
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  const isTrialAtLimit = user?.tier === 'trial' && user?.role !== 'super_admin' && sequences.length >= TRIAL_LIMITS.sequences

  return (
    <div className="space-y-4">
      {user?.tier === 'trial' && user?.role !== 'super_admin' && (
        <TrialLimitBanner current={sequences.length} limit={TRIAL_LIMITS.sequences} resourceLabel="sequences" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sequences</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={processSequences}
            disabled={processing}
            title="Manually run due sequence steps now"
          >
            <Zap className="mr-2 h-4 w-4" />
            {processing ? "Processing..." : "Process Sequences"}
          </Button>
          <Button
            className="gap-2 disabled:opacity-50"
            onClick={() => router.push("/sequences/new")}
            disabled={isTrialAtLimit}
            title={isTrialAtLimit ? "Trial plan allows 1 sequence. Upgrade for more." : undefined}
          >
            <Plus className="h-4 w-4" />
            Create sequence
          </Button>
        </div>
      </div>

      {/* Top-level tabs */}
      <Tabs value={topTab} onValueChange={setTopTab}>
        <TabsList className="h-auto bg-transparent p-0 border-b border-border rounded-none w-full justify-start gap-6">
          <TabsTrigger
            value="all"
            className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            All Sequences
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Analytics
          </TabsTrigger>
          <TabsTrigger
            value="diagnostics"
            className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Diagnostics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn("gap-2 bg-transparent", showFilters && "bg-secondary")}
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter className="h-4 w-4" />
                Show Filters
              </Button>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search sequences..."
                  className="pl-9 bg-secondary/50 border-border"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={notBuilt}>
                <Bookmark className="h-4 w-4" />
                Save as new view
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("updated")}>Last updated</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("name")}>Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("active")}>Active prospects</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={notBuilt}>
                <SlidersHorizontal className="h-4 w-4" />
                View options
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="flex items-center gap-2">
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "paused", label: "Paused" },
                { key: "completed", label: "Completed" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    statusFilter === f.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-24">
              <BRLoader />
            </div>
          ) : filteredSequences.length === 0 ? (
            <Empty className="border border-dashed rounded-lg py-16">
              <EmptyHeader>
                <EmptyMedia>
                  <Send className="h-10 w-10 -rotate-45 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No sequences here!</EmptyTitle>
                <EmptyDescription>
                  Check again later or clear any applied filters. You can also create a new sequence.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex gap-2">
                  <Button onClick={() => router.push("/sequences/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create a sequence
                  </Button>
                  {(searchTerm || statusFilter !== "all") && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("")
                        setStatusFilter("all")
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-14">Activate</TableHead>
                    <TableHead className="min-w-[160px]">Name</TableHead>
                    <TableHead className="text-center">Optimizations</TableHead>
                    <TableHead className="text-center">Created by</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-center">Paused</TableHead>
                    <TableHead className="text-center">Not sent</TableHead>
                    <TableHead className="text-center">Bounced</TableHead>
                    <TableHead className="text-center">Spam Block...</TableHead>
                    <TableHead className="text-center">Finished</TableHead>
                    <TableHead className="text-center">Scheduled</TableHead>
                    <TableHead className="text-center">Delivered</TableHead>
                    <TableHead className="text-center">Reply</TableHead>
                    <TableHead className="text-center">Interested</TableHead>
                    <TableHead>Associated workflow</TableHead>
                    <TableHead className="w-14 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSequences.map((sequence) => (
                    <TableRow
                      key={sequence.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/sequences/${sequence.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={sequence.status === "active"}
                          onCheckedChange={() => toggleSequenceStatus(sequence.id, sequence.status)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {sequence.name}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">–</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center">
                          <Avatar className="h-6 w-6" title={nameFor(sequence.user)}>
                            <AvatarImage src={sequence.user?.avatarUrl || undefined} />
                            <AvatarFallback className="bg-accent/20 text-accent text-[10px]">
                              {initialsFor(sequence.user)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{sequence.stats.active}</TableCell>
                      <TableCell className="text-center">{sequence.stats.paused}</TableCell>
                      <TableCell className="text-center text-muted-foreground">–</TableCell>
                      <TableCell className="text-center text-muted-foreground">–</TableCell>
                      <TableCell className="text-center text-muted-foreground">–</TableCell>
                      <TableCell className="text-center">{sequence.stats.completed}</TableCell>
                      <TableCell className="text-center text-muted-foreground">–</TableCell>
                      <TableCell className="text-center text-muted-foreground">–</TableCell>
                      <TableCell className="text-center text-muted-foreground">–</TableCell>
                      <TableCell className="text-center text-muted-foreground">–</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1 font-normal">
                          <Zap className="h-3 w-3" />
                          Workflows 0
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/sequences/${sequence.id}`)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setDeletingSequence(sequence)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Empty className="border border-dashed rounded-lg py-16">
            <EmptyHeader>
              <EmptyTitle>Analytics coming soon</EmptyTitle>
              <EmptyDescription>
                Reply, bounce, and delivery tracking aren't wired up yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </TabsContent>

        <TabsContent value="diagnostics" className="mt-4">
          <Empty className="border border-dashed rounded-lg py-16">
            <EmptyHeader>
              <EmptyTitle>Diagnostics coming soon</EmptyTitle>
              <EmptyDescription>
                Sending-health checks aren't wired up yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sequence</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSequence?.name}"? This will remove the sequence and all its steps. Prospects already in this sequence will be unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSequence}
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
