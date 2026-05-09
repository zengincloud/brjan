import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { getValidAccessToken } from "@/lib/salesforce/oauth"
import { upsertLead, logCallTask, logEmailTask } from "@/lib/salesforce/client"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
// Bulk syncs can take a while
export const maxDuration = 60

// POST /api/integrations/salesforce/sync
// Bulk syncs all prospects, calls, and emails to Salesforce
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  const sfCreds = await getValidAccessToken(userId)
  if (!sfCreds) {
    return NextResponse.json({ error: "Salesforce not connected" }, { status: 400 })
  }

  const results = {
    prospects: { synced: 0, failed: 0 },
    calls: { synced: 0, skipped: 0, failed: 0 },
    emails: { synced: 0, skipped: 0, failed: 0 },
  }

  // 1. Upsert all prospects as Leads
  const prospects = await prisma.prospect.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      title: true,
      company: true,
      location: true,
      wizaData: true,
    },
  })

  const leadIdMap = new Map<string, string>() // prospectId → sfLeadId

  for (const prospect of prospects) {
    try {
      const existingSfLeadId = (prospect.wizaData as any)?.salesforceLeadId
      const sfData = existingSfLeadId
        ? { leadId: existingSfLeadId, created: false }
        : await upsertLead(sfCreds.token, sfCreds.instanceUrl, {
            name: prospect.name,
            email: prospect.email,
            phone: prospect.phone,
            title: prospect.title,
            company: prospect.company,
            location: prospect.location,
          })

      leadIdMap.set(prospect.id, sfData.leadId)

      if (sfData.created) {
        await prisma.prospect.update({
          where: { id: prospect.id },
          data: {
            wizaData: {
              ...(typeof prospect.wizaData === "object" && prospect.wizaData !== null ? prospect.wizaData : {}),
              salesforceLeadId: sfData.leadId,
            } as any,
          },
        })
      }

      results.prospects.synced++
    } catch (err: any) {
      console.error(`SF sync: prospect ${prospect.id} failed — ${err?.message}`)
      results.prospects.failed++
    }
  }

  // 2. Sync calls that haven't been logged yet
  const calls = await prisma.call.findMany({
    where: {
      userId,
      outcome: { not: null },
      prospectId: { not: null },
    },
    select: {
      id: true,
      prospectId: true,
      outcome: true,
      notes: true,
      duration: true,
      startedAt: true,
      transcription: true,
      metadata: true,
    },
  })

  for (const call of calls) {
    try {
      if ((call.metadata as any)?.salesforceTaskId) {
        results.calls.skipped++
        continue
      }

      const leadId = call.prospectId ? leadIdMap.get(call.prospectId) : null
      if (!leadId) {
        results.calls.skipped++
        continue
      }

      const taskResult = await logCallTask(sfCreds.token, sfCreds.instanceUrl, {
        leadId,
        outcome: call.outcome!,
        notes: call.notes,
        duration: call.duration,
        startedAt: call.startedAt,
        transcription: call.transcription,
      })

      await prisma.call.update({
        where: { id: call.id },
        data: {
          metadata: {
            ...(typeof call.metadata === "object" && call.metadata !== null ? call.metadata : {}),
            salesforceTaskId: taskResult.taskId,
          } as any,
        },
      })

      results.calls.synced++
    } catch (err: any) {
      console.error(`SF sync: call ${call.id} failed — ${err?.message}`)
      results.calls.failed++
    }
  }

  // 3. Sync emails that haven't been logged yet
  const emails = await prisma.email.findMany({
    where: {
      userId,
      status: "sent",
      prospectId: { not: null },
    },
    select: {
      id: true,
      prospectId: true,
      subject: true,
      bodyText: true,
      sentAt: true,
      metadata: true,
    },
  })

  for (const email of emails) {
    try {
      if ((email.metadata as any)?.salesforceTaskId) {
        results.emails.skipped++
        continue
      }

      const leadId = email.prospectId ? leadIdMap.get(email.prospectId) : null
      if (!leadId) {
        results.emails.skipped++
        continue
      }

      const taskResult = await logEmailTask(sfCreds.token, sfCreds.instanceUrl, {
        leadId,
        subject: email.subject,
        bodyText: email.bodyText,
        sentAt: email.sentAt,
      })

      await prisma.email.update({
        where: { id: email.id },
        data: {
          metadata: {
            ...(typeof email.metadata === "object" && email.metadata !== null ? email.metadata : {}),
            salesforceTaskId: taskResult.taskId,
          } as any,
        },
      })

      results.emails.synced++
    } catch (err: any) {
      console.error(`SF sync: email ${email.id} failed — ${err?.message}`)
      results.emails.failed++
    }
  }

  return NextResponse.json({ success: true, results })
})
