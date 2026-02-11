"use client"

import * as React from "react"

type UserRole = string | null

interface UserRoleContextValue {
  userRole: UserRole
  isLoading: boolean
  isSuperAdmin: boolean
}

const UserRoleContext = React.createContext<UserRoleContextValue>({
  userRole: null,
  isLoading: true,
  isSuperAdmin: false,
})

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = React.useState<UserRole>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    fetch("/api/auth/user")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user?.role) {
          setUserRole(data.user.role)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const value = React.useMemo(
    () => ({
      userRole,
      isLoading,
      isSuperAdmin: userRole === "super_admin",
    }),
    [userRole, isLoading]
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
