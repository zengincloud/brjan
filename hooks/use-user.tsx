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
