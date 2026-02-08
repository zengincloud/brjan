import { prisma } from "@/lib/prisma"
import { TIER_CONFIG, type TierKey } from "@/lib/tier-config"

type CreditCheckResult =
  | { allowed: true; creditsRemaining: number }
  | { allowed: false; creditsRemaining: number; error: string }

/**
 * Check if user can spend `count` credits. Does NOT deduct.
 * Performs lazy monthly reset if needed.
 */
export async function checkCredits(userId: string, count: number = 1): Promise<CreditCheckResult> {
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
 * Deduct `count` credits from user. Call AFTER successful creation.
 * Returns updated remaining credits.
 */
export async function deductCredits(userId: string, count: number = 1): Promise<number> {
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
