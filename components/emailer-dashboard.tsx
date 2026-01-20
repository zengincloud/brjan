"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmailList } from "@/components/email-list"
import { EmailEditor } from "@/components/email-editor"
import { EmailFilters } from "@/components/email-filters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Mail, AlertTriangle } from "lucide-react"

export function EmailerDashboard() {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("sequence")

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="sequence">Sequence Emails</TabsTrigger>
            <TabsTrigger value="priority">Priority Follow-ups</TabsTrigger>
            <TabsTrigger value="templates">Email Templates</TabsTrigger>
          </TabsList>
          <Badge variant="outline" className="ml-2">
            {activeTab === "sequence" ? "42 emails" : activeTab === "priority" ? "8 emails" : "12 templates"}
          </Badge>
        </div>

        <EmailFilters activeTab={activeTab} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <TabsContent value="sequence" className="m-0">
              <EmailList type="sequence" onSelectEmail={setSelectedEmail} selectedEmail={selectedEmail} />
            </TabsContent>
            <TabsContent value="priority" className="m-0">
              <EmailList type="priority" onSelectEmail={setSelectedEmail} selectedEmail={selectedEmail} />
            </TabsContent>
            <TabsContent value="templates" className="m-0">
              <EmailList type="templates" onSelectEmail={setSelectedEmail} selectedEmail={selectedEmail} />
            </TabsContent>
          </div>
          <div className="md:col-span-1 lg:col-span-2">
            <EmailEditor emailId={selectedEmail} />
          </div>
        </div>
      </Tabs>
    </div>
  )
}
