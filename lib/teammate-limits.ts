import { prisma } from "@/lib/prisma"
import { getMaxOrgMembers, type TierKey } from "@/lib/tier-config"

/**
 * Check if an org can accept more members.
 * Looks at the org OWNER's tier to determine the limit.
 */
export async function checkTeammateLimit(organizationId: string): Promise<{
  allowed: boolean
  currentCount: number
  maxCount: number
  error?: string
}> {
  // Find the org owner
  const owner = await prisma.user.findFirst({
    where: { organizationId, role: "owner" },
  })

  // If no owner, check for super_admin in the org
  if (!owner) {
    const superAdmin = await prisma.user.findFirst({
      where: { organizationId, role: "super_admin" },
    })
    if (superAdmin) return { allowed: true, currentCount: 0, maxCount: Infinity }
    return { allowed: false, currentCount: 0, maxCount: 0, error: "Organization has no owner" }
  }

  // Super admin owners have unlimited
  if (owner.role === "super_admin") {
    return { allowed: true, currentCount: 0, maxCount: Infinity }
  }

  const tier = owner.tier as TierKey
  const maxMembers = getMaxOrgMembers(tier)

  // Count current members + pending invitations
  const [currentCount, pendingInvites] = await Promise.all([
    prisma.user.count({ where: { organizationId } }),
    prisma.invitation.count({ where: { organizationId, status: "pending" } }),
  ])

  const totalCommitted = currentCount + pendingInvites

  if (totalCommitted >= maxMembers) {
    return {
      allowed: false,
      currentCount: totalCommitted,
      maxCount: maxMembers,
      error: `Your ${owner.tier} plan allows up to ${maxMembers} team member${maxMembers === 1 ? "" : "s"}. Upgrade your plan to invite more teammates.`,
    }
  }

  return { allowed: true, currentCount: totalCommitted, maxCount: maxMembers }
}
