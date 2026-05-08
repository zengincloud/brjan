"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { SalesfloorView } from "@/components/salesfloor-view"
import { BRLoader } from "@/components/ui/br-loader"

export default function SalesfloorPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && user.role !== "super_admin") {
      router.replace("/")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(100vh - 4rem)" }}>
        <BRLoader />
      </div>
    )
  }

  if (!user || user.role !== "super_admin") {
    return null
  }

  return <SalesfloorView />
}
