import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mail, Phone } from "lucide-react"

const activities = [
  {
    id: 1,
    type: "email",
    user: "John Doe",
    action: "sent an email to",
    target: "Sarah Smith",
    time: "2 hours ago",
  },
  {
    id: 2,
    type: "call",
    user: "Emily Brown",
    action: "had a call with",
    target: "Michael Johnson",
    time: "4 hours ago",
  },
  {
    id: 3,
    type: "email",
    user: "David Wilson",
    action: "sent an email to",
    target: "Tech Corp",
    time: "Yesterday",
  },
  {
    id: 4,
    type: "call",
    user: "Sarah Smith",
    action: "missed a call with",
    target: "Startup Inc",
    time: "Yesterday",
  },
]

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              <Avatar className="mt-1">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>
                  {activity.user
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-none">
                    {activity.user} {activity.action} {activity.target}
                  </p>
                  {activity.type === "email" ? (
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
