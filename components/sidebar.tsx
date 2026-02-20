"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  Calendar,
  ChevronDown,
  HomeIcon,
  LayoutDashboard,
  Mail,
  Phone,
  Search,
  Settings,
  Users2,
  CheckSquare,
  PhoneCall,
  FileBarChart,
  Mic,
  CalendarClock,
  Building2,
  Send,
  Zap,
  Shield,
  MessageSquare,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/use-user"

export function Sidebar({ className }: { className?: string }) {
  const [isActivityOpen, setIsActivityOpen] = useState(false)
  const { user, creditStatus, userRole } = useUser()
  const pathname = usePathname()

  const getInitials = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`
    if (user?.firstName) return user.firstName[0]
    if (user?.email) return user.email[0].toUpperCase()
    return "?"
  }

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`
    if (user?.firstName) return user.firstName
    return user?.email || ""
  }

  return (
    <div className={cn("bg-sidebar-background pt-4 px-4 flex flex-col gap-4", className)}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <Zap className="h-4 w-4 text-accent-foreground" />
        </div>
        <div className="font-semibold flex items-baseline">
          <span className="text-foreground">boilerroom</span>
          <span className="text-accent">.ai</span>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="px-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs text-accent font-medium">Dialer Ready</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="space-y-1">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start transition-colors",
            pathname === "/" && "bg-accent/10 text-accent hover:bg-accent/15"
          )}
          asChild
        >
          <Link href="/">
            <HomeIcon className="h-4 w-4 mr-3" />
            Dashboard
          </Link>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start transition-colors",
            pathname.includes("/prospecting") && "bg-accent/10 text-accent hover:bg-accent/15"
          )}
          asChild
        >
          <Link href="/prospecting">
            <Search className="h-4 w-4 mr-3" />
            Prospecting
          </Link>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start transition-colors",
            pathname === "/prospects" && "bg-accent/10 text-accent hover:bg-accent/15"
          )}
          asChild
        >
          <Link href="/prospects">
            <Users2 className="h-4 w-4 mr-3" />
            Prospects
          </Link>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start transition-colors",
            pathname === "/accounts" && "bg-accent/10 text-accent hover:bg-accent/15"
          )}
          asChild
        >
          <Link href="/accounts">
            <Building2 className="h-4 w-4 mr-3" />
            Accounts
          </Link>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start transition-colors",
            pathname === "/sequences" && "bg-accent/10 text-accent hover:bg-accent/15"
          )}
          asChild
        >
          <Link href="/sequences">
            <Mail className="h-4 w-4 mr-3" />
            Sequences
          </Link>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start transition-colors",
            pathname === "/tasks" && "bg-accent/10 text-accent hover:bg-accent/15"
          )}
          asChild
        >
          <Link href="/tasks">
            <CheckSquare className="h-4 w-4 mr-3" />
            Tasks
          </Link>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start transition-colors",
            pathname === "/emailer" && "bg-accent/10 text-accent hover:bg-accent/15"
          )}
          asChild
        >
          <Link href="/emailer">
            <Send className="h-4 w-4 mr-3" />
            Emailer
          </Link>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start transition-colors",
            pathname === "/messages" && "bg-accent/10 text-accent hover:bg-accent/15"
          )}
          asChild
        >
          <Link href="/messages">
            <MessageSquare className="h-4 w-4 mr-3" />
            Messages
          </Link>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start transition-colors",
            pathname === "/dialer" && "bg-accent/10 text-accent hover:bg-accent/15"
          )}
          asChild
        >
          <Link href="/dialer">
            <Phone className="h-4 w-4 mr-3" />
            Dialer
            <Badge className="ml-auto bg-accent/20 text-accent border-0 text-[10px] px-1.5">New</Badge>
          </Link>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start transition-colors",
            pathname === "/scheduler" && "bg-accent/10 text-accent hover:bg-accent/15"
          )}
          asChild
        >
          <Link href="/scheduler">
            <CalendarClock className="h-4 w-4 mr-3" />
            Scheduler
          </Link>
        </Button>

        {/* Activity Section */}
        <Collapsible open={isActivityOpen} onOpenChange={setIsActivityOpen} className="space-y-1">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <div className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-3" />
                Activity
              </div>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform duration-200", isActivityOpen ? "rotate-180" : "")}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start pl-9 text-muted-foreground hover:text-foreground",
                pathname === "/activity/emails" && "bg-accent/10 text-accent"
              )}
              asChild
            >
              <Link href="/activity/emails">
                <Mail className="h-4 w-4 mr-3" />
                Emails Delivered
              </Link>
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start pl-9 text-muted-foreground hover:text-foreground",
                pathname === "/activity/calls" && "bg-accent/10 text-accent"
              )}
              asChild
            >
              <Link href="/activity/calls">
                <PhoneCall className="h-4 w-4 mr-3" />
                Calls Made
              </Link>
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start pl-9 text-muted-foreground hover:text-foreground",
                pathname === "/activity/meetings" && "bg-accent/10 text-accent"
              )}
              asChild
            >
              <Link href="/activity/meetings">
                <Calendar className="h-4 w-4 mr-3" />
                Meetings Had
              </Link>
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start pl-9 text-muted-foreground hover:text-foreground",
                pathname === "/activity/tasks" && "bg-accent/10 text-accent"
              )}
              asChild
            >
              <Link href="/activity/tasks">
                <CheckSquare className="h-4 w-4 mr-3" />
                Tasks Done
              </Link>
            </Button>
          </CollapsibleContent>
        </Collapsible>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start transition-colors",
            pathname === "/recordings" && "bg-accent/10 text-accent hover:bg-accent/15"
          )}
          asChild
        >
          <Link href="/recordings">
            <Mic className="h-4 w-4 mr-3" />
            <span className="flex-1 text-left">Call Recordings</span>
          </Link>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start transition-colors",
            pathname === "/reports" && "bg-accent/10 text-accent hover:bg-accent/15"
          )}
          asChild
        >
          <Link href="/reports">
            <FileBarChart className="h-4 w-4 mr-3" />
            Reports
          </Link>
        </Button>
      </div>

      {/* Admin link */}
      {userRole === "super_admin" && (
        <div className="mt-auto">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start transition-colors",
              pathname.startsWith("/admin") && "bg-accent/10 text-accent hover:bg-accent/15"
            )}
            asChild
          >
            <Link href="/admin">
              <Shield className="h-4 w-4 mr-3" />
              Admin
            </Link>
          </Button>
        </div>
      )}

      {/* User Profile Card — pinned to bottom */}
      <Link
        href="/settings"
        className={cn(
          "block px-4 py-3 border-t border-border transition-colors hover:bg-secondary/50 cursor-pointer",
          !userRole?.includes("super_admin") && "mt-auto",
          pathname === "/settings" && "bg-secondary/50"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-accent">{getInitials()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{getDisplayName()}</p>
            {creditStatus && (
              <p className="text-[11px] text-muted-foreground">
                {creditStatus.creditsTotal === -1
                  ? "Unlimited"
                  : `${creditStatus.label} \u00B7 ${creditStatus.creditsRemaining} credits left`
                }
              </p>
            )}
          </div>
          <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
        {creditStatus && creditStatus.creditsTotal !== -1 && (
          <div className="mt-2 ml-12">
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  creditStatus.creditsUsed / creditStatus.creditsTotal >= 0.9
                    ? "bg-red-500"
                    : creditStatus.creditsUsed / creditStatus.creditsTotal >= 0.7
                      ? "bg-yellow-500"
                      : "bg-accent"
                )}
                style={{ width: `${Math.min((creditStatus.creditsUsed / creditStatus.creditsTotal) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </Link>
    </div>
  )
}
