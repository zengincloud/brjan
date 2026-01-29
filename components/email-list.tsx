"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Search, Clock, AlertTriangle, MousePointerClick, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

// Sample data for sequence emails
const sequenceEmails = [
  {
    id: "seq-1",
    recipient: "John Doe",
    company: "TechCorp",
    subject: "Following up on our conversation",
    preview: "I wanted to follow up on our discussion about...",
    sequence: "Enterprise Outreach",
    stage: "First Personalized Email",
    date: "Today, 2:30 PM",
    status: "pending",
    priority: "high",
    context: "Visited pricing page 5 times in the last week",
    contextType: "website_activity",
  },
  {
    id: "seq-2",
    recipient: "Sarah Smith",
    company: "Innovate LLC",
    subject: "Your recent demo request",
    preview: "Thank you for requesting a demo of our platform...",
    sequence: "Product Demo Request",
    stage: "Demo Follow-up",
    date: "Today, 4:15 PM",
    status: "pending",
    priority: "medium",
    context: "Requested a demo through website form",
    contextType: "demo_request",
  },
  {
    id: "seq-3",
    recipient: "Michael Chen",
    company: "Global Industries",
    subject: "Introducing our enterprise solution",
    preview: "Based on your company's needs, I thought you might be interested in...",
    sequence: "Enterprise Outreach",
    stage: "Second Automated Email",
    date: "Tomorrow, 9:00 AM",
    status: "scheduled",
    priority: "medium",
    context: "Downloaded whitepaper on data security",
    contextType: "content_download",
  },
  {
    id: "seq-4",
    recipient: "Emily Davis",
    company: "StartupCo",
    subject: "Quick question about your requirements",
    preview: "I noticed you mentioned scaling challenges in your...",
    sequence: "SMB Follow-up",
    stage: "First Personalized Email",
    date: "Tomorrow, 11:30 AM",
    status: "scheduled",
    priority: "low",
    context: "Mentioned pain points in LinkedIn post",
    contextType: "social_activity",
  },
  {
    id: "seq-5",
    recipient: "David Wilson",
    company: "Tech Solutions",
    subject: "Your subscription renewal",
    preview: "I wanted to reach out regarding your upcoming subscription renewal...",
    sequence: "Account Maintenance",
    stage: "Renewal Notice",
    date: "Today, 3:45 PM",
    status: "pending",
    priority: "high",
    context: "Subscription expires in 14 days",
    contextType: "account_maintenance",
  },
]

// Sample data for priority follow-ups
const priorityEmails = [
  {
    id: "pri-1",
    recipient: "Robert Taylor",
    company: "Enterprise Co",
    subject: "Next steps after our call",
    preview: "Following our productive call yesterday, I wanted to outline...",
    sequence: "Sales Leaders",
    stage: "Post-Call Follow-up",
    date: "Today, 10:00 AM",
    status: "pending",
    priority: "high",
    context: "Had a 30-minute discovery call yesterday",
    contextType: "call_follow_up",
  },
  {
    id: "pri-2",
    recipient: "Jessica Lee",
    company: "InnovateTech",
    subject: "Proposal as discussed",
    preview: "As promised, I've attached the proposal we discussed...",
    sequence: "Enterprise Outreach",
    stage: "Proposal Follow-up",
    date: "Today, 1:15 PM",
    status: "pending",
    priority: "high",
    context: "Requested pricing information for 50 seats",
    contextType: "proposal_follow_up",
  },
  {
    id: "pri-3",
    recipient: "Thomas Brown",
    company: "Global Enterprises",
    subject: "Addressing your concerns",
    preview: "I wanted to follow up on the concerns you raised about...",
    sequence: "Enterprise Outreach",
    stage: "Objection Handling",
    date: "Today, 11:30 AM",
    status: "pending",
    priority: "high",
    context: "Expressed concerns about implementation timeline",
    contextType: "objection_handling",
  },
]

// Sample data for email templates
const emailTemplates = [
  {
    id: "temp-1",
    name: "Initial Outreach",
    subject: "Introducing [Company] - [Personalized Value Proposition]",
    preview: "I noticed [Company] is [observation about prospect's business]...",
    sequence: "Enterprise Outreach",
    stage: "First Personalized Email",
    lastUsed: "2 days ago",
    successRate: "32%",
  },
  {
    id: "temp-2",
    name: "Demo Follow-up",
    subject: "Next steps after our [Product] demo",
    preview: "Thank you for taking the time to join our demo session...",
    sequence: "Product Demo Request",
    stage: "Demo Follow-up",
    lastUsed: "Yesterday",
    successRate: "45%",
  },
  {
    id: "temp-3",
    name: "Pricing Request",
    subject: "Custom pricing information for [Company]",
    preview: "Based on your requirements, I've put together a custom pricing package...",
    sequence: "SMB Follow-up",
    stage: "Pricing Follow-up",
    lastUsed: "5 days ago",
    successRate: "38%",
  },
]

interface EmailListProps {
  type: "sequence" | "priority" | "templates"
  onSelectEmail: (id: string) => void
  selectedEmail: string | null
}

export function EmailList({ type, onSelectEmail, selectedEmail }: EmailListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [realEmails, setRealEmails] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (type !== "templates") {
      loadRealEmails()
    } else {
      setLoading(false)
    }
  }, [type])

  const loadRealEmails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sequence-emails?type=${type}`)
      if (!response.ok) throw new Error("Failed to load emails")
      const data = await response.json()
      setRealEmails(data.emails || [])
    } catch (error) {
      console.error("Error loading emails:", error)
      setRealEmails([])
    } finally {
      setLoading(false)
    }
  }

  const toggleEmailSelection = (id: string) => {
    setSelectedEmails((prev) => (prev.includes(id) ? prev.filter((emailId) => emailId !== id) : [...prev, id]))
  }

  const getEmails = () => {
    switch (type) {
      case "sequence":
        // Combine real emails with dummy data
        const allSequenceEmails = [...realEmails, ...sequenceEmails]
        return allSequenceEmails.filter(
          (email) =>
            email.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.subject.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      case "priority":
        // Combine real emails with dummy data
        const allPriorityEmails = [...realEmails, ...priorityEmails]
        return allPriorityEmails.filter(
          (email) =>
            email.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.subject.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      case "templates":
        return emailTemplates.filter(
          (template) =>
            template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.subject.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      default:
        return []
    }
  }

  const getContextIcon = (contextType: string) => {
    switch (contextType) {
      case "website_activity":
        return <MousePointerClick className="h-3 w-3 text-blue-500" />
      case "demo_request":
        return <MousePointerClick className="h-3 w-3 text-green-500" />
      case "content_download":
        return <MousePointerClick className="h-3 w-3 text-purple-500" />
      case "social_activity":
        return <MousePointerClick className="h-3 w-3 text-yellow-500" />
      case "account_maintenance":
        return <Building2 className="h-3 w-3 text-gray-500" />
      case "call_follow_up":
        return <Clock className="h-3 w-3 text-indigo-500" />
      case "proposal_follow_up":
        return <Clock className="h-3 w-3 text-pink-500" />
      case "objection_handling":
        return <AlertTriangle className="h-3 w-3 text-orange-500" />
      case "sequence_email":
        return <Clock className="h-3 w-3 text-accent" />
      default:
        return <Clock className="h-3 w-3 text-gray-500" />
    }
  }

  const emails = getEmails()

  if (loading && type !== "templates") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={`Search ${type === "templates" ? "templates" : "emails"}...`}
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
        {emails.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {type === "templates"
              ? "No templates found"
              : realEmails.length === 0
                ? "No emails in active sequences"
                : "No emails found matching your search"}
          </div>
        ) : (
          emails.map((email) => (
            <Card
              key={email.id}
              className={cn(
                "cursor-pointer hover:bg-accent/50 transition-colors",
                selectedEmail === email.id && "border-primary",
              )}
              onClick={() => onSelectEmail(email.id)}
            >
              <CardContent className="p-3">
                {type !== "templates" ? (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedEmails.includes(email.id)}
                      onCheckedChange={() => toggleEmailSelection(email.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={`/placeholder.svg?height=24&width=24`} />
                            <AvatarFallback>{(email as any).recipient.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div className="font-medium truncate">{(email as any).recipient}</div>
                          <div className="text-xs text-muted-foreground truncate">{(email as any).company}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{(email as any).date}</div>
                      </div>
                      <div className="mt-1 font-medium truncate">{email.subject}</div>
                      <div className="text-sm text-muted-foreground truncate mt-0.5">{(email as any).preview}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {(email as any).sequence}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {(email as any).stage}
                        </Badge>
                        {(email as any).priority === "high" && (
                          <Badge variant="destructive" className="text-xs">
                            High Priority
                          </Badge>
                        )}
                        {(email as any).status === "overdue" && (
                          <Badge variant="destructive" className="text-xs">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      {(email as any).context && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          {getContextIcon((email as any).contextType)}
                          <span>{(email as any).context}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{(email as any).name}</div>
                      <Badge variant="outline" className="text-xs">
                        {(email as any).successRate}
                      </Badge>
                    </div>
                    <div className="mt-1 font-medium truncate">{email.subject}</div>
                    <div className="text-sm text-muted-foreground truncate mt-0.5">{(email as any).preview}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {(email as any).sequence}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {(email as any).stage}
                      </Badge>
                      <div className="text-xs text-muted-foreground ml-auto">Last used: {(email as any).lastUsed}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
