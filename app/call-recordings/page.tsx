"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function CallRecordingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Call Recordings</h1>
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
            Beta
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Call Analysis</CardTitle>
          <CardDescription>
            Automatically transcribe, analyze, and extract insights from your sales calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Mic className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-lg font-medium mb-2">No recordings found</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Start making calls through the dialer to automatically record and analyze your conversations.
            </p>
            <Button>Go to Dialer</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search recordings..." className="pl-10" />
        </div>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Recordings</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
