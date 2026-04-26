"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ChevronUp } from "lucide-react"

type AddAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccountAdded: () => void
}

export function AddAccountDialog({ open, onOpenChange, onAccountAdded }: AddAccountDialogProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [basicOpen, setBasicOpen] = useState(true)
  const [additionalOpen, setAdditionalOpen] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    status: "new_lead",
    website: "",
    linkedin: "",
    location: "",
    industry: "",
    employees: "",
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      status: "new_lead",
      website: "",
      linkedin: "",
      location: "",
      industry: "",
      employees: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      toast({
        title: "Validation error",
        description: "Company name is required",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          industry: formData.industry || null,
          location: formData.location || null,
          website: formData.website || null,
          linkedin: formData.linkedin || null,
          employees: formData.employees ? parseInt(formData.employees) : null,
          status: formData.status,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create account")
      }

      toast({ title: "Success", description: `${formData.name} has been added` })
      onAccountAdded()
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Failed to add account",
        description: error.message || "An error occurred",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <DialogTitle className="text-base font-semibold">Create new Company</DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { onOpenChange(false); resetForm() }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="account-form" size="sm" disabled={submitting}>
              {submitting ? "Saving..." : "Save Company"}
            </Button>
          </div>
        </div>

        <form id="account-form" onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="border-b border-border">
            <button
              type="button"
              className="w-full flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors"
              onClick={() => setBasicOpen(!basicOpen)}
            >
              <span className="text-sm font-semibold text-blue-500">Basic Information</span>
              <ChevronUp className={`h-4 w-4 text-blue-500 transition-transform duration-200 ${basicOpen ? "" : "rotate-180"}`} />
            </button>

            {basicOpen && (
              <div className="px-6 pb-5 grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Type the company name"
                    disabled={submitting}
                    autoFocus
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="status" className="text-sm font-medium">Stage</Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                    <SelectTrigger id="status" disabled={submitting}>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_lead">New Lead</SelectItem>
                      <SelectItem value="in_sequence">In Sequence</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="churned">Churned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="website" className="text-sm font-medium">Domain</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleChange("website", e.target.value)}
                      placeholder="e.g. acmecorp.com"
                      disabled={submitting}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="linkedin" className="text-sm font-medium">LinkedIn URL</Label>
                    <Input
                      id="linkedin"
                      value={formData.linkedin}
                      onChange={(e) => handleChange("linkedin", e.target.value)}
                      placeholder="linkedin.com/company/apolloio"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    placeholder="City, State or Country"
                    disabled={submitting}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div>
            <button
              type="button"
              className="w-full flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors"
              onClick={() => setAdditionalOpen(!additionalOpen)}
            >
              <span className="text-sm font-semibold text-blue-500">Additional Information</span>
              <ChevronUp className={`h-4 w-4 text-blue-500 transition-transform duration-200 ${additionalOpen ? "" : "rotate-180"}`} />
            </button>

            {additionalOpen && (
              <div className="px-6 pb-6 grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="industry" className="text-sm font-medium">Industry</Label>
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => handleChange("industry", e.target.value)}
                      placeholder="e.g. Technology, Healthcare"
                      disabled={submitting}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="employees" className="text-sm font-medium">Number of Employees</Label>
                    <Input
                      id="employees"
                      type="number"
                      value={formData.employees}
                      onChange={(e) => handleChange("employees", e.target.value)}
                      placeholder="e.g. 250"
                      disabled={submitting}
                      min="1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
