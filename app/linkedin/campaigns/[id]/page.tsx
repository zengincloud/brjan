"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Pause,
  Play,
  Trash2,
  Users,
  UserCheck,
  MessageSquare,
  Reply,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type Prospect = {
  id: string
  name: string
  company?: string
  title?: string
  status: "pending" | "invited" | "accepted" | "messaged" | "replied" | "ignored" | "failed"
  inviteSentAt?: string
  acceptedAt?: string
  messageSentAt?: string
  repliedAt?: string
}

type Campaign = {
  id: string
  name: string
  status: "draft" | "active" | "paused" | "completed"
  createdAt: string
  prospects: Prospect[]
  _count: { prospects: number }
}

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  invited: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  accepted: "bg-green-500/15 text-green-700 dark:text-green-400",
  messaged: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  replied: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  ignored: "bg-muted text-muted-foreground",
  failed: "bg-red-500/15 text-red-700 dark:text-red-400",
}

const campaignStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-green-500/15 text-green-700 dark:text-green-400",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  completed: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/linkedin/campaigns/${id}`)
      .then(r => r.json())
      .then(d => setCampaign(d.campaign))
      .finally(() => setLoading(false))
  }, [id])

  const handlePause = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/linkedin/campaigns/${id}/pause`, { method: "PATCH" })
      const data = await res.json()
      setCampaign(prev => prev ? { ...prev, status: data.campaign.status } : prev)
      toast({ title: "Campaign paused" })
    } catch {
      toast({ title: "Failed to pause", variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleResume = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/linkedin/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      })
      const data = await res.json()
      setCampaign(prev => prev ? { ...prev, status: data.campaign.status } : prev)
      toast({ title: "Campaign resumed" })
    } catch {
      toast({ title: "Failed to resume", variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      await fetch(`/api/linkedin/campaigns/${id}`, { method: "DELETE" })
      toast({ title: "Campaign deleted" })
      router.push("/linkedin/campaigns")
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" })
      setActionLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-muted-foreground text-sm">Loading...</div>
  if (!campaign) return <div className="p-8 text-muted-foreground text-sm">Campaign not found</div>

  const invited = campaign.prospects.filter(p =>
    ["invited", "accepted", "messaged", "replied"].includes(p.status)
  ).length
  const accepted = campaign.prospects.filter(p =>
    ["accepted", "messaged", "replied"].includes(p.status)
  ).length
  const messaged = campaign.prospects.filter(p =>
    ["messaged", "replied"].includes(p.status)
  ).length
  const replied = campaign.prospects.filter(p => p.status === "replied").length

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/linkedin/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge className={campaignStatusColors[campaign.status]}>{campaign.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Created {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === "active" && (
            <Button variant="outline" size="sm" onClick={handlePause} disabled={actionLoading}>
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button variant="outline" size="sm" onClick={handleResume} disabled={actionLoading}>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the campaign and all prospect records. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Invited", value: invited, icon: Users, total: campaign._count.prospects },
          { label: "Accepted", value: accepted, icon: UserCheck, total: invited },
          { label: "Messaged", value: messaged, icon: MessageSquare, total: accepted },
          { label: "Replied", value: replied, icon: Reply, total: messaged },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <stat.icon className="h-4 w-4" />
              <span className="text-sm">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            {stat.total > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((stat.value / stat.total) * 100)}%
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Prospects table */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Prospects ({campaign._count.prospects})
        </h2>
        {campaign.prospects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
            No prospects in this campaign yet
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Company</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Invited</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Accepted</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Messaged</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {campaign.prospects.map(prospect => (
                  <tr key={prospect.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{prospect.name}</p>
                        {prospect.title && (
                          <p className="text-xs text-muted-foreground">{prospect.title}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {prospect.company || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusColors[prospect.status]}>{prospect.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {prospect.inviteSentAt
                        ? format(new Date(prospect.inviteSentAt), "MMM d")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {prospect.acceptedAt
                        ? format(new Date(prospect.acceptedAt), "MMM d")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {prospect.messageSentAt
                        ? format(new Date(prospect.messageSentAt), "MMM d")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
