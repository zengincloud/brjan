"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lightbulb, Sparkles, RefreshCw, Target, Building2, HelpCircle, Compass } from "lucide-react"

type POVData = {
  opportunity: string
  industryContext: string
  howToHelp: string
  angle: string
}

type ProspectPOVProps = {
  prospectId: string
  prospectName: string
  company?: string | null
  title?: string | null
  industry?: string | null
  povData?: POVData | null
  onPOVGenerated?: () => void
}

export function ProspectPOV({
  prospectId,
  prospectName,
  company,
  title,
  industry,
  povData,
  onPOVGenerated,
}: ProspectPOVProps) {
  const [loading, setLoading] = useState(false)
  const [pov, setPov] = useState<POVData | null>(povData || null)

  const generatePOV = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/prospects/${prospectId}/pov`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to generate POV")
      }

      const data = await response.json()
      setPov(data.pov)
      onPOVGenerated?.()
    } catch (error) {
      console.error("Error generating POV:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!pov) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <CardTitle>Point of View</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Generate an AI-powered point of view to help you understand this prospect's needs and how to approach them.
            </p>
            <Button onClick={generatePOV} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate POV
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-primary">Point of View</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={generatePOV} disabled={loading}>
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Target className="h-4 w-4" />
            Opportunity
          </div>
          <p className="text-sm text-foreground leading-relaxed pl-6">
            {pov.opportunity}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Building2 className="h-4 w-4" />
            Industry Context
          </div>
          <p className="text-sm text-foreground leading-relaxed pl-6">
            {pov.industryContext}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <HelpCircle className="h-4 w-4" />
            How to Help
          </div>
          <p className="text-sm text-foreground leading-relaxed pl-6">
            {pov.howToHelp}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Compass className="h-4 w-4" />
            Angle
          </div>
          <p className="text-sm text-foreground leading-relaxed pl-6">
            {pov.angle}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
