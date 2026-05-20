"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"

export type VoiceAction =
  | { action: "search_people"; params: { title?: string; location?: string; company?: string; keyword?: string; name?: string } }
  | { action: "search_companies"; params: { industry?: string; location?: string; size?: string; keyword?: string } }
  | { action: "navigate"; params: { page: "leads" | "accounts" | "prospecting" | "people" | "companies" | "settings" | "sequences" | "calls" | "dialer" | "activity" | "tasks" | "meetings" | "reports" } }
  | { action: "navigate_url"; params: { path: string } }
  | { action: "open_compose"; params: { to: string; subject: string; body: string; meetingId?: string } }
  | { action: "add_lead"; params: { name?: string; company?: string } }
  | { action: "add_account"; params: { company?: string } }
  | { action: "speak_only"; message: string }
  | { action: "unknown"; message: string }

const PAGE_ROUTES: Record<string, string> = {
  leads: "/prospects",
  accounts: "/accounts",
  prospecting: "/prospecting",
  people: "/prospects",
  companies: "/accounts",
  settings: "/settings",
  sequences: "/sequences",
  calls: "/activity/calls",
  dialer: "/dialer",
  activity: "/activity/calls",
  tasks: "/tasks",
  meetings: "/activity/meetings",
  reports: "/reports",
}

export function useVoiceAction() {
  const router = useRouter()

  const execute = useCallback((voiceAction: VoiceAction): string => {
    switch (voiceAction.action) {
      case "navigate": {
        const route = PAGE_ROUTES[voiceAction.params.page]
        if (route) router.push(route)
        return `Navigating to ${voiceAction.params.page}`
      }

      case "search_people": {
        const params = new URLSearchParams()
        if (voiceAction.params.title) params.set("title", voiceAction.params.title)
        if (voiceAction.params.location) params.set("location", voiceAction.params.location)
        if (voiceAction.params.company) params.set("company", voiceAction.params.company)
        if (voiceAction.params.keyword) params.set("keyword", voiceAction.params.keyword)
        if (voiceAction.params.name) params.set("name", voiceAction.params.name)
        params.set("autoSearch", "true")
        router.push(`/prospecting/outbound?${params.toString()}`)
        return `Searching for ${voiceAction.params.name || voiceAction.params.title || "people"}`
      }

      case "search_companies": {
        const params = new URLSearchParams()
        if (voiceAction.params.industry) params.set("industry", voiceAction.params.industry)
        if (voiceAction.params.location) params.set("location", voiceAction.params.location)
        if (voiceAction.params.size) params.set("size", voiceAction.params.size)
        if (voiceAction.params.keyword) params.set("keyword", voiceAction.params.keyword)
        router.push(`/prospecting?tab=companies&${params.toString()}`)
        return `Searching for companies`
      }

      case "add_lead":
        router.push("/prospects")
        return `Opening leads`

      case "add_account":
        router.push("/accounts")
        return `Opening accounts`

      case "navigate_url": {
        router.push(voiceAction.params.path)
        return "On it."
      }

      case "open_compose": {
        window.dispatchEvent(new CustomEvent("hal:compose", { detail: voiceAction.params }))
        return "Draft's ready."
      }

      case "speak_only":
        return voiceAction.message

      case "unknown":
        return voiceAction.message ?? "Sorry, I didn't understand that"
    }
  }, [router])

  return { execute }
}
