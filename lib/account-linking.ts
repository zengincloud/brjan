import { prisma } from "@/lib/prisma"

// Common company suffixes to strip for fuzzy matching
const COMPANY_SUFFIXES = [
  "inc", "inc.", "incorporated",
  "llc", "l.l.c.", "l.l.c",
  "ltd", "ltd.", "limited",
  "corp", "corp.", "corporation",
  "co", "co.",
  "plc", "plc.",
  "gmbh",
  "ag",
  "sa", "s.a.",
  "pty", "pty.",
  "pvt", "pvt.",
  "llp", "l.l.p.",
  "lp", "l.p.",
  "the",
]

/**
 * Normalize a company name by stripping common suffixes and extra whitespace.
 * Used for fuzzy matching: "Google Inc." -> "google", "The Google Corporation" -> "google"
 */
export function normalizeCompanyName(name: string): string {
  let normalized = name.toLowerCase().trim()
  // Remove trailing punctuation
  normalized = normalized.replace(/[.,]+$/, "").trim()
  // Strip known suffixes from the end (repeatedly, in case of "Inc. Corp.")
  let changed = true
  while (changed) {
    changed = false
    for (const suffix of COMPANY_SUFFIXES) {
      const pattern = new RegExp(`\\b${suffix.replace(/\./g, "\\.")}$`, "i")
      const before = normalized
      normalized = normalized.replace(pattern, "").trim().replace(/[.,]+$/, "").trim()
      if (normalized !== before) changed = true
    }
  }
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, " ").trim()
  return normalized
}

/**
 * Find a matching account for a company name using fuzzy matching.
 * Returns the account if found, null otherwise.
 */
export async function findMatchingAccount(userId: string, companyName: string) {
  if (!companyName?.trim()) return null

  // First try exact case-insensitive match
  const exactMatch = await prisma.account.findFirst({
    where: {
      userId,
      name: { equals: companyName, mode: "insensitive" },
    },
  })
  if (exactMatch) return exactMatch

  // If no exact match, try fuzzy matching by normalizing names
  const normalizedInput = normalizeCompanyName(companyName)
  if (!normalizedInput) return null

  // Get all accounts for the user and compare normalized names
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true, name: true, industry: true, location: true, website: true, employees: true, linkedin: true },
  })

  for (const account of accounts) {
    if (normalizeCompanyName(account.name) === normalizedInput) {
      return account
    }
  }

  return null
}

/**
 * Optional enrichment data to populate on the account when creating or backfilling.
 */
export type AccountEnrichment = {
  industry?: string | null
  location?: string | null
  website?: string | null
  employees?: number | string | null
  linkedin?: string | null
}

/**
 * Find or create an account for a company name.
 * If a matching account exists (exact or fuzzy), link to it and backfill empty fields.
 * If not, create a new account with enrichment data.
 * Returns the account ID.
 */
export async function findOrCreateAccount(
  userId: string,
  companyName: string,
  enrichment?: AccountEnrichment
): Promise<string | null> {
  if (!companyName?.trim()) return null

  // Try to find existing account
  const existing = await findMatchingAccount(userId, companyName)
  if (existing) {
    // Backfill empty fields on the existing account
    if (enrichment) {
      const updates: Record<string, any> = {}
      if (enrichment.industry && !existing.industry) updates.industry = enrichment.industry
      if (enrichment.location && !existing.location) updates.location = enrichment.location
      if (enrichment.website && !existing.website) updates.website = enrichment.website
      if (enrichment.linkedin && !existing.linkedin) updates.linkedin = enrichment.linkedin
      if (enrichment.employees && !existing.employees) {
        const parsed = typeof enrichment.employees === "number" ? enrichment.employees : parseInt(String(enrichment.employees), 10)
        if (!isNaN(parsed)) updates.employees = parsed
      }
      if (Object.keys(updates).length > 0) {
        await prisma.account.update({ where: { id: existing.id }, data: updates }).catch(() => {})
      }
    }
    return existing.id
  }

  // Build create data with enrichment
  const createData: Record<string, any> = {
    name: companyName.trim(),
    userId,
  }
  if (enrichment?.industry) createData.industry = enrichment.industry
  if (enrichment?.location) createData.location = enrichment.location
  if (enrichment?.website) createData.website = enrichment.website
  if (enrichment?.linkedin) createData.linkedin = enrichment.linkedin
  if (enrichment?.employees) {
    const parsed = typeof enrichment.employees === "number" ? enrichment.employees : parseInt(String(enrichment.employees), 10)
    if (!isNaN(parsed)) createData.employees = parsed
  }

  // Create a new account
  try {
    const account = await prisma.account.create({ data: createData })
    return account.id
  } catch (error: any) {
    // Handle race condition where account was created between our check and create
    if (error.code === "P2002") {
      const existing = await prisma.account.findFirst({
        where: { userId, name: { equals: companyName.trim(), mode: "insensitive" } },
      })
      return existing?.id || null
    }
    console.error("Error creating account:", error)
    return null
  }
}
