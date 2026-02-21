import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withSuperAdmin } from "@/lib/auth/api-middleware"
import { normalizeCompanyName } from "@/lib/account-linking"

export const dynamic = "force-dynamic"

// POST /api/admin/link-prospects - One-time migration to link existing prospects to accounts
export const POST = withSuperAdmin(async (request: NextRequest, admin) => {
  try {
    // Get all prospects that have a company but no accountId
    const unlinkedProspects = await prisma.prospect.findMany({
      where: {
        company: { not: null },
        accountId: null,
      },
      select: { id: true, company: true, userId: true },
    })

    // Get all accounts grouped by userId
    const allAccounts = await prisma.account.findMany({
      select: { id: true, name: true, userId: true },
    })

    // Build lookup: userId -> [{ id, name, normalized }]
    const accountsByUser = new Map<string, { id: string; name: string; normalized: string }[]>()
    for (const account of allAccounts) {
      const list = accountsByUser.get(account.userId) || []
      list.push({ id: account.id, name: account.name, normalized: normalizeCompanyName(account.name) })
      accountsByUser.set(account.userId, list)
    }

    let linked = 0
    const batchSize = 100
    const updates: { id: string; accountId: string }[] = []

    for (const prospect of unlinkedProspects) {
      if (!prospect.company) continue

      const userAccounts = accountsByUser.get(prospect.userId) || []
      const normalizedCompany = normalizeCompanyName(prospect.company)

      // Try exact match first, then normalized match
      let matchedAccount = userAccounts.find(
        (a) => a.name.toLowerCase() === prospect.company!.toLowerCase()
      )
      if (!matchedAccount && normalizedCompany) {
        matchedAccount = userAccounts.find((a) => a.normalized === normalizedCompany)
      }

      if (matchedAccount) {
        updates.push({ id: prospect.id, accountId: matchedAccount.id })
      }
    }

    // Execute updates in batches
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      await Promise.all(
        batch.map((u) =>
          prisma.prospect.update({
            where: { id: u.id },
            data: { accountId: u.accountId },
          })
        )
      )
      linked += batch.length
    }

    return NextResponse.json({
      message: `Linked ${linked} prospects to accounts out of ${unlinkedProspects.length} unlinked prospects`,
      linked,
      total: unlinkedProspects.length,
    })
  } catch (error) {
    console.error("Error linking prospects:", error)
    return NextResponse.json({ error: "Failed to link prospects" }, { status: 500 })
  }
})
