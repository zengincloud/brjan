"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Phone, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const cadences = [
  {
    id: 1,
    name: "Enterprise Outreach",
    steps: 5,
    active: 124,
    completed: 45,
  },
  {
    id: 2,
    name: "SMB Follow-up",
    steps: 3,
    active: 89,
    completed: 67,
  },
  {
    id: 3,
    name: "New Lead Welcome",
    steps: 4,
    active: 156,
    completed: 98,
  },
  {
    id: 4,
    name: "Product Demo Request",
    steps: 6,
    active: 78,
    completed: 34,
  },
]

export function CadenceView() {
  const { toast } = useToast()
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cadences.map((cadence) => (
        <Card key={cadence.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{cadence.name}</CardTitle>
            <Badge variant="outline">{cadence.steps} steps</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{Math.floor(cadence.steps * 0.6)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{Math.floor(cadence.steps * 0.4)}</span>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium">{cadence.active}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium">{cadence.completed}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Card className="flex items-center justify-center">
        <CardContent className="pt-6">
          <Button
            variant="outline"
            className="h-20 w-full"
            onClick={() =>
              toast({
                title: "Create Cadence",
                description: "Opening new cadence creator...",
              })
            }
          >
            <Plus className="mr-2 h-5 w-5" />
            Create New Cadence
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
