export type PhoneEntry = { type?: string; number: string; prettyNumber?: string }

export function digitsOnly(value: string | null | undefined): string {
  return (value || "").replace(/\D/g, "")
}

export function normalizePhones(raw: any): PhoneEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((p: any) =>
      typeof p === "string" ? { number: p } : { number: p?.number || "", type: p?.type, prettyNumber: p?.prettyNumber }
    )
    .filter((p: PhoneEntry) => p.number)
}

// Matches on the last 10 digits so country-code/formatting differences
// (e.g. "+14155551234" vs "4155551234") don't cause a false miss.
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = digitsOnly(a).slice(-10)
  const db = digitsOnly(b).slice(-10)
  return da.length === 10 && da === db
}
