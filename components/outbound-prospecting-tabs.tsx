"use client"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountsProspecting } from "@/components/accounts-prospecting"
import { LeadsProspecting } from "@/components/leads-prospecting"

export function OutboundProspectingTabs() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "accounts")

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "leads" || tab === "accounts") setActiveTab(tab)
  }, [searchParams])

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
