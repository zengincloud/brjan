"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Mail, Phone, Linkedin, MapPin, Building, Briefcase, Calendar, Globe, Pencil, Zap, X, ClipboardList, Clock, ExternalLink, UserMinus, Loader2, Star, Plus, Trash2, Check, Sparkles, StickyNote } from "lucide-react"
import { Input } from "@/components/ui/input"
import { formatDistanceToNow, format } from "date-fns"
import { useUser } from "@/hooks/use-user"

function safeTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "Unknown"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "Unknown"
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return "Unknown"
  }
}
import { CallHistory } from "@/components/call-history"
import { CallProspectDialog } from "@/components/call-prospect-dialog"
import { EditProspectDialog } from "@/components/edit-prospect-dialog"
import { SendEmailDialog } from "@/components/send-email-dialog"
import { CorrespondenceSummary } from "@/components/correspondence-summary"
// ProspectPOV replaced with inline simplified view
import { AddToSequenceDialog } from "@/components/add-to-sequence-dialog"
import { CreateTaskDialog } from "@/components/create-task-dialog"
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
import { toast } from "sonner"

type POVData = {
  opportunity: string
  industryContext: string
  howToHelp: string
  angle: string
}

type CurrentStepDetails = {
  id: string
  name: string
  type: 'email' | 'call' | 'linkedin' | 'task' | 'wait'
  order: number
  sequenceId: string
  sequenceName: string
}

type AccountLink = {
  id: string
  name: string
}

type NoteEntry = {
  id: string
  text: string
  date: string
  initials: string
  userId: string
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
  notes?: string | null
  status: string
  sequence?: string | null
  sequenceStep?: string | null
  currentStepDetails?: CurrentStepDetails | null
  wizaData?: any
  povData?: POVData | null
  lastActivity: string
  createdAt: string
  accountId?: string | null
  account?: AccountLink | null
}

export default function ProspectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useUser()
  const [prospect, setProspect] = useState<Prospect | null>(null)
  const [loading, setLoading] = useState(true)
  const [callDialogOpen, setCallDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [sequenceDialogOpen, setSequenceDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [removeSequenceDialogOpen, setRemoveSequenceDialogOpen] = useState(false)
  const [removingFromSequence, setRemovingFromSequence] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showAddEmail, setShowAddEmail] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [emailActionLoading, setEmailActionLoading] = useState(false)
  const [editingEmail, setEditingEmail] = useState<string | null>(null)
  const [editEmailValue, setEditEmailValue] = useState("")
  const [enriching, setEnriching] = useState(false)
  const [editingAccount, setEditingAccount] = useState(false)
  const [accountSearch, setAccountSearch] = useState("")
  const [accountResults, setAccountResults] = useState<AccountLink[]>([])
  const [accountSearchLoading, setAccountSearchLoading] = useState(false)
  const [noteEntries, setNoteEntries] = useState<NoteEntry[]>([])
  const [newNoteText, setNewNoteText] = useState("")
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadProspect(params.id as string)
      loadNotes(params.id as string)
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

  const loadNotes = async (id: string) => {
    try {
      const response = await fetch(`/api/prospects/${id}/notes`)
      if (response.ok) {
        const data = await response.json()
        setNoteEntries(data.notes || [])
      }
    } catch {
      // ignore
    }
  }

  const addNote = async () => {
    if (!newNoteText.trim() || !params.id) return
    setAddingNote(true)
    try {
      const response = await fetch(`/api/prospects/${params.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newNoteText.trim() }),
      })
      if (response.ok) {
        const data = await response.json()
        setNoteEntries(data.notes)
        setNewNoteText("")
        toast.success("Note added")
      }
    } catch {
      toast.error("Failed to add note")
    } finally {
      setAddingNote(false)
    }
  }

  const deleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/prospects/${params.id}/notes`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      })
      if (response.ok) {
        const data = await response.json()
        setNoteEntries(data.notes)
        toast.success("Note removed")
      }
    } catch {
      toast.error("Failed to delete note")
    }
  }

  const refreshData = () => {
    if (params.id) {
      loadProspect(params.id as string)
      loadNotes(params.id as string)
      setRefreshKey((prev) => prev + 1)
    }
  }

  const addEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast.error("Enter a valid email address")
      return
    }
    setEmailActionLoading(true)
    try {
      const response = await fetch(`/api/prospects/${params.id}/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add email")
      }
      toast.success("Email added")
      setNewEmail("")
      setShowAddEmail(false)
      loadProspect(params.id as string)
    } catch (error: any) {
      toast.error(error.message || "Failed to add email")
    } finally {
      setEmailActionLoading(false)
    }
  }

  const setPrimaryEmail = async (email: string) => {
    setEmailActionLoading(true)
    try {
      const response = await fetch(`/api/prospects/${params.id}/emails`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) throw new Error("Failed to set primary")
      toast.success(`${email} set as primary`)
      loadProspect(params.id as string)
    } catch {
      toast.error("Failed to set primary email")
    } finally {
      setEmailActionLoading(false)
    }
  }

  const removeEmail = async (email: string) => {
    setEmailActionLoading(true)
    try {
      const response = await fetch(`/api/prospects/${params.id}/emails`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) throw new Error("Failed to remove email")
      toast.success("Email removed")
      loadProspect(params.id as string)
    } catch {
      toast.error("Failed to remove email")
    } finally {
      setEmailActionLoading(false)
    }
  }

  const editEmail = async (oldEmail: string) => {
    if (!editEmailValue.trim() || !editEmailValue.includes("@")) {
      toast.error("Enter a valid email address")
      return
    }
    if (editEmailValue.trim().toLowerCase() === oldEmail.toLowerCase()) {
      setEditingEmail(null)
      return
    }
    setEmailActionLoading(true)
    try {
      const response = await fetch(`/api/prospects/${params.id}/emails`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldEmail, newEmail: editEmailValue.trim() }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to edit email")
      }
      toast.success("Email updated")
      setEditingEmail(null)
      loadProspect(params.id as string)
    } catch (error: any) {
      toast.error(error.message || "Failed to edit email")
    } finally {
      setEmailActionLoading(false)
    }
  }

  const enrichProspect = async () => {
    setEnriching(true)
    try {
      const response = await fetch(`/api/prospects/${params.id}/enrich`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to enrich")
      }

      const results = data.enrichmentResults
      const parts: string[] = []
      if (results.newEmails > 0) parts.push(`${results.newEmails} new email${results.newEmails > 1 ? 's' : ''}`)
      if (results.newPhones > 0) parts.push(`${results.newPhones} new phone${results.newPhones > 1 ? 's' : ''}`)
      if (results.fieldsUpdated.length > 0) parts.push(`updated: ${results.fieldsUpdated.join(', ')}`)

      if (parts.length > 0) {
        toast.success(`Enriched: ${parts.join(', ')}`)
      } else {
        toast.info("No new information found")
      }

      loadProspect(params.id as string)
    } catch (error: any) {
      toast.error(error.message || "Failed to enrich prospect")
    } finally {
      setEnriching(false)
    }
  }

  const searchAccounts = async (query: string) => {
    setAccountSearch(query)
    if (query.length < 1) {
      setAccountResults([])
      return
    }
    setAccountSearchLoading(true)
    try {
      const response = await fetch(`/api/accounts?search=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setAccountResults((data.accounts || []).map((a: any) => ({ id: a.id, name: a.name })))
      }
    } catch {
      // ignore
    } finally {
      setAccountSearchLoading(false)
    }
  }

  const linkToAccount = async (accountId: string | null) => {
    try {
      const response = await fetch(`/api/prospects/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prospect!.name,
          email: prospect!.email,
          phone: prospect!.phone,
          title: prospect!.title,
          company: prospect!.company,
          location: prospect!.location,
          linkedin: prospect!.linkedin,
          accountId,
        }),
      })
      if (!response.ok) throw new Error("Failed to update")
      toast.success(accountId ? "Linked to account" : "Unlinked from account")
      setEditingAccount(false)
      setAccountSearch("")
      setAccountResults([])
      loadProspect(params.id as string)
    } catch {
      toast.error("Failed to update account link")
    }
  }

  const removeFromSequence = async () => {
    if (!prospect?.currentStepDetails) return

    const sequenceId = prospect.currentStepDetails.sequenceId
    const sequenceName = prospect.sequence

    // Optimistic update - clear sequence info from UI immediately
    setProspect({
      ...prospect,
      sequence: null,
      sequenceStep: null,
      currentStepDetails: null,
      status: 'contacted',
    })
    setRemoveSequenceDialogOpen(false)

    try {
      setRemovingFromSequence(true)
      const response = await fetch(
        `/api/sequences/${sequenceId}/prospects/${prospect.id}`,
        { method: "DELETE" }
      )

      if (!response.ok) throw new Error("Failed to remove from sequence")

      toast.success(`Removed from "${sequenceName}"`)
    } catch (error) {
      console.error(error)
      // Revert on error - reload the data
      loadProspect(params.id as string)
      toast.error("Failed to remove from sequence")
    } finally {
      setRemovingFromSequence(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>
  }

  if (!prospect) {
    return <div className="container mx-auto py-8">Prospect not found</div>
  }

  const wizaData = prospect.wizaData || {}

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'call':
        return <Phone className="h-4 w-4" />
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />
      case 'task':
        return <ClipboardList className="h-4 w-4" />
      case 'wait':
        return <Clock className="h-4 w-4" />
      default:
        return <Zap className="h-4 w-4" />
    }
  }

  const handleStepAction = () => {
    if (!prospect.currentStepDetails) return

    const stepType = prospect.currentStepDetails.type

    switch (stepType) {
      case 'email':
        setEmailDialogOpen(true)
        break
      case 'call':
        setCallDialogOpen(true)
        break
      case 'linkedin':
        if (prospect.linkedin) {
          window.open(prospect.linkedin, '_blank')
        }
        break
      case 'task':
        setTaskDialogOpen(true)
        break
      case 'wait':
        // Wait steps don't have an action
        break
    }
  }

  const getStepActionLabel = (type: string) => {
    switch (type) {
      case 'email':
        return 'Send Email'
      case 'call':
        return 'Make Call'
      case 'linkedin':
        return 'Open LinkedIn'
      case 'task':
        return 'Do Task'
      case 'wait':
        return 'Waiting...'
      default:
        return 'Action'
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/prospects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {prospect.name}
            {prospect.linkedin && (
              <a href={prospect.linkedin} target="_blank" rel="noopener noreferrer" title="View LinkedIn Profile">
                <Linkedin className="h-5 w-5 text-[#0A66C2] hover:opacity-80 transition-opacity" />
              </a>
            )}
          </h1>
          <p className="text-muted-foreground">
            {prospect.title && <span>{prospect.title}</span>}
            {prospect.title && prospect.company && <span> at </span>}
            {prospect.company && <span>{prospect.company}</span>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={enrichProspect} disabled={enriching}>
            {enriching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {enriching ? "Enriching..." : "Enrich"}
          </Button>
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
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-muted-foreground">Emails</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowAddEmail(!showAddEmail)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>

                {showAddEmail && (
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addEmail()}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button size="sm" className="h-8" onClick={addEmail} disabled={emailActionLoading}>
                      Add
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => { setShowAddEmail(false); setNewEmail("") }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <div className="space-y-1">
                  {(() => {
                    // Build unified email list: primary first, then others from wizaData
                    const allEmails: { email: string; isPrimary: boolean }[] = []
                    const seen = new Set<string>()

                    // Primary email first
                    if (prospect.email) {
                      allEmails.push({ email: prospect.email, isPrimary: true })
                      seen.add(prospect.email.toLowerCase())
                    }

                    // Then wizaData emails
                    if (wizaData.emails && Array.isArray(wizaData.emails)) {
                      for (const entry of wizaData.emails) {
                        const addr = typeof entry === "string" ? entry : entry?.email || ""
                        if (addr && !seen.has(addr.toLowerCase())) {
                          allEmails.push({ email: addr, isPrimary: false })
                          seen.add(addr.toLowerCase())
                        }
                      }
                    }

                    if (allEmails.length === 0) {
                      return <p className="text-sm text-muted-foreground italic">No emails added</p>
                    }

                    return allEmails.map(({ email, isPrimary }) => (
                      <div key={email} className="flex items-center gap-2 group">
                        <button
                          onClick={() => !isPrimary && setPrimaryEmail(email)}
                          disabled={emailActionLoading}
                          className="shrink-0"
                          title={isPrimary ? "Primary email" : "Click to set as primary"}
                        >
                          <Star className={`h-3.5 w-3.5 ${isPrimary ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/40 hover:text-yellow-500 cursor-pointer"}`} />
                        </button>
                        {editingEmail === email ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              type="email"
                              value={editEmailValue}
                              onChange={(e) => setEditEmailValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") editEmail(email)
                                if (e.key === "Escape") setEditingEmail(null)
                              }}
                              className="h-7 text-sm"
                              autoFocus
                            />
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editEmail(email)} disabled={emailActionLoading}>
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingEmail(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <a href={`mailto:${email}`} className="text-sm font-medium hover:underline flex-1 truncate">
                              {email}
                            </a>
                            {isPrimary && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Primary
                              </Badge>
                            )}
                            <button
                              onClick={() => { setEditingEmail(email); setEditEmailValue(email) }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              title="Edit email"
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                            <button
                              onClick={() => removeEmail(email)}
                              disabled={emailActionLoading}
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              title="Remove email"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>

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
            {wizaData.seniorityLevel && (
              <div>
                <p className="text-sm text-muted-foreground">Seniority</p>
                <p className="text-sm font-medium">{wizaData.seniorityLevel}</p>
              </div>
            )}

            {wizaData.companySize && (
              <div>
                <p className="text-sm text-muted-foreground">Company Size</p>
                <p className="text-sm font-medium">{wizaData.companySize.toLocaleString()} employees</p>
              </div>
            )}

            {wizaData.industry && (
              <div>
                <p className="text-sm text-muted-foreground">Industry</p>
                <p className="text-sm font-medium">{wizaData.industry}</p>
              </div>
            )}

            {wizaData.buyerIntent && (
              <div>
                <p className="text-sm text-muted-foreground">Buyer Intent</p>
                <Badge variant={wizaData.buyerIntent === "high" ? "default" : "secondary"}>
                  {wizaData.buyerIntent}
                </Badge>
              </div>
            )}

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground">Added</p>
              <p className="text-sm font-medium">
                {safeTimeAgo(prospect.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Last Activity</p>
              <p className="text-sm font-medium">
                {safeTimeAgo(prospect.lastActivity)}
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

            {(prospect.company || prospect.account) && (
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Current Company</p>
                  {editingAccount ? (
                    <div className="space-y-2 mt-1">
                      <Input
                        value={accountSearch}
                        onChange={(e) => searchAccounts(e.target.value)}
                        placeholder="Search accounts..."
                        className="h-8 text-sm"
                        autoFocus
                      />
                      {accountResults.length > 0 && (
                        <div className="border rounded-md max-h-40 overflow-y-auto">
                          {accountResults.map((a) => (
                            <button
                              key={a.id}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                              onClick={() => linkToAccount(a.id)}
                            >
                              {a.name}
                            </button>
                          ))}
                        </div>
                      )}
                      {accountSearch.length > 0 && accountResults.length === 0 && !accountSearchLoading && (
                        <p className="text-xs text-muted-foreground">No accounts found</p>
                      )}
                      <div className="flex gap-2">
                        {prospect.account && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => linkToAccount(null)}
                          >
                            Unlink
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingAccount(false); setAccountSearch(""); setAccountResults([]) }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {prospect.account ? (
                        <button
                          className="text-sm font-medium text-primary hover:underline cursor-pointer"
                          onClick={() => router.push(`/accounts/${prospect.account!.id}`)}
                        >
                          {prospect.account.name}
                        </button>
                      ) : (
                        <p className="text-sm font-medium">{prospect.company}</p>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditingAccount(true)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
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
                  {prospect.currentStepDetails ? (
                    <div className="mt-3 p-2 rounded-md bg-background border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-primary/10 text-primary">
                            {getStepIcon(prospect.currentStepDetails.type)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{prospect.currentStepDetails.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {prospect.currentStepDetails.type} step
                            </p>
                          </div>
                        </div>
                        {prospect.currentStepDetails.type !== 'wait' && (
                          <Button
                            size="sm"
                            onClick={handleStepAction}
                            disabled={prospect.currentStepDetails.type === 'linkedin' && !prospect.linkedin}
                          >
                            {prospect.currentStepDetails.type === 'linkedin' ? (
                              <ExternalLink className="h-3 w-3 mr-1" />
                            ) : getStepIcon(prospect.currentStepDetails.type)}
                            <span className="ml-1">{getStepActionLabel(prospect.currentStepDetails.type)}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : prospect.sequenceStep && (
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
                    Change
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => setRemoveSequenceDialogOpen(true)}
                  >
                    <UserMinus className="h-3 w-3 mr-1" />
                    Remove
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

      {/* Company Overview */}
      {(prospect.company || prospect.wizaData?.companyIndustry || prospect.wizaData?.companyDescription) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              <CardTitle className="text-primary">Company Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              {prospect.company && (
                <div>
                  <p className="text-xs text-primary/70 font-medium mb-0.5">Company</p>
                  <p className="text-sm font-medium">{prospect.company}</p>
                </div>
              )}
              {prospect.wizaData?.companyDescription && (
                <div className="basis-full">
                  <p className="text-xs text-primary/70 font-medium mb-0.5">What They Do</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {prospect.wizaData.companyDescription}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes - Inline dated entries */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Notes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add note input */}
          <div className="flex items-center gap-2">
            {currentUser && (
              <div className="shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
                {[currentUser.firstName, currentUser.lastName].filter(Boolean).map(n => n!.charAt(0).toUpperCase()).join('') || currentUser.email.substring(0, 2).toUpperCase()}
              </div>
            )}
            <Input
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Add a note..."
              className="text-sm h-8 flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !addingNote) addNote()
              }}
            />
            <Button
              size="sm"
              className="h-8 px-3 text-xs"
              disabled={addingNote || !newNoteText.trim()}
              onClick={addNote}
            >
              {addingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
            </Button>
          </div>

          {/* Note entries */}
          {noteEntries.length > 0 ? (
            <div className="space-y-1.5">
              {noteEntries.map((note) => (
                <div key={note.id} className="flex items-start gap-2 group py-1">
                  <div className="shrink-0 h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold text-muted-foreground mt-0.5">
                    {note.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground font-medium">
                      {(() => {
                        try { return format(new Date(note.date), 'MM/dd/yyyy') } catch { return 'Unknown' }
                      })()}:
                    </span>
                    <span className="text-sm ml-1.5">{note.text}</span>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                    title="Delete note"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic pl-8">No notes yet</p>
          )}
        </CardContent>
      </Card>

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

      {/* Remove from Sequence Confirmation */}
      <AlertDialog open={removeSequenceDialogOpen} onOpenChange={setRemoveSequenceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Sequence</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {prospect.name} from the "{prospect.sequence}" sequence?
              They will no longer receive any steps from this sequence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingFromSequence}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeFromSequence}
              disabled={removingFromSequence}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingFromSequence ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
