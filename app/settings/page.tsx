"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronDown, ChevronUp, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { GmailIntegration } from "@/components/settings/gmail-integration"
import { HubspotIntegration } from "@/components/settings/hubspot-integration"
import { OrganizationSettings } from "@/components/settings/organization-settings"
import { TeamSettings } from "@/components/settings/team-settings"
import { DeliverabilitySettings } from "@/components/settings/deliverability-settings"
import { CallingSettings } from "@/components/settings/calling-settings"

function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error('Could not open billing portal')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }
  return (
    <Button variant="outline" className="w-full" onClick={handleClick} disabled={loading}>
      {loading ? 'Opening...' : 'Manage Subscription'}
    </Button>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile")
  const [deliverabilityOpen, setDeliverabilityOpen] = useState(true)
  const [callingOpen, setCallingOpen] = useState(true)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [creditStatus, setCreditStatus] = useState<{
    tier: string; label: string; creditsUsed: number; creditsTotal: number; creditsRemaining: number; resetsAt: string | null
  } | null>(null)
  const [profile, setProfile] = useState<{
    firstName: string; lastName: string; email: string
  }>({ firstName: "", lastName: "", email: "" })
  const [workingHours, setWorkingHours] = useState({
    timezone: "est",
    workDays: "weekdays",
    workStartTime: "09:00",
    workEndTime: "17:00",
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingWorkingHours, setIsSavingWorkingHours] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetch("/api/auth/user")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.user) {
          setProfile({
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            email: data.user.email || "",
          })
          setWorkingHours({
            timezone: data.user.timezone || "est",
            workDays: data.user.workDays || "weekdays",
            workStartTime: data.user.workStartTime || "09:00",
            workEndTime: data.user.workEndTime || "17:00",
          })
        }
      })
      .catch(() => {})

    fetch("/api/credits")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setCreditStatus(data) })
      .catch(() => {})
  }, [])

  const handleProfileSave = async () => {
    setIsSavingProfile(true)
    try {
      const res = await fetch("/api/auth/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to save profile")
        return
      }
      toast.success("Profile updated")
    } catch {
      toast.error("Failed to save profile")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleWorkingHoursSave = async () => {
    setIsSavingWorkingHours(true)
    try {
      const res = await fetch("/api/auth/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workingHours),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to save working hours")
        return
      }
      toast.success("Working hours updated")
    } catch {
      toast.error("Failed to save working hours")
    } finally {
      setIsSavingWorkingHours(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setIsUpdatingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success("Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      toast.error("Failed to update password")
      console.error("Password update error:", error)
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const topNavItems = [
    { id: "profile", label: "Profile" },
    { id: "organization", label: "Organization" },
    { id: "team", label: "Team" },
    { id: "notifications", label: "Notifications" },
  ]

  const bottomNavItems = [
    { id: "integrations", label: "Integrations" },
    { id: "security", label: "Security" },
    { id: "billing", label: "Billing" },
  ]

  const deliverabilityItems = [
    { id: "deliverability-overview", label: "Overview" },
    { id: "deliverability-domains", label: "Domains" },
    { id: "deliverability-mailboxes", label: "Mailboxes" },
  ]

  const callingItems = [
    { id: "calling-overview", label: "Overview" },
    { id: "calling-numbers", label: "Numbers" },
    { id: "calling-voicemail", label: "Voicemail" },
    { id: "calling-compliance", label: "Compliance" },
  ]

  const navBtn = (id: string, label: string) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      className={`text-left px-4 py-2 text-sm rounded-md mx-2 transition-colors ${
        activeTab === id
          ? "bg-secondary text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex -m-5 min-h-full">
      {/* Left Sidebar */}
      <aside className="w-52 shrink-0 border-r border-border">
        <h1 className="text-2xl font-semibold px-4 pt-6 pb-4">Settings</h1>
        <nav className="flex flex-col gap-0.5">
          {topNavItems.map((item) => navBtn(item.id, item.label))}

          {/* Deliverability Suite group */}
          <div className="mt-1">
            <button
              onClick={() => setDeliverabilityOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm rounded-md mx-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              style={{ width: "calc(100% - 16px)" }}
            >
              <span>Deliverability suite</span>
              {deliverabilityOpen
                ? <ChevronUp className="h-3.5 w-3.5" />
                : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {deliverabilityOpen && (
              <div className="ml-3 flex flex-col gap-0.5 mt-0.5">
                {deliverabilityItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`text-left px-4 py-1.5 text-sm rounded-md mx-2 transition-colors ${
                      activeTab === item.id
                        ? "bg-secondary text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Calling Suite group */}
          <div className="mt-1">
            <button
              onClick={() => setCallingOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2 text-sm rounded-md mx-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              style={{ width: "calc(100% - 16px)" }}
            >
              <span>Calling suite</span>
              {callingOpen
                ? <ChevronUp className="h-3.5 w-3.5" />
                : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {callingOpen && (
              <div className="ml-3 flex flex-col gap-0.5 mt-0.5">
                {callingItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`text-left px-4 py-1.5 text-sm rounded-md mx-2 transition-colors ${
                      activeTab === item.id
                        ? "bg-secondary text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-1">
            {bottomNavItems.map((item) => navBtn(item.id, item.label))}
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 px-10 py-6 space-y-6 overflow-y-auto">

        {/* Profile Tab */}
        {activeTab === "profile" && <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                    disabled={isSavingProfile}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                    disabled={isSavingProfile}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email is managed through your login provider</p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleProfileSave}
                  disabled={isSavingProfile}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isSavingProfile ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Working Hours</CardTitle>
              <CardDescription>Set your availability for outbound activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={workingHours.timezone}
                    onValueChange={(v) => setWorkingHours((wh) => ({ ...wh, timezone: v }))}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                      <SelectItem value="mst">Mountain Time (MST)</SelectItem>
                      <SelectItem value="cst">Central Time (CST)</SelectItem>
                      <SelectItem value="est">Eastern Time (EST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workdays">Working Days</Label>
                  <Select
                    value={workingHours.workDays}
                    onValueChange={(v) => setWorkingHours((wh) => ({ ...wh, workDays: v }))}
                  >
                    <SelectTrigger id="workdays">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekdays">Monday - Friday</SelectItem>
                      <SelectItem value="all">All Days</SelectItem>
                      <SelectItem value="custom">Custom Schedule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={workingHours.workStartTime}
                    onChange={(e) => setWorkingHours((wh) => ({ ...wh, workStartTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={workingHours.workEndTime}
                    onChange={(e) => setWorkingHours((wh) => ({ ...wh, workEndTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleWorkingHoursSave}
                  disabled={isSavingWorkingHours}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isSavingWorkingHours ? "Saving..." : "Save Working Hours"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>}

        {/* Organization Tab */}
        {activeTab === "organization" && <div className="space-y-4">
          <OrganizationSettings />
        </div>}

        {/* Team Tab */}
        {activeTab === "team" && <div className="space-y-4">
          <TeamSettings />
        </div>}

        {/* Notifications Tab */}
        {activeTab === "notifications" && <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Manage which emails you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>New Responses</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when prospects reply to your emails
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Call Missed</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerts when you miss an important call
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Daily Summary</Label>
                  <p className="text-sm text-muted-foreground">
                    Daily report of your outreach activity
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Report</Label>
                  <p className="text-sm text-muted-foreground">
                    Weekly performance summary
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>In-App Notifications</CardTitle>
              <CardDescription>Control your in-app notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Task Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Remind me about upcoming tasks
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sequence Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when sequences complete or have issues
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>AI Insights</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications for AI-generated insights
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>}

        {/* Deliverability Suite Tabs */}
        {activeTab === "deliverability-overview" && (
          <DeliverabilitySettings tab="overview" />
        )}
        {activeTab === "deliverability-domains" && (
          <DeliverabilitySettings tab="domains" />
        )}
        {activeTab === "deliverability-mailboxes" && (
          <DeliverabilitySettings tab="mailboxes" />
        )}

        {/* Calling Suite Tabs */}
        {activeTab === "calling-overview" && (
          <CallingSettings tab="overview" />
        )}
        {activeTab === "calling-numbers" && (
          <CallingSettings tab="numbers" />
        )}
        {activeTab === "calling-voicemail" && (
          <CallingSettings tab="voicemail" />
        )}
        {activeTab === "calling-compliance" && (
          <CallingSettings tab="compliance" />
        )}

        {/* Integrations Tab */}
        {activeTab === "integrations" && <div className="space-y-4">
          <GmailIntegration />
          <HubspotIntegration />

          <Card>
            <CardHeader>
              <CardTitle>CRM Integration</CardTitle>
              <CardDescription>Other CRM integrations coming soon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Salesforce</p>
                      <p className="text-xs text-muted-foreground">Sync contacts, leads, and activities</p>
                    </div>
                  </div>
                  <Button variant="outline" disabled>Coming Soon</Button>
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Pipedrive</p>
                      <p className="text-xs text-muted-foreground">Sync deals and contacts</p>
                    </div>
                  </div>
                  <Button variant="outline" disabled>Coming Soon</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calendar Integration</CardTitle>
              <CardDescription>Sync your calendar for scheduling</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Google Calendar</p>
                    <p className="text-xs text-muted-foreground">Sync meetings and availability</p>
                  </div>
                </div>
                <Button variant="outline">Connect</Button>
              </div>
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Outlook Calendar</p>
                    <p className="text-xs text-muted-foreground">Microsoft 365 calendar sync</p>
                  </div>
                </div>
                <Button variant="outline">Connect</Button>
              </div>
            </CardContent>
          </Card>
        </div>}

        {/* Security Tab */}
        {activeTab === "security" && <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handlePasswordUpdate}
                  disabled={isUpdatingPassword}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable 2FA</Label>
                  <p className="text-sm text-muted-foreground">
                    Require authentication code when signing in
                  </p>
                </div>
                <Switch />
              </div>
              <Button variant="outline">Configure 2FA</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage your active login sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">MacBook Pro • San Francisco, CA</p>
                    <p className="text-xs text-muted-foreground">Current session • Chrome</p>
                  </div>
                  <span className="text-xs text-primary">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">iPhone 14 • San Francisco, CA</p>
                    <p className="text-xs text-muted-foreground">Last active 2 hours ago</p>
                  </div>
                  <Button variant="ghost" size="sm">Revoke</Button>
                </div>
              </div>
              <Button variant="destructive" className="w-full">
                Sign Out All Other Sessions
              </Button>
            </CardContent>
          </Card>
        </div>}

        {/* Billing Tab */}
        {activeTab === "billing" && <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your plan and credit usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {creditStatus ? (
                <>
                  <div className="p-4 border border-primary/30 bg-primary/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{creditStatus.label} Plan</h3>
                      {creditStatus.creditsTotal === -1 ? (
                        <span className="text-sm font-medium text-primary">Unlimited</span>
                      ) : (
                        <span className="text-xl font-semibold text-primary">
                          {creditStatus.creditsRemaining}
                          <span className="text-sm font-normal text-muted-foreground"> credits left</span>
                        </span>
                      )}
                    </div>
                    {creditStatus.creditsTotal !== -1 && (
                      <>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">
                            {creditStatus.creditsUsed} of {creditStatus.creditsTotal} credits used
                          </span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
                          <div
                            className={`h-full rounded-full transition-all ${
                              creditStatus.creditsUsed / creditStatus.creditsTotal >= 0.9
                                ? "bg-red-500"
                                : creditStatus.creditsUsed / creditStatus.creditsTotal >= 0.7
                                  ? "bg-yellow-500"
                                  : "bg-primary"
                            }`}
                            style={{ width: `${Math.min((creditStatus.creditsUsed / creditStatus.creditsTotal) * 100, 100)}%` }}
                          />
                        </div>
                        {creditStatus.resetsAt && (
                          <p className="text-xs text-muted-foreground">
                            Credits reset on {new Date(creditStatus.resetsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                        {creditStatus.tier === "trial" && (
                          <p className="text-xs text-muted-foreground">
                            Trial credits do not reset. Upgrade to get more.
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Upgrade / Manage buttons */}
                  {creditStatus.tier === "trial" ? (
                    <Button className="w-full bg-[hsl(100,78%,44%)] hover:bg-[hsl(100,78%,38%)] text-white shadow-[0_0_16px_hsl(100,78%,44%,0.25)]" asChild>
                      <a href="/upgrade">Upgrade Plan</a>
                    </Button>
                  ) : (
                    <ManageSubscriptionButton />
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Loading plan info...</div>
              )}
            </CardContent>
          </Card>
        </div>}

      </div>
    </div>
  )
}
