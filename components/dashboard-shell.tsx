"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { Menu, Mail, Phone, Search, Bell, Zap } from "lucide-react"
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

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { toast } = useToast()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const handleCall = () => {
    toast({
      title: "Initiating Call",
      description: "Opening dialer...",
    })
  }

  const handleEmail = () => {
    toast({
      title: "New Email",
      description: "Opening email composer...",
    })
  }

  const handleProfileAction = (action: string) => {
    toast({
      title: action,
      description: `Opening ${action.toLowerCase()}...`,
    })
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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar className={`w-64 border-r border-border lg:block ${isSidebarOpen ? "block" : "hidden"}`} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-border px-4 flex items-center justify-between gap-4 bg-card/50 backdrop-blur-sm">
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
              size="icon"
              className="relative text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCall}
              className="text-muted-foreground hover:text-accent hover:bg-accent/10"
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEmail}
              className="text-muted-foreground hover:text-accent hover:bg-accent/10"
            >
              <Mail className="h-4 w-4" />
            </Button>
            <div className="h-6 w-px bg-border mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 pl-2 pr-3">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback className="bg-accent/20 text-accent text-xs">JD</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline">John Doe</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <div className="font-medium">John Doe</div>
                  <div className="text-xs text-muted-foreground">john@company.com</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleProfileAction("Profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleProfileAction("Settings")}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleProfileAction("Logout")}>
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
                  placeholder="Search across people, accounts, emails, calls..."
                  autoFocus
                />
              </div>
            </div>
            <div className="p-4 max-h-[400px] overflow-auto">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">Recent Searches</h3>
                  <div className="space-y-1">
                    {["TechCorp account details", "John Doe contact info", "Enterprise Outreach sequence"].map(
                      (item) => (
                        <button
                          key={item}
                          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary/50 text-left transition-colors"
                        >
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item}</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2 px-2">Quick Actions</h3>
                  <div className="space-y-1">
                    <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/10 text-left transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">Start Dialing Session</span>
                        <span className="text-xs text-muted-foreground block">Begin parallel dialing</span>
                      </div>
                    </button>
                    <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/10 text-left transition-colors group">
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
            </div>
          </DialogContent>
        </Dialog>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
