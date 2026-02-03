"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb, Target, Building2, HelpCircle, Compass } from "lucide-react"

type POVData = {
  opportunity: string
  industryContext: string
  howToHelp: string
  angle: string
}

type ProspectPOVProps = {
  povData?: POVData | null
}

export function ProspectPOV({ povData }: ProspectPOVProps) {
  if (!povData) {
    return null
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <CardTitle className="text-primary">Point of View</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Target className="h-4 w-4" />
            Opportunity
          </div>
          <p className="text-sm text-foreground leading-relaxed pl-6">
            {povData.opportunity}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Building2 className="h-4 w-4" />
            Industry Context
          </div>
          <p className="text-sm text-foreground leading-relaxed pl-6">
            {povData.industryContext}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <HelpCircle className="h-4 w-4" />
            How to Help
          </div>
          <p className="text-sm text-foreground leading-relaxed pl-6">
            {povData.howToHelp}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Compass className="h-4 w-4" />
            Angle
          </div>
          <p className="text-sm text-foreground leading-relaxed pl-6">
            {povData.angle}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
