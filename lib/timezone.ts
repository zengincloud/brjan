/**
 * Timezone utilities for mapping locations to IANA timezones.
 * Used at ingestion time (bulk upload, create, enrich) and as fallback in the dialer UI.
 * Inputs may originate from external APIs (Wiza), so exported functions
 * validate type at the boundary rather than assuming callers pass strings.
 */

// Map common city/state/country strings to IANA timezone
export function getTimezoneFromLocation(location: string | null | undefined): string | null {
  if (typeof location !== "string" || !location) return null
  const loc = location.toLowerCase().replace(/\./g, "")
  if (/new york|nyc|manhattan|brooklyn|new jersey|new brunswick|newark|nj\b|ny\b|connecticut|ct\b|boston|massachusetts|ma\b|philadelphia|pennsylvania|pa\b|washington.*dc|dc\b|virginia|va\b|maryland|md\b|maine|me\b|vermont|vt\b|new hampshire|nh\b|rhode island|ri\b|delaware|de\b|east coast/i.test(loc)) return "America/New_York"
  if (/chicago|illinois|il\b|wisconsin|wi\b|minnesota|mn\b|iowa|ia\b|missouri|mo\b|indiana|in\b|michigan|mi\b|ohio|oh\b|central time|midwest|nashville|tennessee|tn\b|memphis|milwaukee|detroit|cleveland|columbus|kansas city|omaha|nebraska|ne\b|north dakota|nd\b|south dakota|sd\b/i.test(loc)) return "America/Chicago"
  if (/denver|colorado|co\b|utah|ut\b|arizona|az\b|phoenix|mountain time|albuquerque|new mexico|nm\b|montana|mt\b|wyoming|wy\b|idaho|id\b|boise|salt lake/i.test(loc)) return "America/Denver"
  if (/los angeles|san francisco|california|ca\b|seattle|washington state|wa\b|portland|oregon|or\b|pacific time|west coast|san diego|san jose|silicon valley|las vegas|nevada|nv\b/i.test(loc)) return "America/Los_Angeles"
  if (/hawaii|hi\b|honolulu/i.test(loc)) return "Pacific/Honolulu"
  if (/alaska|ak\b|anchorage/i.test(loc)) return "America/Anchorage"
  if (/texas|tx\b|dallas|houston|austin|san antonio/i.test(loc)) return "America/Chicago"
  if (/atlanta|georgia|ga\b|florida|fl\b|miami|tampa|orlando|carolina|nc\b|sc\b|charlotte|raleigh|jacksonville/i.test(loc)) return "America/New_York"
  if (/toronto|ontario|ottawa|montreal|quebec/i.test(loc)) return "America/Toronto"
  if (/vancouver|british columbia/i.test(loc)) return "America/Vancouver"
  if (/calgary|edmonton|alberta/i.test(loc)) return "America/Edmonton"
  if (/london|united kingdom|uk\b|england|britain/i.test(loc)) return "Europe/London"
  if (/paris|france/i.test(loc)) return "Europe/Paris"
  if (/berlin|germany|munich|frankfurt/i.test(loc)) return "Europe/Berlin"
  if (/amsterdam|netherlands|dutch/i.test(loc)) return "Europe/Amsterdam"
  if (/dublin|ireland/i.test(loc)) return "Europe/Dublin"
  if (/stockholm|sweden/i.test(loc)) return "Europe/Stockholm"
  if (/madrid|spain|barcelona/i.test(loc)) return "Europe/Madrid"
  if (/rome|italy|milan/i.test(loc)) return "Europe/Rome"
  if (/sydney|melbourne|australia|brisbane/i.test(loc)) return "Australia/Sydney"
  if (/tokyo|japan/i.test(loc)) return "Asia/Tokyo"
  if (/singapore/i.test(loc)) return "Asia/Singapore"
  if (/hong kong/i.test(loc)) return "Asia/Hong_Kong"
  if (/mumbai|delhi|india|bangalore|hyderabad/i.test(loc)) return "Asia/Kolkata"
  if (/dubai|uae|abu dhabi/i.test(loc)) return "Asia/Dubai"
  if (/tel aviv|israel|jerusalem/i.test(loc)) return "Asia/Jerusalem"
  return null
}

// Map common abbreviations (EST, CST, etc.) to IANA timezones for CSV imports
const ABBR_TO_IANA: Record<string, string> = {
  est: "America/New_York",
  edt: "America/New_York",
  et: "America/New_York",
  cst: "America/Chicago",
  cdt: "America/Chicago",
  ct: "America/Chicago",
  mst: "America/Denver",
  mdt: "America/Denver",
  mt: "America/Denver",
  pst: "America/Los_Angeles",
  pdt: "America/Los_Angeles",
  pt: "America/Los_Angeles",
  hst: "Pacific/Honolulu",
  akst: "America/Anchorage",
  gmt: "Europe/London",
  utc: "Europe/London",
  bst: "Europe/London",
  cet: "Europe/Berlin",
  ist: "Asia/Kolkata",
  jst: "Asia/Tokyo",
  aest: "Australia/Sydney",
  sgt: "Asia/Singapore",
}

/**
 * Normalize a timezone value from user input (CSV column, form field, etc.)
 * Accepts IANA timezone strings or common abbreviations.
 * Returns a valid IANA timezone string or null.
 */
export function normalizeTimezone(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // Check if it's already a valid IANA timezone
  try {
    Intl.DateTimeFormat("en-US", { timeZone: trimmed })
    return trimmed
  } catch {
    // Not a valid IANA timezone, try abbreviation lookup
  }

  const lower = trimmed.toLowerCase()
  return ABBR_TO_IANA[lower] || null
}

/**
 * Get the local time for a given IANA timezone string.
 * Falls back to deriving timezone from location if no timezone is stored.
 */
export function getLocalTime(timezone: string | null | undefined, location?: string | null): string | null {
  const tz = timezone || getTimezoneFromLocation(location)
  if (!tz) return null
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date())
  } catch {
    return null
  }
}

/**
 * Get the timezone abbreviation (e.g. "EST", "PST") for a given IANA timezone string.
 * Falls back to deriving timezone from location if no timezone is stored.
 */
export function getTimezoneAbbr(timezone: string | null | undefined, location?: string | null): string | null {
  const tz = timezone || getTimezoneFromLocation(location)
  if (!tz) return null
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(new Date())
    return parts.find(p => p.type === "timeZoneName")?.value || null
  } catch {
    return null
  }
}
