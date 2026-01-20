import { DialerTabs } from "@/components/dialer-tabs"
import { Badge } from "@/components/ui/badge"

export default function DialerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dialer</h1>
        <div className="flex items-center gap-2">
          <Badge className="bg-accent/20 text-accent border-0 gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            System Ready
          </Badge>
        </div>
      </div>
      <DialerTabs />
    </div>
  )
}
