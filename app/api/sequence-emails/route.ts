import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { format, formatDistanceToNow, isBefore, isToday, isTomorrow } from "date-fns"

export const dynamic = 'force-dynamic'

// GET /api/sequence-emails - Get emails to be sent from active sequences
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "sequence" // sequence or priority

    // Get active prospect sequences with email steps
    const prospectSequences = await prisma.prospectSequence.findMany({
      where: {
        status: "active",
        sequence: {
          userId,
          status: "active",
        },
      },
      include: {
        prospect: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            title: true,
          },
        },
        sequence: {
          include: {
            steps: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
      orderBy: {
        nextActionAt: "asc",
      },
    })

    // Transform to email format
    const emails = prospectSequences
      .map((ps) => {
        const currentStep = ps.sequence.steps[ps.currentStep]

        // Only include email steps
        if (!currentStep || currentStep.type !== "email") {
          return null
        }

        // Determine if this is priority (overdue or due today)
        const isPriority = ps.nextActionAt
          ? isBefore(new Date(ps.nextActionAt), new Date()) || isToday(new Date(ps.nextActionAt))
          : false

        // Filter by type
        if (type === "priority" && !isPriority) {
          return null
        }
        if (type === "sequence" && isPriority) {
          return null
        }

        // Format date
        let dateStr = "Not scheduled"
        if (ps.nextActionAt) {
          const nextAction = new Date(ps.nextActionAt)
          if (isToday(nextAction)) {
            dateStr = `Today, ${format(nextAction, "h:mm a")}`
          } else if (isTomorrow(nextAction)) {
            dateStr = `Tomorrow, ${format(nextAction, "h:mm a")}`
          } else {
            dateStr = format(nextAction, "MMM d, h:mm a")
          }
        }

        // Determine priority level
        let priority = "medium"
        if (ps.nextActionAt && isBefore(new Date(ps.nextActionAt), new Date())) {
          priority = "high" // Overdue
        } else if (ps.nextActionAt && isToday(new Date(ps.nextActionAt))) {
          const hoursUntil = (new Date(ps.nextActionAt).getTime() - new Date().getTime()) / (1000 * 60 * 60)
          if (hoursUntil < 2) {
            priority = "high"
          }
        }

        // Generate preview from email body
        const preview = currentStep.emailBody
          ? currentStep.emailBody.substring(0, 80).replace(/\n/g, " ") + "..."
          : "No preview available"

        return {
          id: ps.id,
          prospectId: ps.prospect.id,
          recipient: ps.prospect.name,
          email: ps.prospect.email,
          company: ps.prospect.company || "Unknown Company",
          title: ps.prospect.title,
          subject: currentStep.emailSubject || "No subject",
          preview,
          sequence: ps.sequence.name,
          stage: currentStep.name,
          date: dateStr,
          status: ps.nextActionAt && isBefore(new Date(ps.nextActionAt), new Date()) ? "overdue" : "scheduled",
          priority,
          stepOrder: ps.currentStep + 1,
          totalSteps: ps.sequence.steps.length,
          nextActionAt: ps.nextActionAt,
          emailBody: currentStep.emailBody,
          context: `Step ${ps.currentStep + 1} of ${ps.sequence.steps.length}`,
          contextType: "sequence_email",
        }
      })
      .filter(Boolean)

    return NextResponse.json({ emails })
  } catch (error: any) {
    console.error("Error fetching sequence emails:", error)
    return NextResponse.json(
      { error: "Failed to fetch sequence emails" },
      { status: 500 }
    )
  }
})
