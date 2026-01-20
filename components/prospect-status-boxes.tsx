import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const statusData = [
  { label: "Total", value: 500, color: "bg-blue-100 text-blue-800" },
  { label: "Cold/Not Started", value: 200, color: "bg-gray-100 text-gray-800" },
  { label: "Working", value: 150, color: "bg-yellow-100 text-yellow-800" },
  { label: "Replied", value: 75, color: "bg-green-100 text-green-800" },
  { label: "Interested", value: 50, color: "bg-purple-100 text-purple-800" },
  { label: "Unresponsive", value: 25, color: "bg-red-100 text-red-800" },
]

export function ProspectStatusBoxes() {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {statusData.map((status) => (
        <Card key={status.label} className={status.color}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{status.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
