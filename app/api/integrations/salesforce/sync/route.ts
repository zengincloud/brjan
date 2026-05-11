import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { getValidAccessToken } from "@/lib/salesforce/oauth"
import { upsertContact, upsertAccount, logCallTask, logEmailTask } from "@/lib/salesforce/client"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Run an array of async tasks with max N concurrent at a time
async function runConcurrent<T>(
  tasks: (() => Promise<T>)[],
  concurrency = 10
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = []
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency).map((fn) => fn())
    const settled = await Promise.allSettled(batch)
    results.push(...settled)
  }
  return results
}

const PER_RUN_LIMIT = 30

// POST /api/integrations/salesforce/sync
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  const sfCreds = await getValidAccessToken(userId)
  if (!sfCreds) {
    return NextResponse.json({ error: "Salesforce not connected" }, { status: 400 })
  }

  const results = {
    accounts: { synced: 0, failed: 0, errors: [] as string[] },
    prospects: { synced: 0, failed: 0, errors: [] as string[] },
    calls: { synced: 0, skipped: 0, failed: 0, errors: [] as string[] },
    emails: { synced: 0, skipped: 0, failed: 0, errors: [] as string[] },
  }

  // 1. Upsert Accounts — only ones not yet synced (first 50 per run)
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true, name: true, industry: true, website: true, employees: true, location: true, insights: true },
    take: PER_RUN_LIMIT,
  })

  const accountIdMap = new Map<string, string>()

  const accountTasks = accounts.map((account) => async () => {
    const existingSfAccountId = (account.insights as any)?.salesforceAccountId
    if (existingSfAccountId) {
      accountIdMap.set(account.id, existingSfAccountId)
      return
    }
    const sfData = await upsertAccount(sfCreds.token, sfCreds.instanceUrl, {
      name: account.name,
      industry: account.industry,
      website: account.website,
      employees: account.employees,
      location: account.location,
    })
    accountIdMap.set(account.id, sfData.accountId)
    await prisma.account.update({
      where: { id: account.id },
      data: {
        insights: {
          ...(typeof account.insights === "object" && account.insights !== null ? account.insights : {}),
          salesforceAccountId: sfData.accountId,
        } as any,
      },
    })
  })

  const accountResults = await runConcurrent(accountTasks)
  accountResults.forEach((r) => {
    if (r.status === "fulfilled") results.accounts.synced++
    else { results.accounts.failed++; results.accounts.errors.push((r as any).reason?.message) }
  })

  // 2. Upsert Prospects as Leads — only ones not yet synced (up to 200 per run)
  const prospects = await prisma.prospect.findMany({
    where: { userId },
    select: { id: true, name: true, email: true, phone: true, title: true, company: true, location: true, accountId: true, wizaData: true },
    take: PER_RUN_LIMIT,
  })

  const contactIdMap = new Map<string, string>()

  const prospectTasks = prospects.map((prospect) => async () => {
    const existingSfLeadId = (prospect.wizaData as any)?.salesforceContactId
    if (existingSfLeadId) {
      contactIdMap.set(prospect.id, existingSfLeadId)
      return
    }
    const sfAccountId = prospect.accountId ? accountIdMap.get(prospect.accountId) : null
    const sfData = await upsertContact(sfCreds.token, sfCreds.instanceUrl, {
      name: prospect.name,
      email: prospect.email,
      phone: prospect.phone,
      title: prospect.title,
      location: prospect.location,
      sfAccountId,
    })
    contactIdMap.set(prospect.id, sfData.contactId)
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: {
        wizaData: {
          ...(typeof prospect.wizaData === "object" && prospect.wizaData !== null ? prospect.wizaData : {}),
          salesforceContactId: sfData.contactId,
        } as any,
      },
    })
  })

  const prospectResults = await runConcurrent(prospectTasks)
  prospectResults.forEach((r) => {
    if (r.status === "fulfilled") results.prospects.synced++
    else { results.prospects.failed++; results.prospects.errors.push((r as any).reason?.message) }
  })

  // 3. Sync calls not yet logged
  const calls = await prisma.call.findMany({
    where: { userId, outcome: { not: null }, prospectId: { not: null } },
    select: { id: true, prospectId: true, accountId: true, outcome: true, notes: true, duration: true, startedAt: true, transcription: true, metadata: true },
    take: PER_RUN_LIMIT,
    orderBy: { createdAt: "desc" },
  })

  const callTasks = calls.map((call) => async () => {
    if ((call.metadata as any)?.salesforceTaskId) {
      results.calls.skipped++
      return
    }
    const contactId = call.prospectId ? contactIdMap.get(call.prospectId) : null
    if (!contactId) { results.calls.skipped++; return }

    const sfAccountId = call.accountId ? accountIdMap.get(call.accountId) : null
    const taskResult = await logCallTask(sfCreds.token, sfCreds.instanceUrl, {
      contactId,
      accountId: sfAccountId,
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
  })

  const callResults = await runConcurrent(callTasks)
  callResults.forEach((r) => {
    if (r.status === "fulfilled") results.calls.synced++
    else { results.calls.failed++; results.calls.errors.push((r as any).reason?.message) }
  })

  // 4. Sync emails not yet logged
  const emails = await prisma.email.findMany({
    where: { userId, status: "sent", prospectId: { not: null } },
    select: { id: true, prospectId: true, accountId: true, subject: true, bodyText: true, sentAt: true, metadata: true },
    take: PER_RUN_LIMIT,
    orderBy: { sentAt: "desc" },
  })

  const emailTasks = emails.map((email) => async () => {
    if ((email.metadata as any)?.salesforceTaskId) {
      results.emails.skipped++
      return
    }
    const contactId = email.prospectId ? contactIdMap.get(email.prospectId) : null
    if (!contactId) { results.emails.skipped++; return }

    const sfAccountId = email.accountId ? accountIdMap.get(email.accountId) : null
    const taskResult = await logEmailTask(sfCreds.token, sfCreds.instanceUrl, {
      contactId,
      accountId: sfAccountId,
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
  })

  const emailResults = await runConcurrent(emailTasks)
  emailResults.forEach((r) => {
    if (r.status === "fulfilled") results.emails.synced++
    else { results.emails.failed++; results.emails.errors.push((r as any).reason?.message) }
  })

  return NextResponse.json({ success: true, results })
})
