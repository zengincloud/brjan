"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Filter, RefreshCw } from "lucide-react"

interface EmailFiltersProps {
  activeTab: string
}

export function EmailFilters({ activeTab }: EmailFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {activeTab === "sequence" && (
        <>
          <Select defaultValue="all-sequences">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select sequence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-sequences">All Sequences</SelectItem>
              <SelectItem value="enterprise-outreach">Enterprise Outreach</SelectItem>
              <SelectItem value="smb-follow-up">SMB Follow-up</SelectItem>
              <SelectItem value="product-demo">Product Demo Request</SelectItem>
              <SelectItem value="account-maintenance">Account Maintenance</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all-stages">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-stages">All Stages</SelectItem>
              <SelectItem value="first-personalized">First Personalized Email</SelectItem>
              <SelectItem value="second-automated">Second Automated Email</SelectItem>
              <SelectItem value="demo-follow-up">Demo Follow-up</SelectItem>
              <SelectItem value="proposal-follow-up">Proposal Follow-up</SelectItem>
              <SelectItem value="renewal-notice">Renewal Notice</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all-status">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-status">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="opened">Opened</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all-priority">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-priority">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}

      {activeTab === "priority" && (
        <>
          <Select defaultValue="all-types">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select follow-up type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-types">All Types</SelectItem>
              <SelectItem value="call-follow-up">Call Follow-up</SelectItem>
              <SelectItem value="proposal-follow-up">Proposal Follow-up</SelectItem>
              <SelectItem value="objection-handling">Objection Handling</SelectItem>
              <SelectItem value="meeting-follow-up">Meeting Follow-up</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all-due">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select due date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-due">All Due Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="next-week">Next Week</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}

      {activeTab === "templates" && (
        <>
          <Select defaultValue="all-template-sequences">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select sequence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-template-sequences">All Sequences</SelectItem>
              <SelectItem value="enterprise-outreach">Enterprise Outreach</SelectItem>
              <SelectItem value="smb-follow-up">SMB Follow-up</SelectItem>
              <SelectItem value="product-demo">Product Demo Request</SelectItem>
              <SelectItem value="account-maintenance">Account Maintenance</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all-template-stages">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-template-stages">All Stages</SelectItem>
              <SelectItem value="first-personalized">First Personalized Email</SelectItem>
              <SelectItem value="second-automated">Second Automated Email</SelectItem>
              <SelectItem value="demo-follow-up">Demo Follow-up</SelectItem>
              <SelectItem value="proposal-follow-up">Proposal Follow-up</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="success-rate">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="success-rate">Success Rate</SelectItem>
              <SelectItem value="most-used">Most Used</SelectItem>
              <SelectItem value="recently-used">Recently Used</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}

      <div className="ml-auto flex gap-2">
        <Button variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          More Filters
        </Button>
      </div>
    </div>
  )
}
