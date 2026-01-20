import { ProspectList } from "@/components/prospect-list"
import { ProspectStatusBoxes } from "@/components/prospect-status-boxes"

export default function ProspectsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Prospects</h1>
      <ProspectStatusBoxes />
      <ProspectList />
    </div>
  )
}
