"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { CompanyAutocomplete } from "@/components/company-autocomplete"
import { ChevronUp } from "lucide-react"
import { getTimezoneFromLocation } from "@/lib/timezone"

type AddProspectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProspectAdded: () => void
}

export function AddProspectDialog({ open, onOpenChange, onProspectAdded }: AddProspectDialogProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [basicOpen, setBasicOpen] = useState(true)
  const [additionalOpen, setAdditionalOpen] = useState(true)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    title: "",
    company: "",
    companyName: "",
    status: "new_lead",
    phone: "",
    phoneNotes: "",
    linkedin: "",
    location: "",
    timezone: "",
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      if (field === "location") {
        const derived = getTimezoneFromLocation(value)
        if (derived && !prev.timezone) next.timezone = derived
        else if (derived) next.timezone = derived
      }
      return next
    })
  }

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      title: "",
      company: "",
      companyName: "",
      status: "new_lead",
      phone: "",
      phoneNotes: "",
      linkedin: "",
      location: "",
      timezone: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const name = [formData.firstName, formData.lastName].filter(Boolean).join(" ")

    if (!name) {
      toast({
        title: "Validation error",
        description: "First name is required",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: formData.email || null,
          title: formData.title || null,
          company: formData.company || formData.companyName || null,
          phone: formData.phone || null,
          notes: formData.phoneNotes || null,
          linkedin: formData.linkedin || null,
          location: formData.location || null,
          timezone: formData.timezone || null,
          status: formData.status,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create prospect")
      }

      toast({ title: "Success", description: `${name} has been added` })
      onProspectAdded()
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Failed to add prospect",
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
          <DialogTitle className="text-base font-semibold">Create New Contact</DialogTitle>
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
            <Button type="submit" form="prospect-form" size="sm" disabled={submitting}>
              {submitting ? "Saving..." : "Save Contact"}
            </Button>
          </div>
        </div>

        <form id="prospect-form" onSubmit={handleSubmit}>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="firstName" className="text-sm font-medium">First name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleChange("firstName", e.target.value)}
                      placeholder="Type the person's first name"
                      disabled={submitting}
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="lastName" className="text-sm font-medium">Last name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      placeholder="Type the person's last name"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">Primary email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="Type their email address"
                    disabled={submitting}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="title" className="text-sm font-medium">Job title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder='"Director of Sales", "VP of Marketing", etc.'
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-sm font-medium">Company</Label>
                    <CompanyAutocomplete
                      value={formData.company}
                      onChange={(value) => handleChange("company", value)}
                      onAccountSelected={(account) => {
                        setFormData((prev) => {
                          const loc = !prev.location && account.location ? account.location : prev.location
                          const tz = loc ? (getTimezoneFromLocation(loc) ?? prev.timezone) : prev.timezone
                          return { ...prev, location: loc, timezone: tz }
                        })
                      }}
                      placeholder="Choose / type Company name"
                      disabled={submitting}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="companyName" className="text-sm font-medium">Company name</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleChange("companyName", e.target.value)}
                      placeholder="Company name"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="status" className="text-sm font-medium">Stage</Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                    <SelectTrigger id="status" disabled={submitting}>
                      <SelectValue placeholder="Select contact stage..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_lead">New Lead</SelectItem>
                      <SelectItem value="in_sequence">In Sequence</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="unqualified">Unqualified</SelectItem>
                    </SelectContent>
                  </Select>
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
                <div className="grid gap-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Company Phone{" "}
                    <span className="font-normal text-muted-foreground text-xs">
                      (When saved, this number will also update at the Company level.)
                    </span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="Type phone number"
                    disabled={submitting}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="phoneNotes" className="text-sm font-medium">Phone Notes</Label>
                  <Textarea
                    id="phoneNotes"
                    value={formData.phoneNotes}
                    onChange={(e) => handleChange("phoneNotes", e.target.value)}
                    placeholder="Use this box to enter instructions on how to enter through the phone tree. (E.g. Dial 123# to reach the Contact's direct line)."
                    disabled={submitting}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="linkedin" className="text-sm font-medium">Linkedin URL</Label>
                  <Input
                    id="linkedin"
                    value={formData.linkedin}
                    onChange={(e) => handleChange("linkedin", e.target.value)}
                    placeholder="Copy & paste their LinkedIn URL (e.g. linkedin.com/contactname)"
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleChange("location", e.target.value)}
                      placeholder="Location / Country"
                      disabled={submitting}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="timezone" className="text-sm font-medium">Time Zone</Label>
                    <Input
                      id="timezone"
                      value={formData.timezone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, timezone: e.target.value }))}
                      placeholder="Auto-filled from location (e.g. America/New_York)"
                      disabled={submitting}
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
