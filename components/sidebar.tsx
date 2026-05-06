"use client"

import { cn } from "@/lib/utils"
import {
  BarChart3,
  Calendar,
  ChevronDown,
  HomeIcon,
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
  MessageSquareText,
  Linkedin,
  MessagesSquare,
  Megaphone,
  Users,
  CircleDot,
  Dumbbell,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/use-user"

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  badge,
  indent = false,
}: {
  href: string
  icon: React.ElementType
  label: string
  active: boolean
  badge?: string
  indent?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors select-none",
        indent && "ml-3",
        active
          ? "bg-white/10 text-white font-medium"
          : "text-white/55 hover:text-white/85 hover:bg-white/[0.05]"
      )}
    >
      <Icon className={cn("h-[15px] w-[15px] shrink-0", active ? "text-white" : "text-white/40")} />
      <span className="flex-1 leading-none">{label}</span>
      {badge && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 leading-none">
          {badge}
        </span>
      )}
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pt-4 pb-1 text-[11px] font-medium text-white/30 uppercase tracking-wider select-none">
      {children}
    </p>
  )
}

export function Sidebar({ className }: { className?: string }) {
  const [isActivityOpen, setIsActivityOpen] = useState(false)
  const [isLinkedInOpen, setIsLinkedInOpen] = useState(false)
  const { user, creditStatus, userRole, isLoading } = useUser()
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

  const creditsRemaining = creditStatus?.creditsTotal === -1
    ? null
    : creditStatus?.creditsRemaining ?? null

  return (
    <div className={cn("flex flex-col h-full bg-sidebar-background overflow-hidden", className)}>

      {/* Workspace header */}
      <div className="px-3 pt-4 pb-2">
        <button className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md hover:bg-white/[0.05] transition-colors group">
          <div className="w-6 h-6 rounded-md bg-[hsl(100,78%,44%)] flex items-center justify-center shrink-0">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[13px] font-medium text-white/90 flex-1 text-left leading-none">
            boilerroom
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-white/30 group-hover:text-white/50 transition-colors" />
        </button>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 px-3 overflow-y-auto min-h-0 space-y-0.5">
        <NavItem href="/" icon={HomeIcon} label="Dashboard" active={pathname === "/"} />
        <NavItem href="/prospecting" icon={Search} label="Prospecting" active={pathname.startsWith("/prospecting")} />
        <NavItem href="/prospects" icon={Users2} label="Prospects" active={pathname === "/prospects"} />
        <NavItem href="/accounts" icon={Building2} label="Accounts" active={pathname === "/accounts"} />

        <SectionLabel>Outreach</SectionLabel>
        <NavItem href="/dialer" icon={Phone} label="Dialer" active={pathname === "/dialer"} />
        <NavItem href="/emailer" icon={Send} label="Emailer" active={pathname === "/emailer"} />
        <NavItem href="/sequences" icon={Zap} label="Sequences" active={pathname === "/sequences"} />
        <NavItem href="/scheduler" icon={CalendarClock} label="Scheduler" active={pathname === "/scheduler"} />
        <NavItem href="/tasks" icon={CheckSquare} label="Tasks" active={pathname === "/tasks"} />

        <SectionLabel>Activity</SectionLabel>
        <Collapsible open={isActivityOpen} onOpenChange={setIsActivityOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-[13px] text-white/55 hover:text-white/85 hover:bg-white/[0.05] transition-colors select-none">
              <BarChart3 className="h-[15px] w-[15px] shrink-0 text-white/40" />
              <span className="flex-1 text-left leading-none">Activity</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform text-white/30", isActivityOpen && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-0.5 space-y-0.5">
            <NavItem href="/activity/emails" icon={Mail} label="Emails Delivered" active={pathname === "/activity/emails"} indent />
            <NavItem href="/activity/calls" icon={PhoneCall} label="Calls Made" active={pathname === "/activity/calls"} indent />
            <NavItem href="/activity/meetings" icon={Calendar} label="Meetings Had" active={pathname === "/activity/meetings"} indent />
            <NavItem href="/activity/tasks" icon={CheckSquare} label="Tasks Done" active={pathname === "/activity/tasks"} indent />
          </CollapsibleContent>
        </Collapsible>
        <NavItem href="/recordings" icon={Mic} label="Call Recordings" active={pathname === "/recordings"} />
        <NavItem href="/reports" icon={FileBarChart} label="Reports" active={pathname === "/reports"} />
        <NavItem href="/activity/cold-call-practice" icon={Dumbbell} label="AI Roleplay" active={pathname === "/activity/cold-call-practice"} />

        <SectionLabel>LinkedIn</SectionLabel>
        <Collapsible open={isLinkedInOpen} onOpenChange={setIsLinkedInOpen}>
          <CollapsibleTrigger asChild>
            <button className={cn(
              "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-[13px] transition-colors select-none",
              pathname.startsWith("/linkedin")
                ? "bg-white/10 text-white font-medium"
                : "text-white/55 hover:text-white/85 hover:bg-white/[0.05]"
            )}>
              <Linkedin className="h-[15px] w-[15px] shrink-0 text-white/40" />
              <span className="flex-1 text-left leading-none">LinkedIn</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform text-white/30", isLinkedInOpen && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-0.5 space-y-0.5">
            <NavItem href="/linkedin/search" icon={Search} label="Search" active={pathname === "/linkedin/search"} indent />
            <NavItem href="/linkedin" icon={MessagesSquare} label="All Conversations" active={pathname === "/linkedin"} indent />
            <NavItem href="/linkedin/campaigns" icon={Megaphone} label="Campaigns" active={pathname.startsWith("/linkedin/campaigns")} indent />
            <NavItem href="/linkedin-templates" icon={MessageSquareText} label="Templates" active={pathname === "/linkedin-templates"} indent />
          </CollapsibleContent>
        </Collapsible>

        {userRole === "super_admin" && (
          <>
            <SectionLabel>Admin</SectionLabel>
            <NavItem href="/admin" icon={Shield} label="Admin" active={pathname.startsWith("/admin")} />
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] space-y-1.5">
        {isLoading ? (
          /* Skeleton while user data loads */
          <>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-3.5 h-3.5 rounded bg-white/10 animate-pulse shrink-0" />
              <div className="h-3 w-28 rounded bg-white/10 animate-pulse" />
            </div>
            <div className="h-8 w-full rounded-lg bg-white/10 animate-pulse" />
            <div className="h-8 w-full rounded-lg bg-white/[0.05] animate-pulse" />
            <div className="flex items-center gap-2.5 px-2 py-2">
              <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse shrink-0" />
              <div className="flex-1 h-3 rounded bg-white/10 animate-pulse" />
              <div className="w-3.5 h-3.5 rounded bg-white/10 animate-pulse shrink-0" />
            </div>
          </>
        ) : (
          <>
            {/* Credits indicator */}
            {creditsRemaining !== null && (
              <div className="flex items-center gap-2 px-2 py-1">
                <CircleDot className="h-3.5 w-3.5 text-white/30 shrink-0" />
                <span className="text-[12px] text-white/40">
                  {creditsRemaining} credits remaining
                </span>
              </div>
            )}

            {/* Upgrade button (trial users) */}
            {user?.tier === 'trial' && (
              <Link
                href="/upgrade"
                className="flex items-center justify-center w-full py-2 px-3 rounded-lg bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white text-[13px] font-semibold transition-colors shadow-[0_0_16px_hsl(100,78%,44%,0.25)]"
              >
                Upgrade Plan
              </Link>
            )}

            {/* Invite Team / Settings row */}
            <Link
              href="/settings?tab=team"
              className="flex items-center justify-center w-full py-2 px-3 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.05] text-[13px] transition-colors"
            >
              <Users className="h-3.5 w-3.5 mr-2 shrink-0" />
              Invite Team
            </Link>

            {/* User row */}
            <Link
              href="/settings"
              className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-white/[0.05] transition-colors group"
            >
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-accent leading-none">{getInitials()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-white/80 truncate leading-none">{getDisplayName()}</p>
              </div>
              <Settings className="h-3.5 w-3.5 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
