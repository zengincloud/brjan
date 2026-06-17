"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import { Menu, Search, Phone, Zap, User, Building2, Loader2, ClipboardList, Send, X, Mic, Mail, MessageSquare, BarChart2, FileText, Users, Calendar, Activity, Settings, UserCircle, Building, Plug, Bell, Shield, CreditCard, LayoutDashboard, type LucideIcon } from "lucide-react"
import { UserProvider, useUser } from "@/hooks/use-user"
import { VoiceOrb } from "@/components/voice-orb"
import { HubSpotIdentity } from "@/components/hubspot-identity"
import { TodoPanel } from "@/components/todo-panel"
import { UserRoleProvider } from "@/hooks/use-user-role"
import { DashboardStatsProvider } from "@/hooks/use-dashboard-stats"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { AddProspectDialog } from "@/components/add-prospect-dialog"
import { AddAccountDialog } from "@/components/add-account-dialog"

type NavPage = { label: string; desc: string; href: string; icon: LucideIcon; keywords: string[] }

const NAV_PAGES: NavPage[] = [
  { label: "Prospects",                    desc: "View all contacts",                     href: "/prospects",                                   icon: User,           keywords: ["people", "contacts", "leads"] },
  { label: "Accounts",                     desc: "View all companies",                    href: "/accounts",                                    icon: Building2,      keywords: ["companies", "organizations", "firms"] },
  { label: "Dialer",                       desc: "Power dialer",                          href: "/dialer",                                      icon: Phone,          keywords: ["call", "calling", "phone", "dial", "power dialer"] },
  { label: "Sequences",                    desc: "Outreach sequences",                    href: "/sequences",                                   icon: Zap,            keywords: ["automation", "campaign", "cadence", "outreach"] },
  { label: "Prospecting — Leads",          desc: "Find new leads via Wiza",               href: "/prospecting/outbound?tab=leads",               icon: Search,         keywords: ["find leads", "research", "discover", "wiza", "prospecting"] },
  { label: "Prospecting — Accounts",       desc: "Find new companies via Wiza",           href: "/prospecting/outbound?tab=accounts",            icon: Search,         keywords: ["find companies", "research", "wiza", "prospecting"] },
  { label: "Call Recordings",              desc: "Review and search past calls",          href: "/call-recordings",                             icon: Mic,            keywords: ["recordings", "calls", "audio", "replay", "voicemail"] },
  { label: "Emailer",                      desc: "Draft and send emails",                 href: "/emailer",                                     icon: Mail,           keywords: ["email", "compose", "send", "inbox"] },
  { label: "LinkedIn",                     desc: "LinkedIn outreach",                     href: "/linkedin",                                    icon: MessageSquare,  keywords: ["linkedin", "social", "messages", "connect"] },
  { label: "Performance",                  desc: "Team performance metrics",              href: "/performance",                                 icon: BarChart2,      keywords: ["metrics", "analytics", "stats", "kpi", "dashboard"] },
  { label: "Reports",                      desc: "Activity and pipeline reports",         href: "/reports",                                     icon: FileText,       keywords: ["analytics", "export", "report", "pipeline"] },
  { label: "Salesfloor",                   desc: "Live team salesfloor",                  href: "/salesfloor",                                  icon: Users,          keywords: ["team", "live", "floor", "leaderboard"] },
  { label: "Scheduler",                    desc: "Schedule meetings",                     href: "/scheduler",                                   icon: Calendar,       keywords: ["calendar", "book", "schedule", "meeting"] },
  { label: "Activity",                     desc: "Recent activity feed",                  href: "/activity",                                    icon: Activity,       keywords: ["history", "log", "feed", "recent"] },
  { label: "Settings",                     desc: "Account settings",                      href: "/settings",                                    icon: Settings,       keywords: ["settings", "preferences", "config", "account"] },
  { label: "Settings — Profile",           desc: "Update name, avatar, timezone",         href: "/settings?tab=profile",                        icon: UserCircle,     keywords: ["name", "avatar", "profile", "photo", "timezone"] },
  { label: "Settings — Organization",      desc: "Organization name and details",         href: "/settings?tab=organization",                   icon: Building,       keywords: ["company", "org", "workspace", "organization"] },
  { label: "Settings — Team",              desc: "Invite and manage team members",        href: "/settings?tab=team",                           icon: Users,          keywords: ["team", "members", "invite", "roles"] },
  { label: "Settings — Integrations",      desc: "Connect Gmail, HubSpot, Salesforce",   href: "/settings?tab=integrations",                   icon: Plug,           keywords: ["gmail", "hubspot", "salesforce", "connect", "sync", "integration"] },
  { label: "Settings — Notifications",     desc: "Email and push notifications",          href: "/settings?tab=notifications",                  icon: Bell,           keywords: ["alerts", "email", "push", "notifications"] },
  { label: "Settings — Security",          desc: "Password and two-factor auth",          href: "/settings?tab=security",                       icon: Shield,         keywords: ["password", "2fa", "security", "auth"] },
  { label: "Settings — Billing",           desc: "Manage subscription and plan",          href: "/settings?tab=billing",                        icon: CreditCard,     keywords: ["plan", "payment", "upgrade", "subscription", "billing", "credit"] },
  { label: "Settings — Calling",           desc: "Phone numbers and voicemail",           href: "/settings?tab=calling-overview",               icon: Phone,          keywords: ["phone", "voicemail", "twilio", "numbers", "caller id"] },
  { label: "Settings — Deliverability",    desc: "Email domains and mailboxes",           href: "/settings?tab=deliverability-overview",        icon: Mail,           keywords: ["domain", "mailbox", "email", "spam", "deliverability", "dns"] },
  { label: "Settings — Meetings",          desc: "Meeting templates and notetaker bot",   href: "/settings?tab=meetings-templates",              icon: Calendar,       keywords: ["notetaker", "templates", "bot", "meeting", "recording"] },
]

function matchNavPages(q: string): NavPage[] {
  const lower = q.toLowerCase()
  return NAV_PAGES.filter(p =>
    p.label.toLowerCase().includes(lower) ||
    p.desc.toLowerCase().includes(lower) ||
    p.keywords.some(k => k.includes(lower) || lower.includes(k))
  ).slice(0, 5)
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Auth pages that should not have the dashboard shell
  const authPages = ['/login', '/signup', '/reset-password', '/auth/callback', '/onboarding']
  const isAuthPage = authPages.some(page => pathname?.startsWith(page))

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <UserProvider>
      <UserRoleProvider>
        <DashboardStatsProvider>
          <DashboardShellInner>{children}</DashboardShellInner>
          <VoiceOrb />
          <HubSpotIdentity />
        </DashboardStatsProvider>
      </UserRoleProvider>
    </UserProvider>
  )
}

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [todoOpen, setTodoOpen] = useState(false)
  const { toast } = useToast()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [addProspectOpen, setAddProspectOpen] = useState(false)
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [halCompose, setHalCompose] = useState<{ to: string; subject: string; body: string; meetingId?: string } | null>(null)
  const [sendingHalEmail, setSendingHalEmail] = useState(false)
  const [searchResults, setSearchResults] = useState<{ prospects: any[]; accounts: any[]; calls: any[]; pages: NavPage[] }>({ prospects: [], accounts: [], calls: [], pages: [] })
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const runSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults({ prospects: [], accounts: [], calls: [], pages: [] })
      return
    }
    setSearchLoading(true)
    const pages = matchNavPages(query)
    setSearchResults(prev => ({ ...prev, pages }))
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults({ prospects: data.prospects || [], accounts: data.accounts || [], calls: data.calls || [], pages })
      }
    } catch {
      // ignore
    } finally {
      setSearchLoading(false)
    }
  }, [])

  const handleSearchInput = (value: string) => {
    setSearchQuery(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => runSearch(value), 300)
  }

  // Reset search when dialog closes
  useEffect(() => {
    if (!isSearchOpen) {
      setSearchQuery("")
      setSearchResults({ prospects: [], accounts: [], calls: [], pages: [] })
    }
  }, [isSearchOpen])
  const { user } = useUser()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSettings = () => {
    router.push('/settings')
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail) setHalCompose(detail)
    }
    window.addEventListener("hal:compose", handler)
    return () => window.removeEventListener("hal:compose", handler)
  }, [])

  const sendHalEmail = async () => {
    if (!halCompose) return
    setSendingHalEmail(true)
    try {
      const endpoint = halCompose.meetingId
        ? `/api/meetings/${halCompose.meetingId}/send-followup`
        : "/api/emails/send"
      const body = halCompose.meetingId
        ? { to: halCompose.to, subject: halCompose.subject, bodyText: halCompose.body }
        : { to: halCompose.to, subject: halCompose.subject, bodyText: halCompose.body }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Email sent" })
      setHalCompose(null)
    } catch {
      toast({ title: "Failed to send", variant: "destructive" })
    } finally {
      setSendingHalEmail(false)
    }
  }

  const getUserInitials = () => {
    if (!user) return "U"
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    }
    if (user.firstName) {
      return user.firstName[0].toUpperCase()
    }
    return user.email[0].toUpperCase()
  }

  const getUserDisplayName = () => {
    if (!user) return "Loading..."
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    if (user.firstName) {
      return user.firstName
    }
    return user.email
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar className={`w-64 border-r border-border lg:block ${isSidebarOpen ? "block" : "hidden"}`} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ImpersonationBanner />
        {/* Top Header */}
        <header className="h-12 border-b border-border px-4 flex items-center justify-between gap-4 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center flex-1 gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex items-center w-full max-w-xl">
              <div className="relative w-full">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 pr-16 py-2 h-9 w-full bg-secondary/50 border-border focus:bg-background"
                  placeholder="Search people, accounts, emails..."
                  onClick={() => setIsSearchOpen(true)}
                  readOnly
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTodoOpen(true)}
              className="gap-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 px-2"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="text-xs font-medium">To Do</span>
            </Button>
            <div className="h-6 w-px bg-border mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 pl-2 pr-3">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-accent/20 text-accent text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline">{getUserDisplayName()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium">{getUserDisplayName()}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSettings}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Search Dialog */}
        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <DialogContent className="sm:max-w-[600px] p-0 flex flex-col max-h-[85vh]">
            <div className="border-b border-border p-4 shrink-0">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 bg-transparent border-0 focus-visible:ring-0 text-base"
                  placeholder="Search people, accounts, pages, recordings..."
                  autoFocus
                  value={searchQuery}
                  onChange={e => handleSearchInput(e.target.value)}
                />
                {searchLoading && <Loader2 className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />}
              </div>
            </div>
            <div className="overflow-auto flex-1">
              {!searchQuery.trim() ? (
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">Quick Actions</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => { setIsSearchOpen(false); router.push("/dialer") }}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/10 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Phone className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">Start Dialing Session</span>
                          <span className="text-xs text-muted-foreground block">Open the power dialer</span>
                        </div>
                      </button>
                      <button
                        onClick={() => { setIsSearchOpen(false); router.push("/sequences/new") }}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/10 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">Create New Sequence</span>
                          <span className="text-xs text-muted-foreground block">Set up automated outreach</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  {/* Pages */}
                  {searchResults.pages.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground px-4 py-1.5">Pages</h3>
                      {searchResults.pages.map((p) => {
                        const Icon = p.icon
                        return (
                          <button
                            key={p.href}
                            onClick={() => { setIsSearchOpen(false); router.push(p.href) }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-secondary/50 text-left transition-colors"
                          >
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{p.label}</p>
                              <p className="text-xs text-muted-foreground truncate">{p.desc}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* People */}
                  {searchResults.prospects.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground px-4 py-1.5">People</h3>
                      {searchResults.prospects.map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => { setIsSearchOpen(false); router.push(`/prospects/${p.id}`) }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-secondary/50 text-left transition-colors"
                        >
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[p.title, p.company].filter(Boolean).join(" at ")}
                            </p>
                          </div>
                          {p.email && <span className="text-xs text-muted-foreground truncate max-w-[150px]">{p.email}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Accounts */}
                  {searchResults.accounts.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground px-4 py-1.5">Accounts</h3>
                      {searchResults.accounts.map((a: any) => (
                        <button
                          key={a.id}
                          onClick={() => { setIsSearchOpen(false); router.push(`/accounts/${a.id}`) }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-secondary/50 text-left transition-colors"
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{a.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[a.industry, a.location].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Call Recordings */}
                  {searchResults.calls.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground px-4 py-1.5">Call Recordings</h3>
                      {searchResults.calls.map((c: any) => {
                        const dur = c.recordingDuration || c.duration
                        const mins = dur ? `${Math.floor(dur / 60)}m` : null
                        const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null
                        return (
                          <button
                            key={c.id}
                            onClick={() => { setIsSearchOpen(false); router.push(`/call-recordings?callId=${c.id}`) }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-secondary/50 text-left transition-colors"
                          >
                            <Mic className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{c.prospect?.name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {[c.outcome?.replace(/_/g, " "), mins, date].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* No results */}
                  {!searchLoading && searchResults.pages.length === 0 && searchResults.prospects.length === 0 && searchResults.accounts.length === 0 && searchResults.calls.length === 0 && searchQuery.length >= 2 && (
                    <div className="p-4 space-y-2">
                      <p className="text-xs text-muted-foreground text-center pb-1">No results for &ldquo;{searchQuery}&rdquo;</p>

                      {/* Contact */}
                      <div className="rounded-lg border border-border overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium">Contact not found — add them?</span>
                        </div>
                        <div className="flex divide-x divide-border">
                          <button
                            onClick={() => { setIsSearchOpen(false); setAddProspectOpen(true) }}
                            className="flex-1 text-xs py-2.5 hover:bg-secondary/50 transition-colors text-center text-muted-foreground hover:text-foreground"
                          >
                            Add manually
                          </button>
                          <button
                            onClick={() => { setIsSearchOpen(false); router.push(`/prospecting/outbound?tab=leads&name=${encodeURIComponent(searchQuery)}&autoSearch=true`) }}
                            className="flex-1 text-xs py-2.5 hover:bg-secondary/50 transition-colors text-center font-medium text-foreground"
                          >
                            Find via prospecting →
                          </button>
                        </div>
                      </div>

                      {/* Account */}
                      <div className="rounded-lg border border-border overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium">Account not found — add them?</span>
                        </div>
                        <div className="flex divide-x divide-border">
                          <button
                            onClick={() => { setIsSearchOpen(false); setAddAccountOpen(true) }}
                            className="flex-1 text-xs py-2.5 hover:bg-secondary/50 transition-colors text-center text-muted-foreground hover:text-foreground"
                          >
                            Add manually
                          </button>
                          <button
                            onClick={() => { setIsSearchOpen(false); router.push(`/prospecting/outbound?tab=accounts&keyword=${encodeURIComponent(searchQuery)}&autoSearch=true`) }}
                            className="flex-1 text-xs py-2.5 hover:bg-secondary/50 transition-colors text-center font-medium text-foreground"
                          >
                            Find via prospecting →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-5">{children}</main>
      </div>

      <TodoPanel open={todoOpen} onOpenChange={setTodoOpen} />

      <AddProspectDialog open={addProspectOpen} onOpenChange={setAddProspectOpen} />
      <AddAccountDialog open={addAccountOpen} onOpenChange={setAddAccountOpen} />

      {/* HAL6900 compose modal */}
      {halCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-medium">HAL6900 — Draft Ready</p>
              <button onClick={() => setHalCompose(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">To</p>
                <Input
                  value={halCompose.to}
                  onChange={(e) => setHalCompose({ ...halCompose, to: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Subject</p>
                <Input
                  value={halCompose.subject}
                  onChange={(e) => setHalCompose({ ...halCompose, subject: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Body</p>
                <Textarea
                  value={halCompose.body}
                  onChange={(e) => setHalCompose({ ...halCompose, body: e.target.value })}
                  rows={6}
                  className="text-sm resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setHalCompose(null)}>Cancel</Button>
                <Button size="sm" onClick={sendHalEmail} disabled={sendingHalEmail || !halCompose.to}>
                  {sendingHalEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Send className="h-3.5 w-3.5 mr-2" />}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
