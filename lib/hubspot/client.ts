import { getValidAccessToken } from "./oauth"

const HUBSPOT_API_BASE = "https://api.hubapi.com"

async function hubspotFetch(accessToken: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${HUBSPOT_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => "")
    throw new Error(`HubSpot API error ${res.status}: ${errBody}`)
  }

  return res.json()
}

// Check if the HubSpot connection is valid for a user
export async function checkConnection(userId: string): Promise<{ connected: boolean; portalId?: number; error?: string }> {
  try {
    const token = await getValidAccessToken(userId)
    if (!token) return { connected: false, error: "HubSpot not connected" }

    const data = await hubspotFetch(token, "/account-info/v3/details")
    return { connected: true, portalId: data.portalId }
  } catch (err: any) {
    return { connected: false, error: err.message }
  }
}

// Search for an existing HubSpot contact by email
export async function findContactByEmail(accessToken: string, email: string): Promise<string | null> {
  try {
    const data = await hubspotFetch(accessToken, "/crm/v3/objects/contacts/search", {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [{
          filters: [{ propertyName: "email", operator: "EQ", value: email }],
        }],
        limit: 1,
      }),
    })
    return data.results?.[0]?.id || null
  } catch {
    return null
  }
}

// Create or update a HubSpot contact from a Boilerroom prospect
export async function pushContact(accessToken: string, prospect: {
  name: string
  email?: string | null
  phone?: string | null
  title?: string | null
  company?: string | null
  linkedin?: string | null
}): Promise<{ hubspotContactId: string; created: boolean }> {
  const [firstname, ...lastParts] = (prospect.name || "").split(" ")
  const lastname = lastParts.join(" ")

  const properties: Record<string, string> = {
    firstname: firstname || "",
    lastname: lastname || "",
  }
  if (prospect.email) properties.email = prospect.email
  if (prospect.phone) properties.phone = prospect.phone
  if (prospect.title) properties.jobtitle = prospect.title
  if (prospect.company) properties.company = prospect.company
  if (prospect.linkedin) properties.hs_linkedin_url = prospect.linkedin

  // Try to find existing contact by email first
  if (prospect.email) {
    const existingId = await findContactByEmail(accessToken, prospect.email)
    if (existingId) {
      await hubspotFetch(accessToken, `/crm/v3/objects/contacts/${existingId}`, {
        method: "PATCH",
        body: JSON.stringify({ properties }),
      })
      return { hubspotContactId: existingId, created: false }
    }
  }

  // Create new contact
  const data = await hubspotFetch(accessToken, "/crm/v3/objects/contacts", {
    method: "POST",
    body: JSON.stringify({ properties }),
  })

  return { hubspotContactId: data.id, created: true }
}

// Extract domain from a URL (e.g., "https://www.acme.com/about" -> "acme.com")
function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "")
    return hostname || null
  } catch {
    // If not a valid URL, try treating it as a bare domain
    const cleaned = url.replace(/^www\./, "").split("/")[0]
    return cleaned || null
  }
}

// Search for an existing HubSpot company by domain or name
async function findExistingCompany(accessToken: string, name: string, domain?: string | null): Promise<string | null> {
  // Try domain first (HubSpot's primary dedup key for companies)
  if (domain) {
    try {
      const data = await hubspotFetch(accessToken, "/crm/v3/objects/companies/search", {
        method: "POST",
        body: JSON.stringify({
          filterGroups: [{
            filters: [{ propertyName: "domain", operator: "EQ", value: domain }],
          }],
          limit: 1,
        }),
      })
      if (data.results?.[0]?.id) return data.results[0].id
    } catch {}
  }

  // Fall back to name search (try exact match first, then case-insensitive contains)
  try {
    // Exact match
    const data = await hubspotFetch(accessToken, "/crm/v3/objects/companies/search", {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [{ propertyName: "name", operator: "EQ", value: name }],
          },
          {
            filters: [{ propertyName: "name", operator: "EQ", value: name.trim() }],
          },
        ],
        limit: 1,
      }),
    })
    return data.results?.[0]?.id || null
  } catch {
    return null
  }
}

// Create or update a HubSpot company from a Boilerroom account
export async function pushCompany(accessToken: string, account: {
  name: string
  industry?: string | null
  location?: string | null
  website?: string | null
  employees?: number | null
  linkedin?: string | null
}): Promise<{ hubspotCompanyId: string; created: boolean }> {
  const domain = account.website ? extractDomain(account.website) : null

  const properties: Record<string, string> = {
    name: account.name,
  }
  if (domain) properties.domain = domain
  if (account.industry) properties.industry = account.industry
  if (account.location) properties.city = account.location
  if (account.website) properties.website = account.website
  if (account.employees) properties.numberofemployees = String(account.employees)
  if (account.linkedin) properties.linkedin_company_page = account.linkedin

  // Try to find existing company by domain first, then name
  const existingId = await findExistingCompany(accessToken, account.name, domain)
  if (existingId) {
    await hubspotFetch(accessToken, `/crm/v3/objects/companies/${existingId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    })
    return { hubspotCompanyId: existingId, created: false }
  }

  // Create new company
  const data = await hubspotFetch(accessToken, "/crm/v3/objects/companies", {
    method: "POST",
    body: JSON.stringify({ properties }),
  })

  return { hubspotCompanyId: data.id, created: true }
}

// Log a call activity to HubSpot using the Engagements API (no special call scopes needed)
export async function logCall(accessToken: string, params: {
  hubspotContactId: string
  hubspotCompanyId?: string | null
  outcome: string
  notes?: string | null
  durationMs?: number
  timestamp?: string
}): Promise<{ engagementId: string }> {
  // Map Boilerroom outcomes to HubSpot call dispositions
  const dispositionMap: Record<string, string> = {
    connected: "CONNECTED",
    connected_intro_booked: "CONNECTED",
    connected_referral: "CONNECTED",
    connected_not_interested: "CONNECTED",
    connected_info_gathered: "CONNECTED",
    voicemail: "LEFT_VOICEMAIL",
    no_answer: "NO_ANSWER",
    busy: "BUSY",
    failed: "FAILED",
    gatekeeper: "CONNECTED",
    callback: "CONNECTED",
  }

  const timestamp = params.timestamp
    ? new Date(params.timestamp).getTime()
    : Date.now()

  const data = await hubspotFetch(accessToken, "/engagements/v1/engagements", {
    method: "POST",
    body: JSON.stringify({
      engagement: {
        active: true,
        type: "CALL",
        timestamp,
      },
      associations: {
        contactIds: [Number(params.hubspotContactId)],
        companyIds: params.hubspotCompanyId ? [Number(params.hubspotCompanyId)] : [],
        dealIds: [],
      },
      metadata: {
        status: "COMPLETED",
        body: params.notes || "",
        disposition: dispositionMap[params.outcome] || "CONNECTED",
        durationMilliseconds: params.durationMs || 0,
        title: `Call - ${params.outcome.replace(/_/g, " ")}`,
      },
    }),
  })

  return { engagementId: String(data.engagement?.id || data.id) }
}

// Associate a contact with a company in HubSpot
export async function associateContactToCompany(
  accessToken: string,
  hubspotContactId: string,
  hubspotCompanyId: string
): Promise<void> {
  try {
    await hubspotFetch(
      accessToken,
      `/crm/v3/objects/contacts/${hubspotContactId}/associations/companies/${hubspotCompanyId}/contact_to_company`,
      { method: "PUT" }
    )
  } catch (err: any) {
    // Don't throw — association might already exist
    console.log(`HubSpot: association contact ${hubspotContactId} -> company ${hubspotCompanyId}: ${err?.message}`)
  }
}

// Check if a user has HubSpot connected
export async function isConfiguredForUser(userId: string): Promise<boolean> {
  const token = await getValidAccessToken(userId)
  return !!token
}
