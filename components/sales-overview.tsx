"use client"

import { useState } from "react"
import { ContactedProspects } from "@/components/contacted-prospects"
import { UpcomingProspects } from "@/components/upcoming-prospects"
import { Tasks } from "@/components/tasks"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SalesOverview() {
  const [activeTab, setActiveTab] = useState("contacted")

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-semibold text-gray-800 mb-6">Sales Dashboard</h1>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="contacted">Contacted Prospects</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming Prospects</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
              </TabsList>
              <TabsContent value="contacted">
                <ContactedProspects />
              </TabsContent>
              <TabsContent value="upcoming">
                <UpcomingProspects />
              </TabsContent>
              <TabsContent value="tasks">
                <Tasks />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
