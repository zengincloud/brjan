"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Phone,
  Clock,
  ChevronRight,
  Play,
  Users,
  Zap,
  Mail,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Pause,
  PhoneOff,
  Settings,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

// Sample data for accounts with AI ranking
const prioritizedAccounts = [
  { company: "Acme Corp", contacts: 5, priority: 98, touches: 7, hot: true },
  { company: "TechStart Inc", contacts: 3, priority: 94, touches: 4, hot: true },
  { company: "CloudFlow", contacts: 4, priority: 87, touches: 2, hot: false },
  { company: "DataSync", contacts: 2, priority: 82, touches: 1, hot: false },
  { company: "Nexus Labs", contacts: 6, priority: 76, touches: 0, hot: false },
]

// Sample sequences
const sequences = [
  { id: 1, name: "Enterprise Cold Outreach", sent: 142, replies: 23, calls: 89, active: true },
  { id: 2, name: "Sales Leaders", sent: 98, replies: 15, calls: 45, active: false },
  { id: 3, name: "CROs", sent: 67, replies: 12, calls: 34, active: false },
  { id: 4, name: "SMB Prospecting", sent: 234, replies: 42, calls: 120, active: false },
]

// Sample dialer lines
const dialerLines = [
  { name: "Sarah K.", status: "connected", duration: "2:34" },
  { name: "Mike T.", status: "ringing", duration: null },
  { name: "James L.", status: "ringing", duration: null },
  { name: "Lisa M.", status: "queued", duration: null },
  { name: "David R.", status: "queued", duration: null },
]

// Touch timeline for current prospect
const touchTimeline = [
  { type: "email", day: "Mon" },
  { type: "call", day: "Tue" },
  { type: "email", day: "Wed" },
  { type: "linkedin", day: "Thu" },
  { type: "call", day: "Fri" },
  { type: "email", day: "Mon" },
  { type: "call", day: "Today" },
]

// Sequence steps
const sequenceSteps = ["Email 1", "Call", "Email 2", "LinkedIn", "Call 2"]

// Next actions
const nextActions = [
  { task: "Send follow-up email to Sarah K.", time: "After call", next: true },
  { task: "Log call notes to CRM", time: "Automatic", next: false },
  { task: "Move to next prospect", time: "On hangup", next: false },
]

export function DialerView() {
  const [selectedSequence, setSelectedSequence] = useState<string>("1")
  const [dialingMode, setDialingMode] = useState<"power" | "parallel">("parallel")
  const [isDialerActive, setIsDialerActive] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<string>("Acme Corp")

  const activeSequence = sequences.find((s) => s.id.toString() === selectedSequence)

  return (
    <div className="space-y-6">
      {/* Dialer Configuration Bar */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Label htmlFor="dialing-mode" className="text-sm text-muted-foreground">
                  Mode
                </Label>
                <div className="flex items-center gap-2">
                  <Switch
                    id="dialing-mode"
                    checked={dialingMode === "parallel"}
                    onCheckedChange={(checked) => setDialingMode(checked ? "parallel" : "power")}
                  />
                  <span className="text-sm font-medium">
                    {dialingMode === "parallel" ? "Parallel (5 lines)" : "Power (1 line)"}
                  </span>
                </div>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground">Sequence</Label>
                <Select value={selectedSequence} onValueChange={setSelectedSequence}>
                  <SelectTrigger className="w-[200px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sequences.map((seq) => (
                      <SelectItem key={seq.id} value={seq.id.toString()}>
                        {seq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isDialerActive && (
                <Badge className="bg-accent/20 text-accent border-0 gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Dialer Active
                </Badge>
              )}
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                size="sm"
                className={cn(isDialerActive ? "bg-destructive hover:bg-destructive/90" : "bg-accent hover:bg-accent/90")}
                onClick={() => setIsDialerActive(!isDialerActive)}
              >
                {isDialerActive ? (
                  <>
                    <PhoneOff className="h-4 w-4 mr-2" />
                    End Session
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Dialing
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dialer Grid - Product Preview Style */}
      <Card className="border-border bg-card overflow-hidden">
        {/* Window Controls Bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-muted-foreground ml-2">Boilerroom Dialer</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ready to dial 7 contacts across 3 accounts</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
          {/* Left Panel - Prioritized Accounts */}
          <div className="lg:col-span-3 border-r border-border p-4 bg-secondary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                Prioritized Accounts
              </h3>
              <span className="text-xs text-accent font-medium">AI Ranked</span>
            </div>
            <div className="space-y-2">
              {prioritizedAccounts.map((account) => (
                <div
                  key={account.company}
                  onClick={() => setSelectedAccount(account.company)}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg transition-colors cursor-pointer",
                    account.company === selectedAccount
                      ? "bg-accent/10 border border-accent/30"
                      : account.hot
                        ? "bg-accent/5 border border-accent/20 hover:bg-accent/10"
                        : "hover:bg-secondary/50 border border-transparent"
                  )}
                >
                  <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground relative">
                    {account.company[0]}
                    {account.hot && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{account.company}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{account.contacts} contacts</span>
                      <span className="text-accent/70">·</span>
                      <span className="text-accent">{account.touches} touches</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        "text-xs font-bold",
                        account.priority >= 90 ? "text-accent" : "text-muted-foreground"
                      )}
                    >
                      {account.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Middle Panel - Sequence & Current Prospect */}
          <div className="lg:col-span-5 border-r border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                Sequence Loaded
              </h3>
              <Badge className="bg-accent text-accent-foreground border-0">Running</Badge>
            </div>

            {/* Active Sequence Detail */}
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">{activeSequence?.name}</span>
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {activeSequence?.sent} sent
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-accent" /> {activeSequence?.replies} replies
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {activeSequence?.calls} calls
                </span>
              </div>
              {/* Sequence Steps Visualization */}
              <div className="flex items-center gap-1 flex-wrap">
                {sequenceSteps.map((step, i) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={cn(
                        "px-2 py-1 rounded text-xs",
                        i < 2 ? "bg-accent/30 text-accent" : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {step}
                    </div>
                    {i < sequenceSteps.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-muted-foreground mx-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Current Prospect with Touch History */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-secondary text-muted-foreground text-sm">SK</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Sarah Kim</p>
                  <p className="text-xs text-muted-foreground">VP of Sales · Acme Corp</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20">
                  <Clock className="w-3 h-3 text-accent" />
                  <span className="text-xs text-accent font-medium">7 touches</span>
                </div>
              </div>
              {/* Touch Timeline */}
              <div className="flex items-center gap-2 text-xs">
                {touchTimeline.map((touch, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center",
                        i === touchTimeline.length - 1
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {touch.type === "email" ? (
                        <Mail className="w-3 h-3" />
                      ) : touch.type === "call" ? (
                        <Phone className="w-3 h-3" />
                      ) : (
                        <span className="text-[10px]">in</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px]",
                        i === touchTimeline.length - 1 ? "text-accent" : "text-muted-foreground"
                      )}
                    >
                      {touch.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
              <Button size="sm" className="flex-1 bg-accent hover:bg-accent/90">
                <Phone className="w-4 h-4 mr-2" />
                Call Now
              </Button>
            </div>
          </div>

          {/* Right Panel - Parallel Dialer & Next Actions */}
          <div className="lg:col-span-4 p-4">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-accent" />
                  Parallel Dialer
                </h3>
                <Badge className="bg-accent text-accent-foreground border-0">5 lines active</Badge>
              </div>
              <div className="space-y-2">
                {dialerLines.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg",
                      line.status === "connected"
                        ? "bg-accent/20 border border-accent/30"
                        : "bg-secondary/30"
                    )}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        line.status === "connected"
                          ? "bg-accent"
                          : line.status === "ringing"
                            ? "bg-yellow-500 animate-pulse"
                            : "bg-muted-foreground"
                      )}
                    />
                    <span className="text-sm text-foreground flex-1">{line.name}</span>
                    {line.duration ? (
                      <span className="text-xs text-accent font-mono">{line.duration}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground capitalize">{line.status}</span>
                    )}
                    {line.status === "connected" && (
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Pause className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-medium text-foreground">Next Actions Queued</h3>
                <span className="text-xs text-muted-foreground">(Auto)</span>
              </div>
              <div className="space-y-2">
                {nextActions.map((action, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg transition-all",
                      action.next
                        ? "bg-accent/10 border border-accent/30"
                        : "bg-secondary/30"
                    )}
                  >
                    {action.next ? (
                      <ArrowRight className="w-4 h-4 text-accent flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-sm text-muted-foreground flex-1">{action.task}</span>
                    <span className="text-xs text-accent/70">{action.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Stats */}
            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-3">Session Stats</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-lg bg-secondary/30">
                  <div className="text-lg font-bold text-accent">12</div>
                  <div className="text-xs text-muted-foreground">Calls Made</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/30">
                  <div className="text-lg font-bold text-accent">4</div>
                  <div className="text-xs text-muted-foreground">Connected</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/30">
                  <div className="text-lg font-bold text-accent">8:42</div>
                  <div className="text-xs text-muted-foreground">Talk Time</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
