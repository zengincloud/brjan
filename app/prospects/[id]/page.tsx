"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Mail, Phone, Linkedin, MapPin, Building, Briefcase, Calendar, Globe, Pencil, Zap, X, ClipboardList } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { CallHistory } from "@/components/call-history"
import { CallProspectDialog } from "@/components/call-prospect-dialog"
import { EditProspectDialog } from "@/components/edit-prospect-dialog"
import { SendEmailDialog } from "@/components/send-email-dialog"
import { CorrespondenceSummary } from "@/components/correspondence-summary"
import { ProspectPOV } from "@/components/prospect-pov"
import { AddToSequenceDialog } from "@/components/add-to-sequence-dialog"
import { CreateTaskDialog } from "@/components/create-task-dialog"

type POVData = {
  opportunity: string
  industryContext: string
  howToHelp: string
  angle: string
}

type Prospect = {
  id: string
  name: string
  email: string
  title?: string | null
  company?: string | null
  phone?: string | null
  location?: string | null
  linkedin?: string | null
  status: string
  sequence?: string | null
  sequenceStep?: string | null
  pdlData?: any
  povData?: POVData | null
  lastActivity: string
  createdAt: string
}

export default function ProspectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [prospect, setProspect] = useState<Prospect | null>(null)
  const [loading, setLoading] = useState(true)
  const [callDialogOpen, setCallDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [sequenceDialogOpen, setSequenceDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (params.id) {
      loadProspect(params.id as string)
    }
  }, [params.id])

  const loadProspect = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/prospects/${id}`)
      if (!response.ok) {
        throw new Error("Failed to load prospect")
      }
      const data = await response.json()
      setProspect(data.prospect)
    } catch (error) {
      console.error(error)
      alert("Failed to load prospect details")
    } finally {
      setLoading(false)
    }
  }

  const refreshData = () => {
    if (params.id) {
      loadProspect(params.id as string)
      setRefreshKey((prev) => prev + 1)
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>
  }

  if (!prospect) {
    return <div className="container mx-auto py-8">Prospect not found</div>
  }

  const pdlData = prospect.pdlData || {}

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/prospects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{prospect.name}</h1>
          <p className="text-muted-foreground">
            {prospect.title && <span>{prospect.title}</span>}
            {prospect.title && prospect.company && <span> at </span>}
            {prospect.company && <span>{prospect.company}</span>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Badge variant="outline" className="text-sm">
            {prospect.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(pdlData.emails && pdlData.emails.length > 0) || prospect.email ? (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">
                    {pdlData.emails && pdlData.emails.length > 1 ? "Emails" : "Email"}
                  </p>
                  <div className="space-y-1">
                    {pdlData.emails && pdlData.emails.length > 0 ? (
                      pdlData.emails.map((email: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <a href={`mailto:${email}`} className="text-sm font-medium hover:underline">
                            {email}
                          </a>
                          {index === 0 && pdlData.emails.length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                      ))
                    ) : (
                      <a href={`mailto:${prospect.email}`} className="text-sm font-medium hover:underline">
                        {prospect.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {prospect.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a href={`tel:${prospect.phone}`} className="text-sm font-medium hover:underline">
                    {prospect.phone}
                  </a>
                </div>
              </div>
            )}

            {prospect.linkedin && (
              <div className="flex items-center gap-3">
                <Linkedin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">LinkedIn</p>
                  <a
                    href={prospect.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline"
                  >
                    View Profile
                  </a>
                </div>
              </div>
            )}

            {prospect.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="text-sm font-medium">{prospect.location}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pdlData.seniorityLevel && (
              <div>
                <p className="text-sm text-muted-foreground">Seniority</p>
                <p className="text-sm font-medium">{pdlData.seniorityLevel}</p>
              </div>
            )}

            {pdlData.companySize && (
              <div>
                <p className="text-sm text-muted-foreground">Company Size</p>
                <p className="text-sm font-medium">{pdlData.companySize.toLocaleString()} employees</p>
              </div>
            )}

            {pdlData.industry && (
              <div>
                <p className="text-sm text-muted-foreground">Industry</p>
                <p className="text-sm font-medium">{pdlData.industry}</p>
              </div>
            )}

            {pdlData.buyerIntent && (
              <div>
                <p className="text-sm text-muted-foreground">Buyer Intent</p>
                <Badge variant={pdlData.buyerIntent === "high" ? "default" : "secondary"}>
                  {pdlData.buyerIntent}
                </Badge>
              </div>
            )}

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground">Added</p>
              <p className="text-sm font-medium">
                {formatDistanceToNow(new Date(prospect.createdAt), { addSuffix: true })}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Last Activity</p>
              <p className="text-sm font-medium">
                {formatDistanceToNow(new Date(prospect.lastActivity), { addSuffix: true })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Professional Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Professional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prospect.title && (
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Title</p>
                  <p className="text-sm font-medium">{prospect.title}</p>
                </div>
              </div>
            )}

            {prospect.company && (
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Company</p>
                  <p className="text-sm font-medium">{prospect.company}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sequence Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Sequence Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prospect.sequence ? (
              <>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">{prospect.sequence}</p>
                    </div>
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                      Active
                    </Badge>
                  </div>
                  {prospect.sequenceStep && (
                    <p className="text-xs text-muted-foreground">
                      Current step: {prospect.sequenceStep}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSequenceDialogOpen(true)}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Change Sequence
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-dashed text-center">
                  <Zap className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Not in any sequence</p>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={() => setSequenceDialogOpen(true)}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Add to Sequence
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Point of View */}
      <ProspectPOV povData={prospect.povData} />

      {/* AI Correspondence Summary */}
      <CorrespondenceSummary key={refreshKey} prospectId={prospect.id} prospectName={prospect.name} />

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => setEmailDialogOpen(true)} disabled={!prospect.email}>
          <Mail className="mr-2 h-4 w-4" />
          Send Email
        </Button>
        <Button variant="outline" onClick={() => setCallDialogOpen(true)} disabled={!prospect.phone}>
          <Phone className="mr-2 h-4 w-4" />
          Call
        </Button>
        <Button variant="outline" onClick={() => setTaskDialogOpen(true)}>
          <ClipboardList className="mr-2 h-4 w-4" />
          Create Task
        </Button>
        {prospect.linkedin && (
          <Button variant="outline" asChild>
            <a href={prospect.linkedin} target="_blank" rel="noopener noreferrer">
              <Linkedin className="mr-2 h-4 w-4" />
              LinkedIn Profile
            </a>
          </Button>
        )}
      </div>

      {/* Call History */}
      <CallHistory prospectId={prospect.id} key={`calls-${refreshKey}`} />

      {/* Dialogs */}
      <SendEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        prospect={prospect}
        onEmailSent={refreshData}
      />

      <CallProspectDialog
        open={callDialogOpen}
        onOpenChange={setCallDialogOpen}
        prospect={prospect}
        onCallCompleted={refreshData}
      />

      <EditProspectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        prospect={prospect}
        onProspectUpdated={refreshData}
      />

      <AddToSequenceDialog
        open={sequenceDialogOpen}
        onOpenChange={setSequenceDialogOpen}
        prospectId={prospect.id}
        prospectName={prospect.name}
        currentSequence={prospect.sequence}
        onSequenceAdded={refreshData}
      />

      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        prospect={{
          id: prospect.id,
          name: prospect.name,
          title: prospect.title,
          company: prospect.company,
          email: prospect.email,
          phone: prospect.phone,
          linkedin: prospect.linkedin,
        }}
        onTaskCreated={refreshData}
      />
    </div>
  )
}
