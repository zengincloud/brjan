"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Building2, Lock, Loader2, Users, Target, AlertCircle, Sparkles, Zap } from "lucide-react"
import { toast } from "sonner"

type Organization = {
  id: string
  name: string
  description: string | null
  targetAudience: string | null
  painPoints: string | null
  valueProposition: string | null
  industry: string | null
  website: string | null
  targetEmails: number
  targetCalls: number
  targetLeads: number
  targetLinkedin: number
}

type UserInfo = {
  role: "super_admin" | "owner" | "manager" | "member"
  organizationId: string | null
}

export function OrganizationSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    targetAudience: "",
    painPoints: "",
    valueProposition: "",
    industry: "",
    website: "",
    targetEmails: 40,
    targetCalls: 500,
    targetLeads: 50,
    targetLinkedin: 20,
  })

  const canEdit = userInfo?.role === "owner" || userInfo?.role === "manager" || userInfo?.role === "super_admin"

  useEffect(() => {
    loadOrganization()
  }, [])

  const loadOrganization = async () => {
    try {
      const response = await fetch("/api/organization")
      if (response.ok) {
        const data = await response.json()
        setOrganization(data.organization)
        setUserInfo(data.userInfo)
        if (data.organization) {
          setFormData({
            name: data.organization.name || "",
            description: data.organization.description || "",
            targetAudience: data.organization.targetAudience || "",
            painPoints: data.organization.painPoints || "",
            valueProposition: data.organization.valueProposition || "",
            industry: data.organization.industry || "",
            website: data.organization.website || "",
            targetEmails: data.organization.targetEmails ?? 40,
            targetCalls: data.organization.targetCalls ?? 500,
            targetLeads: data.organization.targetLeads ?? 50,
            targetLinkedin: data.organization.targetLinkedin ?? 20,
          })
        }
      }
    } catch (error) {
      console.error("Failed to load organization:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!canEdit) return

    if (!formData.name.trim()) {
      toast.error("Please enter a Company Name before saving")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/organization", {
        method: organization ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to save organization")
      }

      setOrganization(data.organization)
      toast.success("Organization settings saved successfully")
    } catch (error: any) {
      console.error("Failed to save organization:", error)
      toast.error(error.message || "Failed to save organization settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Organization Profile</CardTitle>
                <CardDescription>
                  Company information used for AI-powered prospecting and outreach
                </CardDescription>
              </div>
            </div>
            {!canEdit && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                View Only
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Company Info */}
      <Card className={!canEdit ? "opacity-75" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orgName" className="text-muted-foreground text-sm">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="orgName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!canEdit}
                placeholder="Your company name"
                className={!canEdit ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry" className="text-muted-foreground text-sm">
                Industry
              </Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                disabled={!canEdit}
                placeholder="e.g. Healthcare, Finance, Manufacturing..."
                className={!canEdit ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website" className="text-muted-foreground text-sm">
              Website
            </Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              disabled={!canEdit}
              placeholder="https://acme.com"
              className={!canEdit ? "bg-muted cursor-not-allowed" : ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* What You Do */}
      <Card className={!canEdit ? "opacity-75" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            What You Do
          </CardTitle>
          <CardDescription>
            Describe your product/service and core value proposition
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description" className="text-muted-foreground text-sm">
              Company Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={!canEdit}
              placeholder="Describe what your company does, your core products or services..."
              rows={3}
              className={!canEdit ? "bg-muted cursor-not-allowed resize-none" : "resize-none"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valueProposition" className="text-muted-foreground text-sm">
              Value Proposition
            </Label>
            <Textarea
              id="valueProposition"
              value={formData.valueProposition}
              onChange={(e) => setFormData({ ...formData, valueProposition: e.target.value })}
              disabled={!canEdit}
              placeholder="What makes your offering unique? Why do customers choose you over alternatives?"
              rows={2}
              className={!canEdit ? "bg-muted cursor-not-allowed resize-none" : "resize-none"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Who You Sell To */}
      <Card className={!canEdit ? "opacity-75" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Who You Sell To
          </CardTitle>
          <CardDescription>
            Define your ideal customer profile (ICP) and target audience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="text-muted-foreground text-sm">
              Target Audience / ICP
            </Label>
            <Textarea
              id="targetAudience"
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              disabled={!canEdit}
              placeholder="Who are your ideal customers? Include titles, company size, industry, and what they're looking for..."
              rows={3}
              className={!canEdit ? "bg-muted cursor-not-allowed resize-none" : "resize-none"}
            />
          </div>
        </CardContent>
      </Card>

      {/* SDR Weekly Targets */}
      <Card className={!canEdit ? "opacity-75" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            SDR Weekly Targets
          </CardTitle>
          <CardDescription>
            Set weekly activity targets for your SDR team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="targetEmails" className="text-muted-foreground text-sm">
                Emails per Week
              </Label>
              <Input
                id="targetEmails"
                type="number"
                min={1}
                value={formData.targetEmails || ""}
                onChange={(e) => setFormData({ ...formData, targetEmails: e.target.value === "" ? 0 : Number(e.target.value) })}
                disabled={!canEdit}
                className={!canEdit ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetCalls" className="text-muted-foreground text-sm">
                Calls per Week
              </Label>
              <Input
                id="targetCalls"
                type="number"
                min={1}
                value={formData.targetCalls || ""}
                onChange={(e) => setFormData({ ...formData, targetCalls: e.target.value === "" ? 0 : Number(e.target.value) })}
                disabled={!canEdit}
                className={!canEdit ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetLeads" className="text-muted-foreground text-sm">
                New Leads per Week
              </Label>
              <Input
                id="targetLeads"
                type="number"
                min={1}
                value={formData.targetLeads || ""}
                onChange={(e) => setFormData({ ...formData, targetLeads: e.target.value === "" ? 0 : Number(e.target.value) })}
                disabled={!canEdit}
                className={!canEdit ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetLinkedin" className="text-muted-foreground text-sm">
                LinkedIn Outreaches per Week
              </Label>
              <Input
                id="targetLinkedin"
                type="number"
                min={1}
                value={formData.targetLinkedin || ""}
                onChange={(e) => setFormData({ ...formData, targetLinkedin: e.target.value === "" ? 0 : Number(e.target.value) })}
                disabled={!canEdit}
                className={!canEdit ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pain Points */}
      <Card className={!canEdit ? "opacity-75" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Prospect Pain Points
          </CardTitle>
          <CardDescription>
            Common challenges your prospects face that you solve
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="painPoints" className="text-muted-foreground text-sm">
              Typical Pain Points
            </Label>
            <Textarea
              id="painPoints"
              value={formData.painPoints}
              onChange={(e) => setFormData({ ...formData, painPoints: e.target.value })}
              disabled={!canEdit}
              placeholder="What challenges do your prospects typically face that your product or service solves?"
              rows={5}
              className={!canEdit ? "bg-muted cursor-not-allowed resize-none" : "resize-none"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button / Manager Notice */}
      {canEdit ? (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Lock className="h-5 w-5" />
              <div>
                <p className="font-medium text-sm">View Only</p>
                <p className="text-xs">
                  Only organization owners and managers can edit these settings. Contact your manager to request changes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
