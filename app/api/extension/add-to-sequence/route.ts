import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withExtensionAuth } from "@/lib/auth/extension-middleware"
import { checkCredits, deductCredits } from "@/lib/credits"
import { findOrCreateAccount } from "@/lib/account-linking"
import { pushContact, pushCompany, associateContactToCompany } from "@/lib/hubspot/client"
import { getValidAccessToken } from "@/lib/hubspot/oauth"

export const dynamic = 'force-dynamic'

function toTitleCase(str: string | null | undefined): string {
  if (typeof str !== "string" || !str) return ""
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// POST /api/extension/add-to-sequence
// Adds a prospect to a sequence. Accepts prospectId and sequenceId.
// If prospectId is not provided but prospect data is included, creates the prospect first.
export const POST = withExtensionAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    let { prospectId, sequenceId } = body
    const { prospectData } = body

    if (!sequenceId) {
      return NextResponse.json(
        { error: "sequenceId is required" },
        { status: 400 }
      )
    }

    if (!prospectId && !prospectData) {
      return NextResponse.json(
        { error: "prospectId or prospectData is required" },
        { status: 400 }
      )
    }

    // Verify sequence belongs to user and has steps
    const sequence = await prisma.sequence.findUnique({
      where: { id: sequenceId, userId },
      include: {
        steps: { orderBy: { order: "asc" } },
      },
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    if (sequence.steps.length === 0) {
      return NextResponse.json(
        { error: "Cannot add prospect to an empty sequence" },
        { status: 400 }
      )
    }

    // If no prospectId, create the prospect first
    let prospect
    let prospectCreated = false

    if (!prospectId && prospectData) {
      const { name, email, title, company, phone, location, linkedin, notes, wizaData } = prospectData

      if (!name) {
        return NextResponse.json({ error: "Prospect name is required" }, { status: 400 })
      }

      // Check credits
      const creditCheck = await checkCredits(userId, "prospect_created")
      if (!creditCheck.allowed) {
        return NextResponse.json({ error: creditCheck.error }, { status: 403 })
      }

      // Check for existing prospect by email
      if (email) {
        const existing = await prisma.prospect.findFirst({
          where: { email, userId },
        })
        if (existing) {
          prospect = existing
          prospectId = existing.id
        }
      }

      if (!prospect) {
        // Auto-link or create account
        const accountId = company ? await findOrCreateAccount(userId, company, {
          industry: wizaData?.companyIndustry || null,
          location: wizaData?.location || location || null,
          website: wizaData?.companyDomain ? `https://${wizaData.companyDomain}` : null,
          employees: wizaData?.companySize || null,
          linkedin: wizaData?.companyLinkedinUrl || null,
        }) : null

        let resolvedCompany = company
        if (accountId) {
          const account = await prisma.account.findUnique({
            where: { id: accountId },
            select: { name: true },
          })
          if (account) resolvedCompany = account.name
        }

        // Generate POV data
        const industry = wizaData?.companyIndustry || null
        const povData = name ? {
          opportunity: `${toTitleCase(name)} is a ${toTitleCase(title) || "professional"} at ${toTitleCase(resolvedCompany) || "their company"}${industry ? ` in the ${industry} space` : ""}. ${title ? `As a ${toTitleCase(title)}, their job entails overseeing team performance, driving strategic initiatives, and managing key stakeholder relationships.` : ""} They may be actively evaluating solutions.`,
          industryContext: industry
            ? `In the ${industry} space, companies like ${toTitleCase(resolvedCompany) || "theirs"} are currently facing challenges around digital transformation and operational efficiency.`
            : `Companies like ${toTitleCase(resolvedCompany) || "theirs"} are currently facing challenges around digital transformation and operational efficiency.`,
          howToHelp: `Your platform can help ${toTitleCase(name)} address operational efficiency, team productivity, and scalable processes while delivering measurable ROI.`,
          angle: `Lead with ROI metrics and case studies from similar ${industry ? `companies in the ${industry} space` : "companies"}. Emphasize quick time-to-value and ease of implementation.`,
        } : null

        prospect = await prisma.prospect.create({
          data: {
            name,
            email,
            title,
            company: resolvedCompany,
            phone,
            location,
            linkedin,
            ...(notes && { notes }),
            status: "new_lead",
            wizaData,
            ...(povData && { povData }),
            ...(accountId && { accountId }),
            userId,
          },
        })
        prospectId = prospect.id
        prospectCreated = true

        await deductCredits(userId, "prospect_created")

        // Push to HubSpot in background (non-blocking)
        getValidAccessToken(userId).then(async (hsToken) => {
          if (!hsToken) return
          try {
            let hsCompanyId: string | null = null
            if (accountId) {
              const account = await prisma.account.findUnique({
                where: { id: accountId },
                select: { name: true, industry: true, location: true, website: true, employees: true, linkedin: true, insights: true },
              })
              if (account) {
                hsCompanyId = (account.insights as any)?.hubspotCompanyId || null
                if (!hsCompanyId) {
                  const companyResult = await pushCompany(hsToken, {
                    name: account.name,
                    industry: account.industry,
                    location: account.location,
                    website: account.website,
                    employees: account.employees,
                    linkedin: account.linkedin,
                  })
                  hsCompanyId = companyResult.hubspotCompanyId
                  await prisma.account.update({
                    where: { id: accountId },
                    data: {
                      insights: {
                        ...(typeof account.insights === "object" && account.insights !== null ? account.insights : {}),
                        hubspotCompanyId: hsCompanyId,
                      } as any,
                    },
                  })
                }
              }
            }
            const result = await pushContact(hsToken, { name, email, phone, title, company: resolvedCompany, linkedin })
            await prisma.prospect.update({
              where: { id: prospect!.id },
              data: {
                wizaData: {
                  ...(typeof prospect!.wizaData === "object" && prospect!.wizaData !== null ? prospect!.wizaData : {}),
                  hubspotContactId: result.hubspotContactId,
                } as any,
              },
            })
            if (hsCompanyId) {
              await associateContactToCompany(hsToken, result.hubspotContactId, hsCompanyId)
            }
          } catch (err) {
            console.error("HubSpot sync error (non-blocking):", err)
          }
        })
      }
    } else {
      // Verify existing prospect belongs to user
      prospect = await prisma.prospect.findUnique({
        where: { id: prospectId, userId },
      })

      if (!prospect) {
        return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
      }
    }

    // Calculate next action time based on first step delay
    const firstStep = sequence.steps[0]
    const hasNoDelay = firstStep.delayDays === 0 && firstStep.delayHours === 0

    const nextActionAt = new Date()
    nextActionAt.setDate(nextActionAt.getDate() + firstStep.delayDays)
    nextActionAt.setHours(nextActionAt.getHours() + firstStep.delayHours)

    // For call steps, override to now so they appear in dialer immediately
    const effectiveNextActionAt = firstStep.type === 'call' ? new Date() : nextActionAt

    // Upsert into ProspectSequence
    const prospectSequence = await prisma.prospectSequence.upsert({
      where: {
        prospectId_sequenceId: { prospectId, sequenceId },
      },
      update: {
        status: "active",
        currentStep: 0,
        nextActionAt: effectiveNextActionAt,
        pausedAt: null,
      },
      create: {
        prospectId,
        sequenceId,
        currentStep: 0,
        status: "active",
        nextActionAt: effectiveNextActionAt,
      },
    })

    // Update prospect status
    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        status: "in_sequence",
        sequence: sequence.name,
        sequenceStep: firstStep.name,
      },
    })

    // Create tasks immediately for non-wait steps with no delay, or for call steps (always)
    let taskCreated = false
    const shouldCreateImmediately = firstStep.type !== 'wait' && (hasNoDelay || firstStep.type === 'call')
    if (shouldCreateImmediately) {
      try {
        const now = new Date()
        switch (firstStep.type) {
          case 'email':
            await prisma.email.create({
              data: {
                to: prospect.email,
                from: userId,
                subject: firstStep.emailSubject || `Follow up with ${prospect.name}`,
                bodyText: firstStep.emailBody || '',
                bodyHtml: firstStep.emailBody || '',
                prospectId: prospect.id,
                emailType: 'sequence',
                status: 'draft',
                userId,
                metadata: {
                  sequenceId: sequence.id,
                  sequenceName: sequence.name,
                  stepId: firstStep.id,
                  stepName: firstStep.name,
                }
              }
            })
            taskCreated = true
            break

          case 'call':
            await prisma.task.create({
              data: {
                title: `Call: ${prospect.name}`,
                description: firstStep.callScript || `Call ${prospect.name} from sequence "${sequence.name}"`,
                type: 'follow_up',
                status: 'to_do',
                priority: 'high',
                dueDate: now,
                userId,
                contact: {
                  prospectId: prospect.id,
                  name: prospect.name,
                  email: prospect.email,
                  phone: prospect.phone,
                  company: prospect.company,
                  title: prospect.title,
                  sequenceId: sequence.id,
                  sequenceName: sequence.name,
                  stepId: firstStep.id,
                  stepName: firstStep.name,
                  stepType: firstStep.type,
                },
              }
            })
            taskCreated = true
            break

          case 'linkedin':
            await prisma.task.create({
              data: {
                title: `LinkedIn: ${prospect.name}`,
                description: firstStep.taskNotes || `Reach out to ${prospect.name} on LinkedIn from sequence "${sequence.name}"`,
                type: 'linkedin',
                status: 'to_do',
                priority: 'medium',
                dueDate: now,
                userId,
                contact: {
                  prospectId: prospect.id,
                  name: prospect.name,
                  email: prospect.email,
                  linkedin: prospect.linkedin,
                  company: prospect.company,
                  title: prospect.title,
                  sequenceId: sequence.id,
                  sequenceName: sequence.name,
                  stepId: firstStep.id,
                  stepName: firstStep.name,
                  stepType: firstStep.type,
                },
              }
            })
            taskCreated = true
            break

          case 'task':
            await prisma.task.create({
              data: {
                title: firstStep.name || `Task for ${prospect.name}`,
                description: firstStep.taskNotes || `Complete task for ${prospect.name} from sequence "${sequence.name}"`,
                type: 'follow_up',
                status: 'to_do',
                priority: 'medium',
                dueDate: now,
                userId,
                contact: {
                  prospectId: prospect.id,
                  name: prospect.name,
                  email: prospect.email,
                  company: prospect.company,
                  title: prospect.title,
                  sequenceId: sequence.id,
                  sequenceName: sequence.name,
                  stepId: firstStep.id,
                  stepName: firstStep.name,
                  stepType: firstStep.type,
                },
              }
            })
            taskCreated = true
            break
        }
      } catch (error) {
        console.error(`Extension: error creating immediate task for prospect ${prospect.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      prospectSequence,
      prospectId,
      prospectCreated,
      sequenceName: sequence.name,
      taskCreated,
    })
  } catch (error: any) {
    console.error("Extension add-to-sequence error:", error)
    return NextResponse.json(
      { error: "Failed to add prospect to sequence" },
      { status: 500 }
    )
  }
})
