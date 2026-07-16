"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function EditSequenceRedirect() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/sequences/${params.id}`)
  }, [params.id, router])

  return null
}
