"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, UserCheck, MessageSquare, Reply } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type Campaign = {
  id: string
  name: string
  status: "draft" | "active" | "paused" | "completed"
  createdAt: string
  totalProspects: number
  invited: number
  accepted: number
  messaged: number
  replied: number
}

const statusColors: Record<Campaign["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-green-500/15 text-green-700 dark:text-green-400",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  completed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/linkedin/campaigns")
      .then(r => r.json())
      .then(d => setCampaigns(d.campaigns || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">LinkedIn Campaigns</h1>
        <Button asChild>
          <Link href="/linkedin/campaigns/new">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="mb-4">No campaigns yet</p>
          <Button asChild variant="outline">
            <Link href="/linkedin/campaigns/new">
              <Plus className="h-4 w-4 mr-2" />
              Create your first campaign
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => (
            <Link
              key={campaign.id}
              href={`/linkedin/campaigns/${campaign.id}`}
              className="block rounded-lg border p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{campaign.name}</h3>
                    <Badge className={statusColors[campaign.status]}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-xs">Prospects</span>
                    </div>
                    <p className="font-semibold text-center">{campaign.totalProspects}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                      <span className="text-xs">Invited</span>
                    </div>
                    <p className="font-semibold text-center">{campaign.invited}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span className="text-xs">Accepted</span>
                    </div>
                    <p className="font-semibold text-center">{campaign.accepted}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span className="text-xs">Messaged</span>
                    </div>
                    <p className="font-semibold text-center">{campaign.messaged}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                      <Reply className="h-3.5 w-3.5" />
                      <span className="text-xs">Replied</span>
                    </div>
                    <p className="font-semibold text-center">{campaign.replied}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
