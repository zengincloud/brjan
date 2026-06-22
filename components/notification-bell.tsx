"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"

interface AppNotification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  createdAt: string
}

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = () => {
    fetch("/api/notifications")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
    setNotifications([])
  }

  const handleClick = async (n: AppNotification) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [n.id] }),
    })
    setNotifications((prev) => prev.filter((x) => x.id !== n.id))
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  const unread = notifications.length

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="relative gap-1.5 text-muted-foreground hover:text-foreground px-2"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-semibold text-primary-foreground flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-border bg-popover shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              You're all caught up
            </div>
          ) : (
            <ul className="divide-y divide-border max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className="w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
