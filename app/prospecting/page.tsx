"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ProspectingPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/prospecting/outbound")
  }, [router])

  return null
}
