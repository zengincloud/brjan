"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmailList } from "@/components/email-list"
import { EmailEditor } from "@/components/email-editor"
import { EmailFilters } from "@/components/email-filters"
import { EmailTemplateManager } from "@/components/email-template-manager"
import { DraftEmailList } from "@/components/draft-email-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Mail, AlertTriangle, Plus, FileText } from "lucide-react"

export function EmailerDashboard() {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("drafts") // Default to drafts
  const [isComposingNew, setIsComposingNew] = useState(false)
  const [draftCount, setDraftCount] = useState(0)

  // Fetch draft count
  useEffect(() => {
    const fetchDraftCount = async () => {
      try {
        const response = await fetch("/api/emails/queue")
        if (response.ok) {
          const data = await response.json()
          setDraftCount(data.emails?.length || 0)
        }
      } catch (error) {
        console.error("Error fetching draft count:", error)
      }
    }
    fetchDraftCount()
  }, [])

  const handleComposeNew = () => {
    setSelectedEmail("new")
    setIsComposingNew(true)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">Across all sequences</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Follow-ups Due</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">Due in the next 24 hours</p>
          </CardContent>
        </Card>
        <Card className={draftCount > 0 ? "border-primary/30 bg-primary/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Emails</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{draftCount}</div>
            <p className="text-xs text-muted-foreground">Saved from dialer</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="drafts" className="relative">
              Drafts
              {draftCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {draftCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sequence">Sequence Emails</TabsTrigger>
            <TabsTrigger value="priority">Priority Follow-ups</TabsTrigger>
            <TabsTrigger value="templates">Email Templates</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {activeTab === "drafts" ? `${draftCount} drafts` : activeTab === "sequence" ? "42 emails" : activeTab === "priority" ? "8 emails" : "12 templates"}
            </Badge>
            <Button onClick={handleComposeNew} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Compose New
            </Button>
          </div>
        </div>

        <TabsContent value="drafts" className="m-0">
          <DraftEmailList onDraftCountChange={setDraftCount} />
        </TabsContent>

        <TabsContent value="templates" className="m-0">
          <EmailTemplateManager />
        </TabsContent>

        <TabsContent value="sequence" className="m-0">
          <EmailFilters activeTab={activeTab} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            <div className="md:col-span-1">
              <EmailList type="sequence" onSelectEmail={setSelectedEmail} selectedEmail={selectedEmail} />
            </div>
            <div className="md:col-span-1 lg:col-span-2">
              <EmailEditor emailId={selectedEmail} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="priority" className="m-0">
          <EmailFilters activeTab={activeTab} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            <div className="md:col-span-1">
              <EmailList type="priority" onSelectEmail={setSelectedEmail} selectedEmail={selectedEmail} />
            </div>
            <div className="md:col-span-1 lg:col-span-2">
              <EmailEditor emailId={selectedEmail} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
