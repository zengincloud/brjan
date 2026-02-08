export const TIER_CONFIG = {
  trial:   { credits: 25,   extraTeammates: 0,  label: "Trial" },
  starter: { credits: 100,  extraTeammates: 1,  label: "Starter" },
  pro:     { credits: 500,  extraTeammates: 5,  label: "Pro" },
  pro_max: { credits: 1000, extraTeammates: 10, label: "Pro Max" },
} as const

export type TierKey = keyof typeof TIER_CONFIG

/** Max org members = 1 (owner) + extraTeammates */
export function getMaxOrgMembers(tier: TierKey): number {
  return 1 + TIER_CONFIG[tier].extraTeammates
}

export function getTierCredits(tier: TierKey): number {
  return TIER_CONFIG[tier].credits
}

export function getTierLabel(tier: string): string {
  if (tier in TIER_CONFIG) return TIER_CONFIG[tier as TierKey].label
  return tier
}
