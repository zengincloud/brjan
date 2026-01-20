"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ChevronDown, Building2, Briefcase, Zap, Newspaper, Lightbulb, Link, Database } from "lucide-react"
import { Collapsible } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

export function AccountsProspecting() {
  const [isCompanyAttributesOpen, setIsCompanyAttributesOpen] = useState(true)
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(true)
  const [revenueRange, setRevenueRange] = useState([10, 500]) // $10M to $500M
  const [headcountRange, setHeadcountRange] = useState([50, 1000]) // 50 to 1000 employees

  return (
    <div className="space-y-6">
      {/* Search and Keywords */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search for companies by name, domain, or keywords..." className="pl-10" />
        </div>
        <Button>
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </div>

      {/* Filters Section */}
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        {/* Left Sidebar - Filters */}
        <div className="space-y-6">
          {/* Company Attributes Filter */}
          <Card>
            <CardHeader
              className="py-3 cursor-pointer"
              onClick={() => setIsCompanyAttributesOpen(!isCompanyAttributesOpen)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Company Attributes
                </CardTitle>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isCompanyAttributesOpen ? "rotate-180" : ""}`}
                />
              </div>
            </CardHeader>
            <Collapsible open={isCompanyAttributesOpen}>
              <CardContent className="pt-0 space-y-5">
                {/* Annual Revenue */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Annual Revenue</Label>
                  <div className="px-2">
                    <Slider
                      value={revenueRange}
                      min={1}
                      max={1000}
                      step={1}
                      onValueChange={setRevenueRange}
                      className="my-5"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>${revenueRange[0]}M</span>
                      <span>${revenueRange[1]}M+</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Headcount */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Headcount</Label>
                  <div className="px-2">
                    <Slider
                      value={headcountRange}
                      min={10}
                      max={5000}
                      step={10}
                      onValueChange={setHeadcountRange}
                      className="my-5"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{headcountRange[0]}</span>
                      <span>{headcountRange[1]}+</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* HQ Location */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">HQ Location</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="north-america">North America</SelectItem>
                      <SelectItem value="europe">Europe</SelectItem>
                      <SelectItem value="asia-pacific">Asia Pacific</SelectItem>
                      <SelectItem value="latin-america">Latin America</SelectItem>
                      <SelectItem value="middle-east">Middle East & Africa</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="City or Country" className="mt-2" />
                </div>

                <Separator />

                {/* Industry */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Industry</Label>
                  <div className="space-y-2">
                    {["Technology", "Financial Services", "Healthcare", "Manufacturing", "Retail"].map((industry) => (
                      <div key={industry} className="flex items-center space-x-2">
                        <Checkbox id={`industry-${industry.toLowerCase()}`} />
                        <Label htmlFor={`industry-${industry.toLowerCase()}`} className="text-sm font-normal">
                          {industry}
                        </Label>
                      </div>
                    ))}
                    <Button variant="link" size="sm" className="px-0 text-xs">
                      Show more industries
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Department Headcount */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Department Headcount</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="hr">Human Resources</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 mt-2">
                    <Input placeholder="Min" className="w-1/2" />
                    <span>-</span>
                    <Input placeholder="Max" className="w-1/2" />
                  </div>
                </div>

                <Separator />

                {/* Technologies Used */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Technologies Used</Label>
                  <Input placeholder="Search technologies..." />
                  <div className="space-y-2 mt-2">
                    {["Salesforce", "HubSpot", "Marketo", "AWS", "Slack"].map((tech) => (
                      <div key={tech} className="flex items-center space-x-2">
                        <Checkbox id={`tech-${tech.toLowerCase()}`} />
                        <Label htmlFor={`tech-${tech.toLowerCase()}`} className="text-sm font-normal">
                          {tech}
                        </Label>
                      </div>
                    ))}
                    <Button variant="link" size="sm" className="px-0 text-xs">
                      Show more technologies
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Collapsible>
          </Card>

          {/* Spotlight Filters */}
          <Card>
            <CardHeader className="py-3 cursor-pointer" onClick={() => setIsSpotlightOpen(!isSpotlightOpen)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center">
                  <Zap className="h-4 w-4 mr-2" />
                  Spotlight
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isSpotlightOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            <Collapsible open={isSpotlightOpen}>
              <CardContent className="pt-0 space-y-4">
                {/* Job Opportunities */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <Briefcase className="h-3 w-3 mr-2" />
                    Job Opportunities
                  </Label>
                  <div className="space-y-2">
                    {["Hiring Sales Roles", "Hiring Marketing Roles", "Hiring Leadership"].map((job) => (
                      <div key={job} className="flex items-center space-x-2">
                        <Checkbox id={`job-${job.toLowerCase().replace(/\s+/g, "-")}`} />
                        <Label
                          htmlFor={`job-${job.toLowerCase().replace(/\s+/g, "-")}`}
                          className="text-sm font-normal"
                        >
                          {job}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Recent Activities */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <Newspaper className="h-3 w-3 mr-2" />
                    Recent Activities
                  </Label>
                  <div className="space-y-2">
                    {["Funding Rounds", "Leadership Changes", "Product Launches", "Expansion News"].map((activity) => (
                      <div key={activity} className="flex items-center space-x-2">
                        <Checkbox id={`activity-${activity.toLowerCase().replace(/\s+/g, "-")}`} />
                        <Label
                          htmlFor={`activity-${activity.toLowerCase().replace(/\s+/g, "-")}`}
                          className="text-sm font-normal"
                        >
                          {activity}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Connection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <Link className="h-3 w-3 mr-2" />
                    Connection
                  </Label>
                  <div className="space-y-2">
                    {["1st Connections", "2nd Connections", "Shared Alma Mater", "Past Companies"].map((connection) => (
                      <div key={connection} className="flex items-center space-x-2">
                        <Checkbox id={`connection-${connection.toLowerCase().replace(/\s+/g, "-")}`} />
                        <Label
                          htmlFor={`connection-${connection.toLowerCase().replace(/\s+/g, "-")}`}
                          className="text-sm font-normal"
                        >
                          {connection}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Buying Signal */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <Lightbulb className="h-3 w-3 mr-2" />
                    Buying Signal
                  </Label>
                  <div className="space-y-2">
                    {["Website Changes", "Technology Adoption", "Growth Indicators", "Content Engagement"].map(
                      (signal) => (
                        <div key={signal} className="flex items-center space-x-2">
                          <Checkbox id={`signal-${signal.toLowerCase().replace(/\s+/g, "-")}`} />
                          <Label
                            htmlFor={`signal-${signal.toLowerCase().replace(/\s+/g, "-")}`}
                            className="text-sm font-normal"
                          >
                            {signal}
                          </Label>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <Separator />

                {/* Companies within CRM */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <Database className="h-3 w-3 mr-2" />
                    Companies within CRM
                  </Label>
                  <div className="space-y-2">
                    {["In Salesforce", "In HubSpot", "Not in CRM", "Closed Lost"].map((crm) => (
                      <div key={crm} className="flex items-center space-x-2">
                        <Checkbox id={`crm-${crm.toLowerCase().replace(/\s+/g, "-")}`} />
                        <Label
                          htmlFor={`crm-${crm.toLowerCase().replace(/\s+/g, "-")}`}
                          className="text-sm font-normal"
                        >
                          {crm}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Collapsible>
          </Card>

          <div className="flex gap-2">
            <Button className="flex-1">Apply Filters</Button>
            <Button variant="outline">Reset</Button>
          </div>
        </div>

        {/* Right Side - Results */}
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">0</span> companies found matching your criteria
              </div>
              <Select defaultValue="relevance">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="revenue-high">Revenue (High to Low)</SelectItem>
                  <SelectItem value="revenue-low">Revenue (Low to High)</SelectItem>
                  <SelectItem value="headcount-high">Headcount (High to Low)</SelectItem>
                  <SelectItem value="headcount-low">Headcount (Low to High)</SelectItem>
                  <SelectItem value="recent-activity">Recent Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No companies found</h3>
              <p className="text-muted-foreground max-w-md">
                Try adjusting your search criteria or filters to find companies that match your prospecting needs.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
