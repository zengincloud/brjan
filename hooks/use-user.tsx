"use client"

import * as React from "react"

interface UserData {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  role: string
  tier: string
  organizationId: string | null
  timezone: string | null
  workStartTime: string | null
  workEndTime: string | null
  workDays: string | null
  createdAt: string
  jobRole: string | null
  usageType: 'personal' | 'team' | null
  primaryGoal: string | null
  checklistDismissed: boolean
}

interface CreditStatus {
  tier: string
  label: string
  creditsUsed: number
  creditsTotal: number
  creditsRemaining: number
  resetsAt: string | null
}

interface UserContextValue {
  user: UserData | null
  creditStatus: CreditStatus | null
  isLoading: boolean
  isSuperAdmin: boolean
  userRole: string | null
  isImpersonating: boolean
  refreshUser: () => Promise<void>
}

const UserContext = React.createContext<UserContextValue>({
  user: null,
  creditStatus: null,
  isLoading: true,
  isSuperAdmin: false,
  userRole: null,
  isImpersonating: false,
  refreshUser: async () => {},
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserData | null>(null)
  const [creditStatus, setCreditStatus] = React.useState<CreditStatus | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isImpersonating, setIsImpersonating] = React.useState(false)

  const fetchUser = React.useCallback(async () => {
    try {
      const response = await fetch("/api/auth/user")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user ?? null)
        setCreditStatus(data.creditStatus ?? null)
        setIsImpersonating(data.isImpersonating ?? false)
      }
    } catch (error) {
      console.error("Error fetching user:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Keep the sidebar credit count current: refetch after any successful write to a
  // credit-charging endpoint, and when the tab regains focus.
  React.useEffect(() => {
    const CREDIT_PATHS = ["/api/prospects", "/api/accounts", "/api/mock-calls", "/api/calling/numbers", "/api/extension"]
    const originalFetch = window.fetch
    let timer: ReturnType<typeof setTimeout> | undefined
    window.fetch = async (...args) => {
      const res = await originalFetch(...args)
      try {
        const input = args[0]
        const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url
        const method = (args[1]?.method || (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase()
        const path = url.startsWith("http") ? new URL(url).pathname : url
        if (res.ok && method !== "GET" && CREDIT_PATHS.some(p => path.startsWith(p))) {
          clearTimeout(timer)
          timer = setTimeout(fetchUser, 500)
        }
      } catch {}
      return res
    }
    const onFocus = () => { fetchUser() }
    window.addEventListener("focus", onFocus)
    return () => {
      window.fetch = originalFetch
      window.removeEventListener("focus", onFocus)
      clearTimeout(timer)
    }
  }, [fetchUser])

  const value = React.useMemo(
    () => ({
      user,
      creditStatus,
      isLoading,
      isSuperAdmin: user?.role === "super_admin",
      userRole: user?.role ?? null,
      isImpersonating,
      refreshUser: fetchUser,
    }),
    [user, creditStatus, isLoading, isImpersonating, fetchUser]
  )

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return React.useContext(UserContext)
}
