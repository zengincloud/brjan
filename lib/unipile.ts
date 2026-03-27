/**
 * Unipile API client for LinkedIn automation.
 * Docs: https://developer.unipile.com
 */

const BASE_URL = process.env.UNIPILE_BASE_URL!
const API_KEY = process.env.UNIPILE_API_KEY!

async function unipileFetch(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}/api/v1${path}`
  console.log(`[Unipile] ${options.method || 'GET'} ${url}`, options.body ? `body: ${options.body}` : '')
  const res = await fetch(url, {
    ...options,
    headers: {
      'X-API-KEY': API_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[Unipile] ${options.method || 'GET'} ${path} → ${res.status}:`, body)
    throw new Error(`Unipile ${options.method || 'GET'} ${path} → ${res.status}: ${body}`)
  }

  return res.json()
}

// ─── Account Management ───────────────────────────────────────────────────────

/**
 * Generate a hosted auth URL so the user can connect their LinkedIn account.
 * Returns the URL to redirect the user to.
 */
export async function createHostedAuth(successRedirectUrl: string, failureRedirectUrl: string) {
  // Link expires in 1 hour
  const expiresOn = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '.000Z')

  const data = await unipileFetch('/hosted/accounts/link', {
    method: 'POST',
    body: JSON.stringify({
      type: 'create',
      providers: ['LINKEDIN'],
      success_redirect_url: successRedirectUrl,
      failure_redirect_url: failureRedirectUrl,
      api_url: BASE_URL,
      expiresOn,
    }),
  })
  return data as { url: string; id: string }
}

/**
 * Fetch a Unipile account by its ID.
 */
export async function getAccount(accountId: string) {
  return unipileFetch(`/accounts/${accountId}`)
}

/**
 * Delete a Unipile account (disconnect LinkedIn).
 */
export async function deleteAccount(accountId: string) {
  return unipileFetch(`/accounts/${accountId}`, { method: 'DELETE' })
}

// ─── Conversations / Chats ────────────────────────────────────────────────────

/**
 * List all chats for a connected account.
 */
export async function getChats(accountId: string, cursor?: string) {
  const params = new URLSearchParams({ account_id: accountId, limit: '50' })
  if (cursor) params.set('cursor', cursor)
  return unipileFetch(`/chats?${params}`)
}

/**
 * Get a single chat by ID.
 */
export async function getChat(chatId: string) {
  return unipileFetch(`/chats/${chatId}`)
}

/**
 * Get attendees (participants) for a chat.
 */
export async function getChatAttendees(chatId: string, accountId?: string) {
  const params = new URLSearchParams()
  if (accountId) params.set('account_id', accountId)
  return unipileFetch(`/chats/${chatId}/attendees?${params}`)
}

/**
 * List messages in a chat.
 */
export async function getChatMessages(chatId: string, accountId?: string, cursor?: string) {
  const params = new URLSearchParams({ limit: '50' })
  if (accountId) params.set('account_id', accountId)
  if (cursor) params.set('cursor', cursor)
  return unipileFetch(`/chats/${chatId}/messages?${params}`)
}

/**
 * Send a message in an existing chat.
 */
export async function sendMessage(chatId: string, text: string, accountId?: string) {
  return unipileFetch(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text, ...(accountId ? { account_id: accountId } : {}) }),
  })
}

/**
 * Start a new chat (send a message to someone you're connected with).
 */
export async function startChat(accountId: string, attendeeProviderId: string, text: string) {
  return unipileFetch('/chats', {
    method: 'POST',
    body: JSON.stringify({
      account_id: accountId,
      attendees_ids: [attendeeProviderId],
      text,
    }),
  })
}

// ─── Users / Invitations ──────────────────────────────────────────────────────

/**
 * Send a LinkedIn connection invitation.
 * providerId = the target's LinkedIn provider_id (from getUserProfile).
 */
export async function sendInvite(accountId: string, providerId: string, message?: string) {
  const body: any = {
    account_id: accountId,
    provider_id: providerId,
  }
  if (message) body.message = message
  return unipileFetch('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * Get a user's LinkedIn profile by their public identifier (slug from URL).
 * e.g. "john-smith-123" from linkedin.com/in/john-smith-123
 */
export async function getUserProfile(accountId: string, linkedinPublicId: string) {
  const params = new URLSearchParams({ account_id: accountId })
  return unipileFetch(`/users/${linkedinPublicId}?${params}`)
}

/**
 * List sent invitations.
 */
export async function getSentInvitations(accountId: string) {
  const params = new URLSearchParams({ account_id: accountId })
  return unipileFetch(`/users/invitations/sent?${params}`)
}

// ─── LinkedIn Search ──────────────────────────────────────────────────────────

export type LinkedInSearchFilters = {
  keyword?: string
  title?: string
  pastTitle?: string
  company?: string
  pastCompany?: string
  industry?: string
  location?: string
  companyHeadquarters?: string
  networkDegree?: ('F' | 'S' | 'O')[] // First, Second, Out-of-network
  seniorityLevel?: string[]
  companySize?: string[]
  companyType?: string
  function?: string
  yearsInCurrentCompany?: { min?: number; max?: number }
  yearsInCurrentPosition?: { min?: number; max?: number }
  yearsOfExperience?: { min?: number; max?: number }
  firstName?: string
  lastName?: string
  profileLanguage?: string
  school?: string
  changedJobs?: boolean
  postedOnLinkedin?: boolean
}

/**
 * Search LinkedIn for people.
 * Respects whatever LinkedIn subscription the connected account has.
 */
export async function searchLinkedIn(accountId: string, filters: LinkedInSearchFilters, page = 0) {
  // Build body per Unipile's schema:
  // - api: required, "classic" or "sales_navigator"
  // - company/industry/location/school: arrays of numeric LinkedIn IDs (need lookup)
  // - text-based searches go in advanced_keywords
  // - network_distance: array of numbers [1,2,3]
  const body: any = {
    api: 'classic',
    category: 'people',
    page,
  }

  // Free text keyword search
  if (filters.keyword) body.keywords = filters.keyword

  // Text-based filters go in advanced_keywords (no ID lookup needed)
  const advancedKeywords: any = {}
  if (filters.title) advancedKeywords.title = filters.title
  if (filters.company) advancedKeywords.company = filters.company
  if (filters.firstName) advancedKeywords.first_name = filters.firstName
  if (filters.lastName) advancedKeywords.last_name = filters.lastName
  if (filters.school) advancedKeywords.school = filters.school
  if (Object.keys(advancedKeywords).length > 0) body.advanced_keywords = advancedKeywords

  // Network distance: Unipile expects numbers [1, 2, 3]
  if (filters.networkDegree?.length) {
    const degreeMap: Record<string, number> = { 'F': 1, 'S': 2, 'O': 3 }
    body.network_distance = filters.networkDegree.map(d => degreeMap[d]).filter(Boolean)
  }

  // Company headcount: map letter codes to {min, max} objects per Unipile schema
  if (filters.companySize?.length) {
    const sizeMap: Record<string, { min: number; max?: number }> = {
      'A': { min: 1, max: 1 },
      'B': { min: 1, max: 10 },
      'C': { min: 11, max: 50 },
      'D': { min: 51, max: 200 },
      'E': { min: 201, max: 500 },
      'F': { min: 501, max: 1000 },
      'G': { min: 1001, max: 5000 },
      'H': { min: 5001, max: 10000 },
      'I': { min: 10001 },
    }
    body.headcount = filters.companySize.map(s => sizeMap[s]).filter(Boolean)
  }

  // Profile language: array of ISO 639-1 codes
  if (filters.profileLanguage) body.profile_language = [filters.profileLanguage]

  const params = new URLSearchParams({ account_id: accountId })
  return unipileFetch(`/linkedin/search?${params}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * Search LinkedIn using Sales Navigator API.
 * Requires the connected LinkedIn account to have a Sales Nav subscription.
 * Supports more filters than classic search.
 */
export async function searchLinkedInSalesNav(accountId: string, filters: LinkedInSearchFilters, page = 0) {
  const body: any = {
    api: 'sales_navigator',
    category: 'people',
    page,
  }

  if (filters.keyword) body.keywords = filters.keyword
  if (filters.title) body.title = { included: [filters.title] }
  if (filters.pastTitle) body.past_title = { included: [filters.pastTitle] }
  if (filters.company) body.company = { included: [filters.company] }
  if (filters.pastCompany) body.past_company = { included: [filters.pastCompany] }
  if (filters.industry) body.industry = { included: [filters.industry] }
  if (filters.location) body.location = filters.location
  if (filters.companyHeadquarters) body.company_headquarters = filters.companyHeadquarters
  if (filters.seniorityLevel?.length) body.seniority_level = filters.seniorityLevel
  if (filters.companySize?.length) body.company_size = filters.companySize
  if (filters.companyType) body.company_type = filters.companyType
  if (filters.function) body.function = filters.function
  if (filters.yearsInCurrentCompany) body.tenure = filters.yearsInCurrentCompany
  if (filters.yearsInCurrentPosition) body.years_in_position = filters.yearsInCurrentPosition
  if (filters.yearsOfExperience) body.years_of_experience = filters.yearsOfExperience
  if (filters.firstName) body.first_name = filters.firstName
  if (filters.lastName) body.last_name = filters.lastName
  if (filters.profileLanguage) body.profile_language = filters.profileLanguage
  if (filters.school) body.school = filters.school
  if (filters.changedJobs) body.changed_jobs = true
  if (filters.postedOnLinkedin) body.posted_on_linkedin = true
  if (filters.networkDegree?.length) body.network = filters.networkDegree

  const params = new URLSearchParams({ account_id: accountId })
  return unipileFetch(`/linkedin/search?${params}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the LinkedIn public identifier from a full LinkedIn URL.
 * e.g. "https://www.linkedin.com/in/john-smith-123/" → "john-smith-123"
 */
export function extractLinkedInId(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/)
  return match ? match[1] : null
}

/**
 * Normalize a LinkedIn URL to a consistent format for matching.
 */
export function normalizeLinkedInUrl(url: string): string {
  const id = extractLinkedInId(url)
  return id ? `https://www.linkedin.com/in/${id}` : url.toLowerCase().trim()
}
