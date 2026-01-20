"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountsProspecting } from "@/components/accounts-prospecting"
import { LeadsProspecting } from "@/components/leads-prospecting"

export function OutboundProspectingTabs() {
  return (
    <Tabs defaultValue="accounts" className="space-y-6">
      <TabsList>
        <TabsTrigger value="accounts">Accounts</TabsTrigger>
        <TabsTrigger value="leads">Leads</TabsTrigger>
      </TabsList>
      <TabsContent value="accounts" className="space-y-6">
        <AccountsProspecting />
      </TabsContent>
      <TabsContent value="leads" className="space-y-6">
        <LeadsProspecting />
      </TabsContent>
    </Tabs>
  )
}
