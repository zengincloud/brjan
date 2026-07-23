import { prisma } from "@/lib/prisma"
import { TIER_CONFIG, type TierKey } from "@/lib/tier-config"
import { CREDIT_ACTIONS, type CreditActionKey } from "@/lib/credit-actions"

type CreditCheckResult =
  | { allowed: true; creditsRemaining: number }
  | { allowed: false; creditsRemaining: number; error: string }

/**
 * Check if user can afford the given action. Does NOT deduct.
 * Performs lazy monthly reset if needed.
 */
export async function checkCredits(userId: string, action: CreditActionKey): Promise<CreditCheckResult> {
  const count = CREDIT_ACTIONS[action].cost
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  // Super admins have unlimited credits
  if (user.role === "super_admin") {
    return { allowed: true, creditsRemaining: Infinity }
  }

  const tier = user.tier as TierKey
  const maxCredits = TIER_CONFIG[tier].credits

  // Lazy reset: if paid tier and past reset date, reset credits
  let creditsUsed = user.creditsUsed
  if (tier !== "trial" && user.creditsResetAt && new Date() > user.creditsResetAt) {
    const nextReset = new Date()
    nextReset.setDate(nextReset.getDate() + 30)
    await prisma.user.update({
      where: { id: userId },
      data: { creditsUsed: 0, creditsResetAt: nextReset },
    })
    creditsUsed = 0
  }

  const remaining = maxCredits - creditsUsed

  if (remaining < count) {
    return {
      allowed: false,
      creditsRemaining: remaining,
      error: remaining <= 0
        ? "You've used all your credits. Upgrade your plan for more."
        : `Not enough credits. You have ${remaining} remaining but need ${count}. Upgrade your plan for more.`,
    }
  }

  return { allowed: true, creditsRemaining: remaining }
}

/**
 * Deduct credits for the given action. Call AFTER successful creation.
 * Returns updated remaining credits.
 */
export async function deductCredits(userId: string, action: CreditActionKey): Promise<number> {
  const count = CREDIT_ACTIONS[action].cost
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  if (user.role === "super_admin") return Infinity

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { creditsUsed: { increment: count } },
  })

  const tier = updated.tier as TierKey
  return TIER_CONFIG[tier].credits - updated.creditsUsed
}

/**
 * Get credit status for display in UI.
 */
export async function getCreditStatus(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  if (user.role === "super_admin") {
    return {
      tier: "super_admin" as const,
      label: "Super Admin",
      creditsUsed: 0,
      creditsTotal: -1, // -1 signals unlimited
      creditsRemaining: -1,
      resetsAt: null,
    }
  }

  const tier = user.tier as TierKey
  const total = TIER_CONFIG[tier].credits

  // Lazy reset
  let creditsUsed = user.creditsUsed
  if (tier !== "trial" && user.creditsResetAt && new Date() > user.creditsResetAt) {
    const nextReset = new Date()
    nextReset.setDate(nextReset.getDate() + 30)
    await prisma.user.update({
      where: { id: userId },
      data: { creditsUsed: 0, creditsResetAt: nextReset },
    })
    creditsUsed = 0
  }

  return {
    tier: user.tier,
    label: TIER_CONFIG[tier].label,
    creditsUsed,
    creditsTotal: total,
    creditsRemaining: total - creditsUsed,
    resetsAt: user.creditsResetAt,
  }
}

export interface CreditBreakdownItem {
  action: CreditActionKey
  label: string
  description: string
  cost: number
  count: number
  totalCredits: number
}

export interface CreditActivityEntry {
  id: string
  action: CreditActionKey
  label: string
  detail: string
  credits: number
  createdAt: Date
}

/**
 * Reconstruct "what did I spend credits on" from the records those actions
 * created — there's no separate transaction ledger, but every billable
 * action (see lib/credit-actions.ts) has a 1:1 corresponding row with a
 * createdAt, so we can derive an exact breakdown without persisting one.
 */
export async function getCreditSpendBreakdown(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const tier = user.tier as TierKey

  // Trial credits never reset, so the "period" is since signup. Paid tiers
  // reset every 30 days; creditsResetAt holds the *next* reset date.
  const periodStart = tier !== "trial" && user.creditsResetAt
    ? new Date(user.creditsResetAt.getTime() - 30 * 24 * 60 * 60 * 1000)
    : user.createdAt
  const periodLabel = tier === "trial" ? "since your trial started" : "this billing period"

  const [prospects, accounts, mockCalls, phoneNumbers] = await Promise.all([
    prisma.prospect.findMany({
      where: { userId, createdAt: { gte: periodStart } },
      select: { id: true, name: true, company: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.account.findMany({
      where: { userId, createdAt: { gte: periodStart } },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mockCall.findMany({
      where: { userId, createdAt: { gte: periodStart } },
      select: { id: true, character: true, difficulty: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    // Ordered all-time (not just this period) because the very first number
    // ever provisioned is free — we need full history to know which rows
    // in the current period are actually "extra" (billable) numbers.
    prisma.phoneNumber.findMany({
      where: { userId },
      select: { id: true, friendlyName: true, number: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const billablePhoneNumbers = phoneNumbers
    .slice(1) // first number is always free
    .filter((p) => p.createdAt >= periodStart)

  const breakdown: CreditBreakdownItem[] = [
    {
      action: "prospect_created",
      label: CREDIT_ACTIONS.prospect_created.label,
      description: CREDIT_ACTIONS.prospect_created.description,
      cost: CREDIT_ACTIONS.prospect_created.cost,
      count: prospects.length,
      totalCredits: prospects.length * CREDIT_ACTIONS.prospect_created.cost,
    },
    {
      action: "account_created",
      label: CREDIT_ACTIONS.account_created.label,
      description: CREDIT_ACTIONS.account_created.description,
      cost: CREDIT_ACTIONS.account_created.cost,
      count: accounts.length,
      totalCredits: accounts.length * CREDIT_ACTIONS.account_created.cost,
    },
    {
      action: "mock_call",
      label: CREDIT_ACTIONS.mock_call.label,
      description: CREDIT_ACTIONS.mock_call.description,
      cost: CREDIT_ACTIONS.mock_call.cost,
      count: mockCalls.length,
      totalCredits: mockCalls.length * CREDIT_ACTIONS.mock_call.cost,
    },
    {
      action: "additional_phone_number",
      label: CREDIT_ACTIONS.additional_phone_number.label,
      description: CREDIT_ACTIONS.additional_phone_number.description,
      cost: CREDIT_ACTIONS.additional_phone_number.cost,
      count: billablePhoneNumbers.length,
      totalCredits: billablePhoneNumbers.length * CREDIT_ACTIONS.additional_phone_number.cost,
    },
  ]
  breakdown.sort((a, b) => b.totalCredits - a.totalCredits)

  const recentActivity: CreditActivityEntry[] = [
    ...prospects.map((p) => ({
      id: p.id,
      action: "prospect_created" as const,
      label: "Prospect added",
      detail: p.company ? `${p.name} · ${p.company}` : p.name,
      credits: CREDIT_ACTIONS.prospect_created.cost,
      createdAt: p.createdAt,
    })),
    ...accounts.map((a) => ({
      id: a.id,
      action: "account_created" as const,
      label: "Account added",
      detail: a.name,
      credits: CREDIT_ACTIONS.account_created.cost,
      createdAt: a.createdAt,
    })),
    ...mockCalls.map((m) => ({
      id: m.id,
      action: "mock_call" as const,
      label: "AI Roleplay session",
      detail: `${m.character.replace(/_/g, " ")} · ${m.difficulty}`,
      credits: CREDIT_ACTIONS.mock_call.cost,
      createdAt: m.createdAt,
    })),
    ...billablePhoneNumbers.map((n) => ({
      id: n.id,
      action: "additional_phone_number" as const,
      label: "Additional phone number",
      detail: n.friendlyName || n.number,
      credits: CREDIT_ACTIONS.additional_phone_number.cost,
      createdAt: n.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 50)

  const totalCreditsThisPeriod = breakdown.reduce((sum, item) => sum + item.totalCredits, 0)

  return { periodStart, periodLabel, breakdown, recentActivity, totalCreditsThisPeriod }
}
