"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Send,
  Clock,
  Calendar,
  Paperclip,
  AlertTriangle,
  MousePointerClick,
  Building2,
  Save,
  Trash,
  PenLine,
  Mail,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// Combined data from all sources for the editor
const allEmailsData = [
  // Sequence emails
  {
    id: "seq-1",
    recipient: "John Doe",
    recipientEmail: "john.doe@techcorp.com",
    company: "TechCorp",
    subject: "Following up on our conversation",
    body: `Hi John,

I wanted to follow up on our discussion about your team's sales engagement needs. I noticed you've visited our pricing page several times recently, so I thought I'd reach out to see if you have any questions I can answer.

Based on what you shared about TechCorp's growth plans, I think our Enterprise plan would be the best fit. It includes:

- Advanced sequence automation
- Team collaboration features
- CRM integration
- Custom reporting

Would you be available for a quick 15-minute call this week to discuss how we can help streamline your sales process?

Best regards,
Alex Johnson
Sales Representative`,
    sequence: "Enterprise Outreach",
    stage: "First Personalized Email",
    date: "Today, 2:30 PM",
    status: "pending",
    priority: "high",
    context: "Visited pricing page 5 times in the last week",
    contextType: "website_activity",
  },
  // More sequence emails...

  // Priority emails
  {
    id: "pri-1",
    recipient: "Robert Taylor",
    recipientEmail: "robert.taylor@enterpriseco.com",
    company: "Enterprise Co",
    subject: "Next steps after our call",
    body: `Hi Robert,

Thank you for taking the time to speak with me yesterday. I really enjoyed learning more about Enterprise Co's challenges with your current sales process.

As promised, here are the key points we discussed:

1. Your team needs a more streamlined way to follow up with prospects
2. You're looking to improve email open and response rates
3. Integration with your existing CRM is essential
4. You need better analytics to track team performance

I've attached a brief overview of how our platform addresses each of these points. Would you be available for a demo next Tuesday at 2 PM to see these features in action?

Looking forward to your response,
Alex Johnson
Sales Representative`,
    sequence: "Sales Leaders",
    stage: "Post-Call Follow-up",
    date: "Today, 10:00 AM",
    status: "pending",
    priority: "high",
    context: "Had a 30-minute discovery call yesterday",
    contextType: "call_follow_up",
  },
  // More priority emails...

  // Email templates
  {
    id: "temp-1",
    name: "Initial Outreach",
    recipient: "[Recipient Name]",
    recipientEmail: "[recipient.email]",
    company: "[Company Name]",
    subject: "Introducing [Company] - [Personalized Value Proposition]",
    body: `Hi [Recipient Name],

I noticed [Company] is [observation about prospect's business] and thought you might be interested in how we've helped similar companies in the [industry/sector] space.

[Company Name] specializes in [brief value proposition] that helps companies like yours [key benefit].

Our clients typically see:
- [Specific result/metric]
- [Specific result/metric]
- [Specific result/metric]

Would you be open to a brief 15-minute call to explore if there might be a fit for [Company Name]?

Best regards,
[Your Name]
[Your Title]`,
    sequence: "Enterprise Outreach",
    stage: "First Personalized Email",
    lastUsed: "2 days ago",
    successRate: "32%",
  },
  // More email templates...
]

interface EmailEditorProps {
  emailId: string | null
}

export function EmailEditor({ emailId }: EmailEditorProps) {
  const { toast } = useToast()
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [recipient, setRecipient] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [company, setCompany] = useState("")
  const [context, setContext] = useState<{ text: string; type: string } | null>(null)
  const [isTemplate, setIsTemplate] = useState(false)

  useEffect(() => {
    if (emailId) {
      const emailData = allEmailsData.find((email) => email.id === emailId)
      if (emailData) {
        setSubject(emailData.subject)
        setBody(emailData.body)
        setRecipient(emailData.recipient)
        setRecipientEmail(emailData.recipientEmail || "")
        setCompany(emailData.company)

        setIsTemplate(emailId.startsWith("temp-"))
        if ((emailData as any).context) {
          setContext({
            text: (emailData as any).context,
            type: (emailData as any).contextType,
          })
        } else {
          setContext(null)
        }
      }
    }
  }, [emailId])

  const handleSend = () => {
    toast({
      title: "Email Sent",
      description: `Email to ${recipient} has been sent successfully.`,
    })
  }

  const handleSchedule = () => {
    toast({
      title: "Email Scheduled",
      description: `Email to ${recipient} has been scheduled.`,
    })
  }

  const handleSave = () => {
    toast({
      title: "Draft Saved",
      description: "Your email draft has been saved.",
    })
  }

  const getContextIcon = (contextType: string) => {
    switch (contextType) {
      case "website_activity":
        return <MousePointerClick className="h-4 w-4 text-blue-500" />
      case "demo_request":
        return <MousePointerClick className="h-4 w-4 text-green-500" />
      case "content_download":
        return <MousePointerClick className="h-4 w-4 text-purple-500" />
      case "social_activity":
        return <MousePointerClick className="h-4 w-4 text-yellow-500" />
      case "account_maintenance":
        return <Building2 className="h-4 w-4 text-gray-500" />
      case "call_follow_up":
        return <Clock className="h-4 w-4 text-indigo-500" />
      case "proposal_follow_up":
        return <Clock className="h-4 w-4 text-pink-500" />
      case "objection_handling":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  if (!emailId) {
    return (
      <Card className="h-full flex items-center justify-center min-h-[400px]">
        <CardContent className="text-center text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Select an email to view or edit</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {!isTemplate && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={`/placeholder.svg?height=32&width=32`} />
                <AvatarFallback>{recipient.substring(0, 2)}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <CardTitle className="text-base">{isTemplate ? "Template: " + subject : "To: " + recipient}</CardTitle>
              {!isTemplate && (
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <span>{recipientEmail}</span>
                  <span className="mx-1">•</span>
                  <span>{company}</span>
                </div>
              )}
            </div>
          </div>
          {context && (
            <Badge variant="outline" className="flex items-center gap-1">
              {getContextIcon(context.type)}
              <span className="text-xs">{context.text}</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div>
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="flex-1">
          <Textarea
            placeholder="Write your email here..."
            className="h-full min-h-[300px] resize-none"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4 flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Paperclip className="h-4 w-4 mr-2" />
            Attach
          </Button>
          <Button variant="outline" size="sm">
            <PenLine className="h-4 w-4 mr-2" />
            Signature
          </Button>
        </div>
        <div className="flex gap-2">
          {!isTemplate && (
            <>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button variant="outline" size="sm" onClick={handleSchedule}>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>
              <Button size="sm" onClick={handleSend}>
                <Send className="h-4 w-4 mr-2" />
                Send Now
              </Button>
            </>
          )}
          {isTemplate && (
            <>
              <Button variant="outline" size="sm">
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button variant="outline" size="sm">
                <PenLine className="h-4 w-4 mr-2" />
                Edit Template
              </Button>
              <Button size="sm">
                <Send className="h-4 w-4 mr-2" />
                Use Template
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
