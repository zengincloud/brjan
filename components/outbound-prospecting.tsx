"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Filter, LinkedinIcon, Search, Users, Globe, BadgeCheck } from "lucide-react"
import { useRouter } from "next/navigation"

export function OutboundProspecting() {
  const router = useRouter()
  const [searchResults, setSearchResults] = useState([
    {
      id: 1,
      name: "TechCorp Solutions",
      industry: "Software",
      size: "1000-5000",
      location: "San Francisco, CA",
      employees: 2500,
      verified: true,
    },
    {
      id: 2,
      name: "Global Innovations Inc",
      industry: "Technology",
      size: "5000+",
      location: "New York, NY",
      employees: 7500,
      verified: true,
    },
    // Add more dummy data as needed
  ])

  const handleSelectParameters = () => {
    router.push("/prospecting/outbound/parameters")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Outbound Prospecting</h2>
        <p className="text-muted-foreground">Find and research new companies using LinkedIn and other data sources.</p>
      </div>

      <div className="grid gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Select>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Search by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company">Company Name</SelectItem>
              <SelectItem value="industry">Industry</SelectItem>
              <SelectItem value="location">Location</SelectItem>
              <SelectItem value="size">Company Size</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search companies on LinkedIn..." className="pl-8" />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        </div>

        <Button onClick={handleSelectParameters} className="w-full">
          Select Prospecting Parameters
        </Button>

        <div className="grid gap-4">
          {searchResults.map((company) => (
            <Card key={company.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{company.name}</h3>
                      {company.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {company.industry}
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="h-4 w-4" />
                        {company.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {company.employees.toLocaleString()} employees
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <LinkedinIcon className="mr-2 h-4 w-4" />
                      View on LinkedIn
                    </Button>
                    <Button size="sm">Add to Prospects</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
