"use client"

import dynamic from "next/dynamic"
import { BRLoader } from "@/components/ui/br-loader"

const DialerContent = dynamic(() => import("./dialer-content"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[60vh]">
      <BRLoader />
    </div>
  ),
})

export default function DialerPage() {
  return <DialerContent />
}
