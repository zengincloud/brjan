"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  Bell,
  Phone,
  Mail,
  Shield,
  Zap,
  CreditCard,
  Settings as SettingsIcon,
  Building2,
  Users,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { GmailIntegration } from "@/components/settings/gmail-integration"
import { OrganizationSettings } from "@/components/settings/organization-settings"
import { TeamSettings } from "@/components/settings/team-settings"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [creditStatus, setCreditStatus] = useState<{
    tier: string; label: string; creditsUsed: number; creditsTotal: number; creditsRemaining: number; resetsAt: string | null
  } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setCreditStatus(data) })
      .catch(() => {})
  }, [])

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-secondary/30">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="organization">
            <Building2 className="h-4 w-4 mr-2" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Team
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="calling">
            <Phone className="h-4 w-4 mr-2" />
            Calling
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Zap className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="john@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input id="title" defaultValue="Sales Development Rep" />
              </div>
              <div className="flex justify-end">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Save Changes
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
                  <Select defaultValue="est">
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
                  <Select defaultValue="weekdays">
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
                  <Input id="startTime" type="time" defaultValue="09:00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input id="endTime" type="time" defaultValue="17:00" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-4">
          <OrganizationSettings />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <TeamSettings />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
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
        </TabsContent>

        {/* Calling Tab */}
        <TabsContent value="calling" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Recording</CardTitle>
              <CardDescription>Configure call recording settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Record Calls</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically record all outbound calls
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Recording Announcement</Label>
                  <p className="text-sm text-muted-foreground">
                    Play announcement that call is being recorded
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recordingRetention">Recording Retention Period</Label>
                <Select defaultValue="90">
                  <SelectTrigger id="recordingRetention">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dialer Settings</CardTitle>
              <CardDescription>Customize your dialing experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultMode">Default Dial Mode</Label>
                <Select defaultValue="parallel">
                  <SelectTrigger id="defaultMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Call</SelectItem>
                    <SelectItem value="parallel">Parallel Dialing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parallelSlots">Parallel Dial Slots</Label>
                <Select defaultValue="2">
                  <SelectTrigger id="parallelSlots">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 slot</SelectItem>
                    <SelectItem value="2">2 slots</SelectItem>
                    <SelectItem value="3">3 slots</SelectItem>
                    <SelectItem value="4">4 slots</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Local Presence</Label>
                  <p className="text-sm text-muted-foreground">
                    Use local area codes when calling prospects
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Voicemail Drop</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable one-click voicemail drops
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Signature</CardTitle>
              <CardDescription>Customize your email signature</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signature">Signature</Label>
                <Textarea
                  id="signature"
                  rows={6}
                  defaultValue={`Best regards,\nJohn Doe\nSales Development Rep\ncompany.com\n(555) 123-4567`}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Signature in Replies</Label>
                  <p className="text-sm text-muted-foreground">
                    Add signature to email replies
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Tracking</CardTitle>
              <CardDescription>Control tracking and analytics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Open Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Track when recipients open your emails
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Link Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Track when recipients click links
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Reply Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified immediately when prospects reply
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sending Limits</CardTitle>
              <CardDescription>Configure daily sending limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dailyLimit">Daily Email Limit</Label>
                <Input id="dailyLimit" type="number" defaultValue="200" />
                <p className="text-xs text-muted-foreground">
                  Maximum emails to send per day (recommended: 200-400)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warmupSchedule">Warmup Schedule</Label>
                <Select defaultValue="standard">
                  <SelectTrigger id="warmupSchedule">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">No Warmup</SelectItem>
                    <SelectItem value="standard">Standard (14 days)</SelectItem>
                    <SelectItem value="conservative">Conservative (21 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <GmailIntegration />

          <Card>
            <CardHeader>
              <CardTitle>CRM Integration</CardTitle>
              <CardDescription>Connect your CRM for seamless data sync</CardDescription>
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
                  <Button variant="outline">Connect</Button>
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">HubSpot</p>
                      <p className="text-xs text-muted-foreground">Two-way sync with HubSpot CRM</p>
                    </div>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>
                <div className="flex items-center justify-between p-4 border border-primary/30 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Pipedrive</p>
                      <p className="text-xs text-muted-foreground">Connected • Syncing daily</p>
                    </div>
                  </div>
                  <Button variant="outline">Disconnect</Button>
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
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
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
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
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
                        <span className="text-2xl font-bold text-primary">
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
                            Trial credits do not reset. Contact us to upgrade your plan.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Loading plan info...</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
