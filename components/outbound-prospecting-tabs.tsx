"use client"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountsProspecting } from "@/components/accounts-prospecting"
import { LeadsProspecting } from "@/components/leads-prospecting"

export function OutboundProspectingTabs() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "accounts"

  return (
    <Tabs defaultValue={defaultTab} className="space-y-6">
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
