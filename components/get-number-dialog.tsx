"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality: string
  region: string
  areaCode: string
}

interface AddedNumber {
  id: string
  number: string
  friendlyName: string
  areaCode: string
}

interface GetNumberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingCount: number
  onNumberAdded?: (number: AddedNumber) => void
}

export function GetNumberDialog({ open, onOpenChange, existingCount, onNumberAdded }: GetNumberDialogProps) {
  const [step, setStep] = useState<"area-code" | "pick" | "confirm" | "no-credits">("area-code")
  const [areaCode, setAreaCode] = useState("")
  const [searching, setSearching] = useState(false)
  const [available, setAvailable] = useState<AvailableNumber[]>([])
  const [selected, setSelected] = useState<AvailableNumber | null>(null)
  const [provisioning, setProvisioning] = useState(false)
  const { toast } = useToast()

  const reset = () => {
    setStep("area-code")
    setAreaCode("")
    setAvailable([])
    setSelected(null)
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) reset()
    onOpenChange(v)
  }

  const handleSearch = async () => {
    if (!/^\d{3}$/.test(areaCode)) {
      toast({ title: "Enter a valid 3-digit area code", variant: "destructive" })
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/calling/numbers/search?areaCode=${areaCode}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.numbers.length === 0) {
        if (data.reason === "invalid_area_code") {
          toast({ title: "That area code doesn't exist. Double-check and try again.", variant: "destructive" })
        } else {
          toast({ title: "No numbers available right now.", description: "Check back later or try a nearby area code.", variant: "destructive" })
        }
        return
      }
      setAvailable(data.numbers)
      setStep("pick")
    } catch (err: any) {
      toast({ title: err.message || "Search failed", variant: "destructive" })
    } finally {
      setSearching(false)
    }
  }

  const handleProvision = async () => {
    if (!selected) return
    setProvisioning(true)
    try {
      const res = await fetch("/api/calling/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: selected.phoneNumber,
          friendlyName: selected.friendlyName,
          areaCode: selected.areaCode,
        }),
      })
      const data = await res.json()
      if (res.status === 402) {
        setStep("no-credits")
        return
      }
      if (!res.ok) throw new Error(data.error)
      toast({ title: `${selected.friendlyName} added to your account` })
      onNumberAdded?.(data.phoneNumber)
      handleOpenChange(false)
    } catch (err: any) {
      toast({ title: err.message || "Failed to provision number", variant: "destructive" })
    } finally {
      setProvisioning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Phone Number</DialogTitle>
          <DialogDescription>
            Your first number is free. Additional numbers cost 50 credits each.
          </DialogDescription>
        </DialogHeader>

        {step === "area-code" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Area Code</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 415"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  className="w-32"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching || areaCode.length !== 3}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {searching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "pick" && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">Available numbers in area code {areaCode}:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {available.map((n) => (
                <button
                  key={n.phoneNumber}
                  onClick={() => { setSelected(n); setStep("confirm") }}
                  className={`w-full text-left px-3 py-2.5 rounded-md border text-sm transition-colors hover:bg-muted ${
                    selected?.phoneNumber === n.phoneNumber ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="font-mono font-medium">{n.friendlyName}</span>
                  {n.locality && (
                    <span className="ml-2 text-xs text-muted-foreground">{n.locality}, {n.region}</span>
                  )}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setStep("area-code")}>Back</Button>
          </div>
        )}

        {step === "confirm" && selected && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-1">
              <p className="font-mono font-semibold">{selected.friendlyName}</p>
              {selected.locality && (
                <p className="text-sm text-muted-foreground">{selected.locality}, {selected.region}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {existingCount === 0 ? "Free — your first number" : "50 credits"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("pick")} disabled={provisioning}>Back</Button>
              <Button onClick={handleProvision} disabled={provisioning}>
                {provisioning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {provisioning ? "Provisioning..." : "Confirm & Add"}
              </Button>
            </div>
          </div>
        )}

        {step === "no-credits" && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-lg border border-destructive/40 bg-destructive/5 space-y-1.5">
              <p className="font-semibold text-sm">Not enough credits</p>
              <p className="text-sm text-muted-foreground">
                Adding a second number costs <span className="font-medium text-foreground">50 credits</span>. You don&apos;t have enough on your current plan.
              </p>
            </div>
            <div className="space-y-2">
              <a href="/upgrade">
                <Button className="w-full">Upgrade plan for more credits</Button>
              </a>
              <Button variant="outline" className="w-full" onClick={() => handleOpenChange(false)}>
                Maybe later
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
