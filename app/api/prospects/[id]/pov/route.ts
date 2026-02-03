import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"

const anthropic = new Anthropic()

// POST /api/prospects/[id]/pov - Generate POV for a prospect
export const POST = withAuth(
  async (
    request: NextRequest,
    userId: string,
    context?: { params: { id: string } }
  ) => {
    try {
      if (!context?.params?.id) {
        return NextResponse.json({ error: "Prospect ID is required" }, { status: 400 })
      }
      const id = context.params.id

      // Get the prospect
      const prospect = await prisma.prospect.findUnique({
        where: { id, userId },
      })

      if (!prospect) {
        return NextResponse.json(
          { error: "Prospect not found" },
          { status: 404 }
        )
      }

      // Get the user's organization for context
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true },
      })

      const org = user?.organization
      const pdlData = prospect.pdlData as Record<string, any> | null

      // Build context for AI
      const prospectContext = `
Prospect Information:
- Name: ${prospect.name}
- Title: ${prospect.title || "Unknown"}
- Company: ${prospect.company || "Unknown"}
- Industry: ${pdlData?.industry || "Unknown"}
- Company Size: ${pdlData?.companySize ? `${pdlData.companySize} employees` : "Unknown"}
- Seniority Level: ${pdlData?.seniorityLevel || "Unknown"}
- Location: ${prospect.location || "Unknown"}

${org ? `
Your Company Context:
- Company: ${org.name}
- Industry: ${org.industry || "Not specified"}
- What you do: ${org.description || "Not specified"}
- Target Audience: ${org.targetAudience || "Not specified"}
- Pain Points you solve: ${org.painPoints || "Not specified"}
- Value Proposition: ${org.valueProposition || "Not specified"}
` : ""}
`.trim()

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are a sales intelligence assistant. Based on the following prospect information, generate a point of view (POV) that will help a sales rep understand and approach this prospect effectively.

${prospectContext}

Generate a JSON response with exactly these four fields:
1. "opportunity" - A 2-3 sentence analysis of the sales opportunity based on their role, company, and likely responsibilities. What problems might they face that you could solve?
2. "industryContext" - A 2-3 sentence overview of relevant industry trends, challenges, or pressures facing companies like theirs.
3. "howToHelp" - A 2-3 sentence description of specifically how your solution could help this prospect based on their role and company context.
4. "angle" - A 2-3 sentence recommended approach/angle for the conversation. What should you lead with? What pain points to emphasize?

Respond ONLY with valid JSON, no other text. Example format:
{
  "opportunity": "...",
  "industryContext": "...",
  "howToHelp": "...",
  "angle": "..."
}`,
          },
        ],
      })

      // Parse the AI response
      const responseText =
        message.content[0].type === "text" ? message.content[0].text : ""

      let povData
      try {
        povData = JSON.parse(responseText)
      } catch {
        // If JSON parsing fails, create a structured response from the text
        povData = {
          opportunity: `${prospect.name} is a ${prospect.title || "professional"} at ${prospect.company || "their company"}, likely responsible for key decisions in their domain.`,
          industryContext:
            "Companies in this space are facing increasing pressure to improve efficiency and demonstrate ROI on their investments.",
          howToHelp:
            "Your solution can help streamline their workflows and provide measurable value to their organization.",
          angle:
            "Lead with industry-specific challenges and how similar companies have achieved success with your solution.",
        }
      }

      // Save the POV to the prospect
      await prisma.prospect.update({
        where: { id },
        data: { povData },
      })

      return NextResponse.json({ pov: povData })
    } catch (error: any) {
      console.error("Error generating POV:", error)
      return NextResponse.json(
        { error: "Failed to generate POV", details: error.message },
        { status: 500 }
      )
    }
  }
)
