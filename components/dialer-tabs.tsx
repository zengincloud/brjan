"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DialerView } from "@/components/dialer-view"
import { SalesfloorView } from "@/components/salesfloor-view"

export function DialerTabs() {
  return (
    <Tabs defaultValue="dialer" className="space-y-6">
      <TabsList>
        <TabsTrigger value="dialer">Dialer</TabsTrigger>
        <TabsTrigger value="salesfloor">Salesfloor</TabsTrigger>
      </TabsList>
      <TabsContent value="dialer" className="space-y-6">
        <DialerView />
      </TabsContent>
      <TabsContent value="salesfloor" className="space-y-6">
        <SalesfloorView />
      </TabsContent>
    </Tabs>
  )
}
