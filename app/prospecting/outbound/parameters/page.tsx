"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation"

export default function ProspectingParametersPage() {
  const [useLinkedInInsights, setUseLinkedInInsights] = useState(false)
  const router = useRouter()

  const handleApplyParameters = () => {
    router.push("/prospecting/outbound")
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Select Your Prospecting Parameters</h1>
      <Card>
        <CardHeader>
          <CardTitle>Prospecting Criteria</CardTitle>
          <CardDescription>Define the parameters for your outbound prospecting campaign.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="company-size">Company Size (Employees)</Label>
            <Slider id="company-size" defaultValue={[50, 1000]} max={10000} step={50} minStepsBetweenThumbs={10} />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>50</span>
              <span>10,000+</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="revenue">Annual Revenue (USD)</Label>
            <Select>
              <SelectTrigger id="revenue">
                <SelectValue placeholder="Select revenue range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m-10m">$1M - $10M</SelectItem>
                <SelectItem value="10m-50m">$10M - $50M</SelectItem>
                <SelectItem value="50m-100m">$50M - $100M</SelectItem>
                <SelectItem value="100m-500m">$100M - $500M</SelectItem>
                <SelectItem value="500m+">$500M+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="geography">Geography</Label>
            <Select>
              <SelectTrigger id="geography">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="north-america">North America</SelectItem>
                <SelectItem value="europe">Europe</SelectItem>
                <SelectItem value="asia-pacific">Asia Pacific</SelectItem>
                <SelectItem value="latin-america">Latin America</SelectItem>
                <SelectItem value="middle-east-africa">Middle East & Africa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Select>
              <SelectTrigger id="industry">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="linkedin-insights" checked={useLinkedInInsights} onCheckedChange={setUseLinkedInInsights} />
            <Label htmlFor="linkedin-insights">Use LinkedIn Insights</Label>
          </div>

          {useLinkedInInsights && (
            <div className="space-y-2">
              <Label htmlFor="linkedin-keywords">LinkedIn Keywords</Label>
              <Input id="linkedin-keywords" placeholder="Enter keywords (e.g., AI, machine learning, data science)" />
            </div>
          )}

          <Button className="w-full" onClick={handleApplyParameters}>
            Apply Parameters
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
