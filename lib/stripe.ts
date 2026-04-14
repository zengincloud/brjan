import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
})

// Map tier names to Stripe Price IDs (set these in your .env)
export const STRIPE_PRICES = {
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID!,
    yearly:  process.env.STRIPE_STARTER_YEARLY_PRICE_ID!,
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    yearly:  process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
  },
  pro_max: {
    monthly: process.env.STRIPE_PRO_MAX_MONTHLY_PRICE_ID!,
    yearly:  process.env.STRIPE_PRO_MAX_YEARLY_PRICE_ID!,
  },
} as const

// Map Stripe Price IDs back to tiers (used in webhooks)
export function getTierFromPriceId(priceId: string): string | null {
  for (const [tier, prices] of Object.entries(STRIPE_PRICES)) {
    if (prices.monthly === priceId || prices.yearly === priceId) {
      return tier
    }
  }
  return null
}
