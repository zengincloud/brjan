"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { useUser } from "@/hooks/use-user"

const STORAGE_KEY = "hs_chat_activated"

declare global {
  interface Window {
    hsConversationsSettings: Record<string, unknown>
    hsConversationsOnReady: Array<() => void>
    openHubSpotChat?: () => void
    HubSpotConversations?: {
      widget: {
        open: () => void
        close: () => void
        load: () => void
        remove: () => void
      }
    }
  }
}

export function HubSpotIdentity() {
  const { user } = useUser()
  const [chatVisible, setChatVisible] = useState(false)

  useEffect(() => {
    // Prevent widget from auto-loading
    window.hsConversationsSettings = {
      ...window.hsConversationsSettings,
      loadImmediately: false,
    }

    const activate = (open = false) => {
      window.HubSpotConversations?.widget.load()
      if (open) window.HubSpotConversations?.widget.open()
      localStorage.setItem(STORAGE_KEY, "true")
      setChatVisible(true)
    }

    const whenReady = (fn: () => void) => {
      if (window.HubSpotConversations) {
        fn()
      } else {
        window.hsConversationsOnReady = window.hsConversationsOnReady || []
        window.hsConversationsOnReady.push(fn)
      }
    }

    // If user previously opened chat, restore the bubble (but don't re-open)
    if (localStorage.getItem(STORAGE_KEY) === "true") {
      whenReady(() => { activate(false); setChatVisible(true) })
    }

    // Expose global so sidebar can trigger it
    window.openHubSpotChat = () => whenReady(() => { activate(true); setChatVisible(true) })
  }, [])

  // Pass identity once user is available
  useEffect(() => {
    if (!user?.email) return
    window.hsConversationsSettings = {
      ...window.hsConversationsSettings,
      identificationEmail: user.email,
      loadImmediately: false,
    }
  }, [user])

  if (!chatVisible) return null

  return createPortal(
    <button
      onClick={() => {
        window.HubSpotConversations?.widget.remove()
        localStorage.removeItem(STORAGE_KEY)
        setChatVisible(false)
      }}
      style={{ zIndex: 2147483647 }}
      className="fixed bottom-[76px] left-[16px] w-4 h-4 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center hover:bg-zinc-700 transition-colors"
      title="Hide chat"
    >
      <X className="h-2.5 w-2.5 text-white/70" />
    </button>,
    document.body
  )
}
