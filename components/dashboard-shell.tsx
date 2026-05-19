"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import { Menu, Search, Zap, User, Building2, Loader2, ClipboardList } from "lucide-react"
import { UserProvider, useUser } from "@/hooks/use-user"
import { VoiceOrb } from "@/components/voice-orb"
import { HubSpotIdentity } from "@/components/hubspot-identity"
import { TodoPanel } from "@/components/todo-panel"
import { UserRoleProvider } from "@/hooks/use-user-role"
import { DashboardStatsProvider } from "@/hooks/use-dashboard-stats"
import { Input } from "@/components/ui/input"
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
  const [searchResults, setSearchResults] = useState<{ prospects: any[]; accounts: any[] }>({ prospects: [], accounts: [] })
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const runSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults({ prospects: [], accounts: [] })
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults({ prospects: data.prospects || [], accounts: data.accounts || [] })
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
      setSearchResults({ prospects: [], accounts: [] })
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
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
            <div className="border-b border-border p-4">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 bg-transparent border-0 focus-visible:ring-0 text-base"
                  placeholder="Search people, accounts..."
                  autoFocus
                  value={searchQuery}
                  onChange={e => handleSearchInput(e.target.value)}
                />
                {searchLoading && <Loader2 className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />}
              </div>
            </div>
            <div className="max-h-[400px] overflow-auto">
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
                  {/* Prospects */}
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

                  {/* No results */}
                  {!searchLoading && searchResults.prospects.length === 0 && searchResults.accounts.length === 0 && searchQuery.length >= 2 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No results for &ldquo;{searchQuery}&rdquo;</p>
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
    </div>
  )
}
