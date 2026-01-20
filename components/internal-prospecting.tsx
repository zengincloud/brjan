"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Filter, Search } from "lucide-react"

const connectedCRMs = [
  { id: 1, name: "Salesforce", accounts: 1234, lastSync: "2 hours ago" },
  { id: 2, name: "HubSpot", accounts: 567, lastSync: "1 hour ago" },
]

export function InternalProspecting() {
  const [selectedCRM, setSelectedCRM] = useState<string>("")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Prospect Within Connected CRMs</h2>
        <p className="text-muted-foreground">
          Search and filter accounts from your connected CRM systems to find new prospects.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Select value={selectedCRM} onValueChange={setSelectedCRM}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select CRM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All CRMs</SelectItem>
              <SelectItem value="salesforce">Salesforce</SelectItem>
              <SelectItem value="hubspot">HubSpot</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search accounts..." className="pl-8" />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {connectedCRMs.map((crm) => (
            <Card key={crm.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {crm.name}
                  <Badge variant="secondary">Connected</Badge>
                </CardTitle>
                <CardDescription>Last synced {crm.lastSync}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{crm.accounts.toLocaleString()} Accounts</span>
                  </div>
                  <Button>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
