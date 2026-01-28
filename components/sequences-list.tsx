"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Search,
  Filter,
  MoreHorizontal,
  Play,
  Pause,
  AlertCircle,
  Mail,
  Phone,
  CheckCircle2,
  ArrowRight,
  Zap,
  Plus,
  Users,
  Linkedin,
  Clock,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"

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
  stats: {
    active: number
    completed: number
    paused: number
    failed: number
    total: number
  }
}

export function SequencesList() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)

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

  const filteredSequences = sequences.filter((sequence) => {
    const matchesSearch = sequence.name.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === "all") return matchesSearch
    if (activeTab === "active") return matchesSearch && sequence.status === "active"
    if (activeTab === "paused") return matchesSearch && sequence.status === "paused"
    if (activeTab === "completed") return matchesSearch && sequence.stats.completed > 0

    return matchesSearch
  })

  const getStepIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="w-3 h-3" />
      case "call":
        return <Phone className="w-3 h-3" />
      case "linkedin":
      case "task":
        return <Linkedin className="w-3 h-3" />
      case "wait":
        return <Clock className="w-3 h-3" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
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
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
        <Button
          className="gap-2 bg-accent hover:bg-accent/90"
          onClick={() => router.push("/sequences/new")}
        >
          <Plus className="h-4 w-4" />
          Create Sequence
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="all">All Sequences</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading sequences...</div>
          ) : filteredSequences.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-muted-foreground">No sequences found.</p>
              <Button onClick={() => router.push("/sequences/new")} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Sequence
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredSequences.map((sequence) => (
                <Card
                  key={sequence.id}
                  className={cn(
                    "border-border bg-card overflow-hidden transition-all hover:border-accent/30 cursor-pointer",
                    sequence.status === "active" && "border-l-2 border-l-accent"
                  )}
                  onClick={() => router.push(`/sequences/${sequence.id}`)}
                >
                  {/* Sequence Header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/20">
                    <div className="flex gap-1.5">
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          sequence.status === "active" ? "bg-accent" : "bg-yellow-500"
                        )}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground">{sequence.name}</span>
                    {sequence.description && (
                      <span className="text-xs text-muted-foreground">· {sequence.description}</span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <Badge
                        className={cn(
                          "border-0 gap-1",
                          sequence.status === "active"
                            ? "bg-accent/20 text-accent"
                            : "bg-yellow-500/20 text-yellow-600"
                        )}
                      >
                        {sequence.status === "active" ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            Active
                          </>
                        ) : (
                          <>
                            <Pause className="w-3 h-3" />
                            {sequence.status}
                          </>
                        )}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left: Steps Visualization */}
                      <div className="lg:col-span-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-4 h-4 text-accent" />
                          <span className="text-sm font-medium">Sequence Steps</span>
                        </div>
                        {sequence.steps.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap mb-4">
                            {sequence.steps.map((step, i) => (
                              <div key={step.id} className="flex items-center">
                                <div className="px-2 py-1 rounded text-xs bg-secondary text-foreground flex items-center gap-1">
                                  {getStepIcon(step.type)}
                                  {step.name}
                                </div>
                                {i < sequence.steps.length - 1 && (
                                  <ArrowRight className="w-3 h-3 text-muted-foreground mx-1" />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mb-4">No steps configured</p>
                        )}

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-secondary/30 text-center">
                            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                              <CheckCircle2 className="w-3 h-3" />
                            </div>
                            <div className="text-sm font-semibold">{sequence.stats.completed}</div>
                            <div className="text-[10px] text-muted-foreground">Completed</div>
                          </div>
                          <div className="p-2 rounded-lg bg-accent/10 text-center">
                            <div className="flex items-center justify-center gap-1 text-accent mb-1">
                              <Users className="w-3 h-3" />
                            </div>
                            <div className="text-sm font-semibold text-accent">
                              {sequence.stats.total}
                            </div>
                            <div className="text-[10px] text-muted-foreground">Total</div>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Info */}
                      <div className="lg:col-span-4 lg:border-x border-border lg:px-6">
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Total Steps</p>
                            <p className="text-lg font-semibold">{sequence.steps.length}</p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                            <p className="text-sm">
                              {formatDistanceToNow(new Date(sequence.updatedAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Prospects & Actions */}
                      <div className="lg:col-span-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-accent" />
                          <span className="text-sm font-medium">Prospects</span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Play className="h-3 w-3 text-accent" />
                            <span className="flex-1">Active</span>
                            <span className="font-medium">{sequence.stats.active}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Pause className="h-3 w-3 text-yellow-500" />
                            <span className="flex-1">Paused</span>
                            <span className="font-medium">{sequence.stats.paused}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="h-3 w-3 text-red-500" />
                            <span className="flex-1">Failed</span>
                            <span className="font-medium">{sequence.stats.failed}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/sequences/${sequence.id}/edit`)
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            className={cn(
                              "flex-1 text-xs",
                              sequence.status === "active"
                                ? "bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30"
                                : "bg-accent hover:bg-accent/90"
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              // TODO: Toggle sequence status
                            }}
                          >
                            {sequence.status === "active" ? "Pause" : "Activate"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
