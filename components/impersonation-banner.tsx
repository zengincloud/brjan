"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Eye, X } from "lucide-react"
import { useRouter } from "next/navigation"

export function ImpersonationBanner() {
  const [impersonating, setImpersonating] = useState<{
    name: string
    email: string
  } | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/auth/user")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.isImpersonating && data?.user) {
          const name =
            data.user.firstName && data.user.lastName
              ? `${data.user.firstName} ${data.user.lastName}`
              : data.user.email
          setImpersonating({ name, email: data.user.email })
        }
      })
      .catch(() => {})
  }, [])

  const stopImpersonating = async () => {
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" })
      setImpersonating(null)
      router.push("/admin/users")
      router.refresh()
      window.location.href = "/admin/users"
    } catch {
      // fallback
      window.location.href = "/admin/users"
    }
  }

  if (!impersonating) return null

  return (
    <div className="bg-amber-500/90 text-black px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium">
      <Eye className="h-4 w-4" />
      <span>
        Viewing as <strong>{impersonating.name}</strong>
        {impersonating.name !== impersonating.email && (
          <span className="opacity-70"> ({impersonating.email})</span>
        )}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-xs bg-white/20 border-black/20 hover:bg-white/40 text-black"
        onClick={stopImpersonating}
      >
        <X className="h-3 w-3 mr-1" />
        Exit
      </Button>
    </div>
  )
}
