"use client"

import * as React from "react"
import { useUser } from "@/hooks/use-user"

interface UserRoleContextValue {
  userRole: string | null
  isLoading: boolean
  isSuperAdmin: boolean
}

const UserRoleContext = React.createContext<UserRoleContextValue>({
  userRole: null,
  isLoading: true,
  isSuperAdmin: false,
})

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const { userRole, isLoading, isSuperAdmin } = useUser()

  const value = React.useMemo(
    () => ({ userRole, isLoading, isSuperAdmin }),
    [userRole, isLoading, isSuperAdmin]
  )

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  )
}

export function useUserRole() {
  return React.useContext(UserRoleContext)
}
