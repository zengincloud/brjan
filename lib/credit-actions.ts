/**
 * Single source of truth for everything that costs credits.
 * Add a new billable action here and reference its key from lib/credits.ts
 * call sites — the cost, label, and dashboard copy all flow from this table.
 */
export const CREDIT_ACTIONS = {
  prospect_created: {
    label: "Prospects added",
    unit: "prospect",
    cost: 1,
    description: "Every new prospect saved to your CRM — added manually, via bulk upload, or from the browser extension.",
  },
  account_created: {
    label: "Accounts added",
    unit: "account",
    cost: 1,
    description: "Every new company added to your CRM — added manually or via bulk upload.",
  },
  mock_call: {
    label: "AI Roleplay sessions",
    unit: "session",
    cost: 2,
    description: "Each AI-powered mock sales call you practice.",
  },
  additional_phone_number: {
    label: "Additional phone numbers",
    unit: "number",
    cost: 50,
    description: "Each Twilio number you provision beyond your first number, which is free.",
  },
} as const

export type CreditActionKey = keyof typeof CREDIT_ACTIONS

export function getCreditActionCost(action: CreditActionKey): number {
  return CREDIT_ACTIONS[action].cost
}
