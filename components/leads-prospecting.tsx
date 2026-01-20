"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, ChevronDown, Building2, Briefcase, User, BarChart, ArrowRight, Clock } from "lucide-react"
import { Collapsible } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function LeadsProspecting() {
  const [isCompanyOpen, setIsCompanyOpen] = useState(true)
  const [isRoleOpen, setIsRoleOpen] = useState(true)
  const [isPersonalOpen, setIsPersonalOpen] = useState(true)
  const [isBuyerIntentOpen, setIsBuyerIntentOpen] = useState(true)
  const [isBestPathOpen, setIsBestPathOpen] = useState(true)
  const [isRecentUpdatesOpen, setIsRecentUpdatesOpen] = useState(true)
  const [headcountRange, setHeadcountRange] = useState([50, 1000]) // 50 to 1000 employees

  return (
    <div className="space-y-6">
      {/* Search and Keywords */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search for leads by name, title, company, or keywords..." className="pl-10" />
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
          {/* Company Filters */}
          <Card>
            <CardHeader className="py-3 cursor-pointer" onClick={() => setIsCompanyOpen(!isCompanyOpen)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Company
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isCompanyOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            <Collapsible open={isCompanyOpen}>
              <CardContent className="pt-0 space-y-5">
                {/* Current Company */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Current Company</Label>
                  <Input placeholder="Enter company name" />
                </div>

                <Separator />

                {/* Company Headcount */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Company Headcount</Label>
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
              </CardContent>
            </Collapsible>
          </Card>

          {/* Role Filters */}
          <Card>
            <CardHeader className="py-3 cursor-pointer" onClick={() => setIsRoleOpen(!isRoleOpen)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Role
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isRoleOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            <Collapsible open={isRoleOpen}>
              <CardContent className="pt-0 space-y-5">
                {/* Function */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Function</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select function" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="it">IT</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="hr">Human Resources</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Current Job Title */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Current Job Title</Label>
                  <Input placeholder="Enter job title" />
                  <div className="space-y-2 mt-2">
                    {["VP", "Director", "Manager", "C-Level"].map((title) => (
                      <div key={title} className="flex items-center space-x-2">
                        <Checkbox id={`title-${title.toLowerCase()}`} />
                        <Label htmlFor={`title-${title.toLowerCase()}`} className="text-sm font-normal">
                          {title}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Seniority Level */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Seniority Level</Label>
                  <div className="space-y-2">
                    {["C-Suite", "VP", "Director", "Manager", "Individual Contributor"].map((level) => (
                      <div key={level} className="flex items-center space-x-2">
                        <Checkbox id={`level-${level.toLowerCase().replace(/\s+/g, "-")}`} />
                        <Label
                          htmlFor={`level-${level.toLowerCase().replace(/\s+/g, "-")}`}
                          className="text-sm font-normal"
                        >
                          {level}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Collapsible>
          </Card>

          {/* Personal Filters */}
          <Card>
            <CardHeader className="py-3 cursor-pointer" onClick={() => setIsPersonalOpen(!isPersonalOpen)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Personal
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isPersonalOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            <Collapsible open={isPersonalOpen}>
              <CardContent className="pt-0 space-y-5">
                {/* Geography */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Geography</Label>
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
                        <Checkbox id={`personal-industry-${industry.toLowerCase()}`} />
                        <Label htmlFor={`personal-industry-${industry.toLowerCase()}`} className="text-sm font-normal">
                          {industry}
                        </Label>
                      </div>
                    ))}
                    <Button variant="link" size="sm" className="px-0 text-xs">
                      Show more industries
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Collapsible>
          </Card>

          {/* Buyer Intent Filters */}
          <Card>
            <CardHeader className="py-3 cursor-pointer" onClick={() => setIsBuyerIntentOpen(!isBuyerIntentOpen)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center">
                  <BarChart className="h-4 w-4 mr-2" />
                  Buyer Intent
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isBuyerIntentOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            <Collapsible open={isBuyerIntentOpen}>
              <CardContent className="pt-0 space-y-5">
                <RadioGroup defaultValue="all">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="intent-all" />
                    <Label htmlFor="intent-all">All</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="strong" id="intent-strong" />
                    <Label htmlFor="intent-strong" className="flex items-center">
                      Strong
                      <Badge className="ml-2 bg-green-500/20 text-green-500 hover:bg-green-500/30">High</Badge>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="intent-medium" />
                    <Label htmlFor="intent-medium" className="flex items-center">
                      Medium
                      <Badge className="ml-2 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">Medium</Badge>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weak" id="intent-weak" />
                    <Label htmlFor="intent-weak" className="flex items-center">
                      Weak
                      <Badge className="ml-2 bg-blue-500/20 text-blue-500 hover:bg-blue-500/30">Low</Badge>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Collapsible>
          </Card>

          {/* Best Path In Filters */}
          <Card>
            <CardHeader className="py-3 cursor-pointer" onClick={() => setIsBestPathOpen(!isBestPathOpen)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Best Path In
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isBestPathOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            <Collapsible open={isBestPathOpen}>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="used-previous-company" />
                  <Label htmlFor="used-previous-company" className="text-sm">
                    Used at previous company
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="switched-recently" />
                  <Label htmlFor="switched-recently" className="text-sm">
                    Switched companies recently
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="promoted-recently" />
                  <Label htmlFor="promoted-recently" className="text-sm">
                    Promoted recently
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="second-degree" />
                  <Label htmlFor="second-degree" className="text-sm">
                    2nd degree connection
                  </Label>
                </div>
              </CardContent>
            </Collapsible>
          </Card>

          {/* Recent Updates Filters */}
          <Card>
            <CardHeader className="py-3 cursor-pointer" onClick={() => setIsRecentUpdatesOpen(!isRecentUpdatesOpen)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Recent Updates
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${isRecentUpdatesOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            <Collapsible open={isRecentUpdatesOpen}>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="changed-jobs" />
                  <Label htmlFor="changed-jobs" className="text-sm">
                    Changed jobs
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="posted-linkedin" />
                  <Label htmlFor="posted-linkedin" className="text-sm">
                    Posted on LinkedIn
                  </Label>
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
                <span className="font-medium">0</span> leads found matching your criteria
              </div>
              <Select defaultValue="relevance">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="intent-high">Buyer Intent (High to Low)</SelectItem>
                  <SelectItem value="recent-activity">Recent Activity</SelectItem>
                  <SelectItem value="title">Job Title</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No leads found</h3>
              <p className="text-muted-foreground max-w-md">
                Try adjusting your search criteria or filters to find leads that match your prospecting needs.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
