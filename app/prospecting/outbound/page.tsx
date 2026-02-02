import { Suspense } from "react"
import { OutboundProspectingTabs } from "@/components/outbound-prospecting-tabs"

export default function OutboundProspectingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Outbound Prospecting</h1>
      <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
        <OutboundProspectingTabs />
      </Suspense>
    </div>
  )
}
