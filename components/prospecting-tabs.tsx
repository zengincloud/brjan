"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InternalProspecting } from "@/components/internal-prospecting"
import { OutboundProspecting } from "@/components/outbound-prospecting"

export function ProspectingTabs() {
  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="internal" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="internal">Prospect Within</TabsTrigger>
            <TabsTrigger value="outbound">Outbound</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="internal" className="space-y-4">
          <InternalProspecting />
        </TabsContent>
        <TabsContent value="outbound" className="space-y-4">
          <OutboundProspecting />
        </TabsContent>
      </Tabs>
    </div>
  )
}
