"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Mail,
  Phone,
  Linkedin,
  Clock,
  ArrowLeft,
  Plus,
  Play,
  Pause,
  Edit,
  Users,
  ArrowRight,
  Trash2,
  MoreHorizontal,
  ClipboardList,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Sequence = {
  id: string
  name: string
  description?: string
  status: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  steps: {
    id: string
    type: string
    name: string
    order: number
    delayDays: number
    delayHours: number
    emailSubject?: string
    emailBody?: string
    callScript?: string
    taskNotes?: string
  }[]
  prospectSequences: {
    id: string
    status: string
    currentStep: number
    startedAt: string
    nextActionAt?: string
    prospect: {
      id: string
      name: string
      email: string
      company?: string
      title?: string
    }
  }[]
}

type Prospect = {
  id: string
  name: string
  email: string
  company?: string
  title?: string
}

export default function SequenceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [sequence, setSequence] = useState<Sequence | null>(null)
  const [loading, setLoading] = useState(true)
  const [addProspectsOpen, setAddProspectsOpen] = useState(false)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [selectedProspects, setSelectedProspects] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [adding, setAdding] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [prospectToRemove, setProspectToRemove] = useState<{ id: string; name: string } | null>(null)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadSequence(params.id as string)
    }
  }, [params.id])

  const loadSequence = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sequences/${id}`)
      if (!response.ok) throw new Error("Failed to load sequence")
      const data = await response.json()
      setSequence(data.sequence)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to load sequence",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadProspects = async () => {
    try {
      const response = await fetch("/api/prospects")
      if (!response.ok) throw new Error("Failed to load prospects")
      const data = await response.json()
      setProspects(data.prospects || [])
    } catch (error) {
      console.error(error)
    }
  }

  const openAddProspectsDialog = () => {
    loadProspects()
    setAddProspectsOpen(true)
  }

  const addProspectsToSequence = async () => {
    if (selectedProspects.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one prospect",
        variant: "destructive",
      })
      return
    }

    try {
      setAdding(true)
      const response = await fetch(`/api/sequences/${params.id}/prospects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectIds: selectedProspects,
        }),
      })

      if (!response.ok) throw new Error("Failed to add prospects")

      const data = await response.json()

      toast({
        title: "Success",
        description: `Added ${data.added} prospect(s) to sequence`,
      })

      setAddProspectsOpen(false)
      setSelectedProspects([])
      loadSequence(params.id as string)
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to add prospects to sequence",
        variant: "destructive",
      })
    } finally {
      setAdding(false)
    }
  }

  const toggleSequenceStatus = async () => {
    if (!sequence) return

    try {
      const newStatus = sequence.status === "active" ? "paused" : "active"
      const response = await fetch(`/api/sequences/${sequence.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      if (!response.ok) throw new Error("Failed to update sequence")

      toast({
        title: "Success",
        description: `Sequence ${newStatus}`,
      })

      loadSequence(params.id as string)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to update sequence status",
        variant: "destructive",
      })
    }
  }

  const removeProspectFromSequence = async () => {
    if (!prospectToRemove || !sequence) return

    const prospectName = prospectToRemove.name
    const prospectId = prospectToRemove.id

    // Optimistic update - remove from UI immediately
    setSequence({
      ...sequence,
      prospectSequences: sequence.prospectSequences.filter(
        (ps) => ps.prospect.id !== prospectId
      ),
    })
    setRemoveDialogOpen(false)
    setProspectToRemove(null)

    try {
      setRemoving(true)
      const response = await fetch(
        `/api/sequences/${sequence.id}/prospects/${prospectId}`,
        { method: "DELETE" }
      )

      if (!response.ok) throw new Error("Failed to remove prospect")

      toast({
        title: "Removed",
        description: `${prospectName} removed from sequence`,
      })
    } catch (error) {
      console.error(error)
      // Revert on error - reload the data
      loadSequence(params.id as string)
      toast({
        title: "Error",
        description: "Failed to remove prospect from sequence",
        variant: "destructive",
      })
    } finally {
      setRemoving(false)
    }
  }

  const getStepIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "call":
        return <Phone className="h-4 w-4" />
      case "linkedin":
        return <Linkedin className="h-4 w-4" />
      case "task":
        return <ClipboardList className="h-4 w-4" />
      case "wait":
        return <Clock className="h-4 w-4" />
      default:
        return null
    }
  }

  const filteredProspects = prospects.filter(
    (p) =>
      !sequence?.prospectSequences.some((ps) => ps.prospect.id === p.id) &&
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>
  }

  if (!sequence) {
    return <div className="container mx-auto py-8">Sequence not found</div>
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/sequences")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{sequence.name}</h1>
          {sequence.description && (
            <p className="text-muted-foreground">{sequence.description}</p>
          )}
        </div>
        <Badge
          className={
            sequence.status === "active" ? "bg-accent/20 text-accent" : "bg-yellow-500/20"
          }
        >
          {sequence.status}
        </Badge>
        <Button variant="outline" onClick={() => router.push(`/sequences/${sequence.id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
        <Button onClick={toggleSequenceStatus}>
          {sequence.status === "active" ? (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Activate
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Prospects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sequence.prospectSequences.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {sequence.prospectSequences.filter((ps) => ps.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sequence.prospectSequences.filter((ps) => ps.status === "completed").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sequence.steps.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sequence Steps */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sequence Steps</CardTitle>
          <Badge variant="outline">{sequence.steps.length} steps</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {sequence.steps.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div className="px-3 py-2 rounded-lg bg-secondary flex items-center gap-2">
                  {getStepIcon(step.type)}
                  <div>
                    <div className="text-sm font-medium">{step.name}</div>
                    {(step.delayDays > 0 || step.delayHours > 0) && (
                      <div className="text-xs text-muted-foreground">
                        Wait {step.delayDays}d {step.delayHours}h
                      </div>
                    )}
                  </div>
                </div>
                {i < sequence.steps.length - 1 && (
                  <ArrowRight className="mx-2 h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prospects in Sequence */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Prospects in Sequence</CardTitle>
          <Button onClick={openAddProspectsDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Prospects
          </Button>
        </CardHeader>
        <CardContent>
          {sequence.prospectSequences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>No prospects in this sequence yet</p>
              <Button onClick={openAddProspectsDialog} className="mt-4">
                Add Prospects
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sequence.prospectSequences.map((ps) => (
                <div
                  key={ps.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => router.push(`/prospects/${ps.prospect.id}`)}
                  >
                    <div className="font-medium">{ps.prospect.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {ps.prospect.title && <span>{ps.prospect.title}</span>}
                      {ps.prospect.title && ps.prospect.company && <span> at </span>}
                      {ps.prospect.company && <span>{ps.prospect.company}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {ps.prospect.email}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={
                        ps.status === "active"
                          ? "bg-accent/20 text-accent"
                          : ps.status === "completed"
                            ? "bg-green-500/20 text-green-600"
                            : "bg-yellow-500/20 text-yellow-600"
                      }
                    >
                      {ps.status}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      Step {ps.currentStep + 1} of {sequence.steps.length}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/prospects/${ps.prospect.id}`)}
                      >
                        View Prospect
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setProspectToRemove({
                            id: ps.prospect.id,
                            name: ps.prospect.name,
                          })
                          setRemoveDialogOpen(true)
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove from Sequence
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Prospects Dialog */}
      <Dialog open={addProspectsOpen} onOpenChange={setAddProspectsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Prospects to Sequence</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search Prospects</Label>
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredProspects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No prospects available
                </div>
              ) : (
                filteredProspects.map((prospect) => (
                  <div
                    key={prospect.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedProspects.includes(prospect.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedProspects([...selectedProspects, prospect.id])
                        } else {
                          setSelectedProspects(
                            selectedProspects.filter((id) => id !== prospect.id)
                          )
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{prospect.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {prospect.title && <span>{prospect.title}</span>}
                        {prospect.title && prospect.company && <span> at </span>}
                        {prospect.company && <span>{prospect.company}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{prospect.email}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              {selectedProspects.length} prospect(s) selected
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProspectsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addProspectsToSequence} disabled={adding}>
              {adding ? "Adding..." : `Add ${selectedProspects.length} Prospect(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Prospect Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Sequence</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {prospectToRemove?.name} from this sequence?
              They will no longer receive any steps from this sequence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeProspectFromSequence}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
