"use client"

import { useState } from "react"
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
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// Sample data for sequences
const sequences = [
  {
    id: 1,
    name: "Enterprise Cold Outreach",
    tags: ["SaaS", "Mid-Market", "Product-Led"],
    responseRate: 28,
    prospects: {
      active: 45,
      paused: 12,
      failed: 3,
      bounced: 5,
    },
    stats: {
      sent: 142,
      opened: 89,
      replied: 23,
      calls: 67,
    },
    openRate: 62,
    replyRate: 28,
    interests: 14,
    owner: {
      name: "Alex Johnson",
      avatar: "/placeholder.svg",
      initials: "AJ",
    },
    lastUpdated: "2 days ago",
    status: "active",
    steps: ["Email 1", "Call", "Email 2", "LinkedIn", "Call 2"],
    currentStep: 2,
  },
  {
    id: 2,
    name: "Sales Leaders",
    tags: ["Enterprise", "Decision Makers", "Leadership"],
    responseRate: 32,
    prospects: {
      active: 78,
      paused: 5,
      failed: 7,
      bounced: 3,
    },
    stats: {
      sent: 234,
      opened: 156,
      replied: 42,
      calls: 89,
    },
    openRate: 58,
    replyRate: 32,
    interests: 25,
    owner: {
      name: "Sarah Miller",
      avatar: "/placeholder.svg",
      initials: "SM",
    },
    lastUpdated: "1 day ago",
    status: "active",
    steps: ["Email 1", "LinkedIn", "Call", "Email 2"],
    currentStep: 3,
  },
  {
    id: 3,
    name: "CROs",
    tags: ["C-Suite", "Enterprise", "Revenue"],
    responseRate: 18,
    prospects: {
      active: 32,
      paused: 8,
      failed: 4,
      bounced: 2,
    },
    stats: {
      sent: 98,
      opened: 45,
      replied: 12,
      calls: 34,
    },
    openRate: 45,
    replyRate: 18,
    interests: 6,
    owner: {
      name: "Michael Chen",
      avatar: "/placeholder.svg",
      initials: "MC",
    },
    lastUpdated: "3 days ago",
    status: "paused",
    steps: ["Email 1", "Call", "Email 2", "Call 2", "Email 3"],
    currentStep: 1,
  },
]

export function SequencesList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const filteredSequences = sequences.filter(
    (sequence) =>
      sequence.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sequence.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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
        <Button className="gap-2 bg-accent hover:bg-accent/90">
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

        <TabsContent value="all" className="mt-6">
          <div className="grid gap-4">
            {filteredSequences.map((sequence) => (
              <Card
                key={sequence.id}
                className={cn(
                  "border-border bg-card overflow-hidden transition-all hover:border-accent/30",
                  sequence.status === "active" && "border-l-2 border-l-accent"
                )}
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
                  <div className="flex gap-1.5 ml-2">
                    {sequence.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
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
                          Running
                        </>
                      ) : (
                        <>
                          <Pause className="w-3 h-3" />
                          Paused
                        </>
                      )}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
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
                      <div className="flex items-center gap-1 flex-wrap mb-4">
                        {sequence.steps.map((step, i) => (
                          <div key={step} className="flex items-center">
                            <div
                              className={cn(
                                "px-2 py-1 rounded text-xs",
                                i < sequence.currentStep
                                  ? "bg-accent/30 text-accent"
                                  : i === sequence.currentStep
                                    ? "bg-accent text-accent-foreground"
                                    : "bg-secondary text-muted-foreground"
                              )}
                            >
                              {step}
                            </div>
                            {i < sequence.steps.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-muted-foreground mx-1" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-4 gap-2">
                        <div className="p-2 rounded-lg bg-secondary/30 text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Mail className="w-3 h-3" />
                          </div>
                          <div className="text-sm font-semibold">{sequence.stats.sent}</div>
                          <div className="text-[10px] text-muted-foreground">Sent</div>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/30 text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                          <div className="text-sm font-semibold">{sequence.stats.opened}</div>
                          <div className="text-[10px] text-muted-foreground">Opened</div>
                        </div>
                        <div className="p-2 rounded-lg bg-accent/10 text-center">
                          <div className="flex items-center justify-center gap-1 text-accent mb-1">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                          <div className="text-sm font-semibold text-accent">{sequence.stats.replied}</div>
                          <div className="text-[10px] text-muted-foreground">Replied</div>
                        </div>
                        <div className="p-2 rounded-lg bg-secondary/30 text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Phone className="w-3 h-3" />
                          </div>
                          <div className="text-sm font-semibold">{sequence.stats.calls}</div>
                          <div className="text-[10px] text-muted-foreground">Calls</div>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Response Rate */}
                    <div className="lg:col-span-4 lg:border-x border-border lg:px-6">
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1 text-sm">
                            <span className="text-muted-foreground">Response Rate</span>
                            <span className="font-semibold text-accent">{sequence.responseRate}%</span>
                          </div>
                          <Progress value={sequence.responseRate} className="h-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Open Rate</p>
                            <p className="text-lg font-semibold">{sequence.openRate}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Reply Rate</p>
                            <p className="text-lg font-semibold">{sequence.replyRate}%</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={sequence.owner.avatar || "/placeholder.svg"} />
                            <AvatarFallback className="text-[10px] bg-accent/20 text-accent">
                              {sequence.owner.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {sequence.owner.name} · {sequence.lastUpdated}
                          </span>
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
                          <span className="font-medium">{sequence.prospects.active}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Pause className="h-3 w-3 text-yellow-500" />
                          <span className="flex-1">Paused</span>
                          <span className="font-medium">{sequence.prospects.paused}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <AlertCircle className="h-3 w-3 text-red-500" />
                          <span className="flex-1">Failed</span>
                          <span className="font-medium">{sequence.prospects.failed}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 text-xs bg-transparent">
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
                        >
                          {sequence.status === "active" ? "Pause" : "Resume"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          <p className="text-muted-foreground">Active sequences will appear here.</p>
        </TabsContent>
        <TabsContent value="paused" className="mt-6">
          <p className="text-muted-foreground">Paused sequences will appear here.</p>
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          <p className="text-muted-foreground">Completed sequences will appear here.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
