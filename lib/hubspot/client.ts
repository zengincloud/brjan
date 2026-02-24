const HUBSPOT_API_BASE = "https://api.hubapi.com"

function getAccessToken(): string | null {
  return process.env.HUBSPOT_ACCESS_TOKEN || null
}

async function hubspotFetch(path: string, options: RequestInit = {}) {
  const token = getAccessToken()
  if (!token) throw new Error("HubSpot access token not configured")

  const res = await fetch(`${HUBSPOT_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
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

// Check if the HubSpot connection is valid
export async function checkConnection(): Promise<{ connected: boolean; portalId?: number; error?: string }> {
  try {
    const token = getAccessToken()
    if (!token) return { connected: false, error: "No access token configured" }

    const data = await hubspotFetch("/account-info/v3/details")
    return { connected: true, portalId: data.portalId }
  } catch (err: any) {
    return { connected: false, error: err.message }
  }
}

// Search for an existing HubSpot contact by email
export async function findContactByEmail(email: string): Promise<string | null> {
  try {
    const data = await hubspotFetch("/crm/v3/objects/contacts/search", {
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
export async function pushContact(prospect: {
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
    const existingId = await findContactByEmail(prospect.email)
    if (existingId) {
      await hubspotFetch(`/crm/v3/objects/contacts/${existingId}`, {
        method: "PATCH",
        body: JSON.stringify({ properties }),
      })
      return { hubspotContactId: existingId, created: false }
    }
  }

  // Create new contact
  const data = await hubspotFetch("/crm/v3/objects/contacts", {
    method: "POST",
    body: JSON.stringify({ properties }),
  })

  return { hubspotContactId: data.id, created: true }
}

// Log a call activity to HubSpot and associate it with a contact
export async function logCall(params: {
  hubspotContactId: string
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
  }

  const properties: Record<string, string> = {
    hs_call_title: `Call - ${params.outcome.replace(/_/g, " ")}`,
    hs_call_body: params.notes || "",
    hs_call_status: "COMPLETED",
    hs_call_disposition: dispositionMap[params.outcome] || "CONNECTED",
    hs_timestamp: params.timestamp || new Date().toISOString(),
  }

  if (params.durationMs) {
    properties.hs_call_duration = String(params.durationMs)
  }

  const data = await hubspotFetch("/crm/v3/objects/calls", {
    method: "POST",
    body: JSON.stringify({ properties }),
  })

  // Associate call with contact
  await hubspotFetch(
    `/crm/v3/objects/calls/${data.id}/associations/contacts/${params.hubspotContactId}/call_to_contact`,
    { method: "PUT" }
  )

  return { engagementId: data.id }
}

export function isConfigured(): boolean {
  return !!getAccessToken()
}
