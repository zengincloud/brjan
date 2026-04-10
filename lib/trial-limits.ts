export const TRIAL_LIMITS = {
  prospects: 10,
  calls: 25,
  recordings: 1,
  emailsAllowed: false,
  sequences: 1,
  sequenceSteps: 5,
} as const

export type TrialResource = keyof typeof TRIAL_LIMITS
