import { getValidAccessToken } from "./oauth"

class SalesforceDuplicateError extends Error {
  existingId: string
  constructor(existingId: string) {
    super("DUPLICATES_DETECTED")
    this.existingId = existingId
  }
}

async function sfFetch(
  token: string,
  instanceUrl: string,
  path: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${instanceUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => "")
    // Extract existing record ID from duplicate detection error
    try {
      const parsed = JSON.parse(errBody)
      const first = Array.isArray(parsed) ? parsed[0] : parsed
      if (first?.errorCode === "DUPLICATES_DETECTED") {
        const existingId = first?.duplicateResult?.matchResults?.[0]?.matchRecords?.[0]?.record?.Id
        if (existingId) throw new SalesforceDuplicateError(existingId)
      }
    } catch (e) {
      if (e instanceof SalesforceDuplicateError) throw e
    }
    throw new Error(`Salesforce API error ${res.status}: ${errBody}`)
  }

  if (res.status === 204) return null
  return res.json()
}

// Returns the Salesforce user ID (15/18-char) for the connected token
export async function getSfUserId(token: string, instanceUrl: string): Promise<string> {
  const data = await sfFetch(token, instanceUrl, "/services/oauth2/userinfo")
  return data.user_id
}

// Find an existing Lead by email using SOQL
export async function findLeadByEmail(
  token: string,
  instanceUrl: string,
  email: string
): Promise<string | null> {
  try {
    const query = encodeURIComponent(
      `SELECT Id FROM Lead WHERE Email = '${email.replace(/'/g, "\\'")}' AND IsConverted = false LIMIT 1`
    )
    const data = await sfFetch(token, instanceUrl, `/services/data/v59.0/query?q=${query}`)
    return data?.records?.[0]?.Id || null
  } catch {
    return null
  }
}

// Create or update a Salesforce Lead from a Boilerroom prospect
export async function upsertLead(
  token: string,
  instanceUrl: string,
  prospect: {
    name: string
    email?: string | null
    phone?: string | null
    title?: string | null
    company?: string | null
    linkedin?: string | null
    location?: string | null
  }
): Promise<{ leadId: string; created: boolean }> {
  const nameParts = (prospect.name || "").trim().split(" ")
  const firstName = nameParts[0] || ""
  const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "Unknown"

  const fields: Record<string, string> = {
    FirstName: firstName,
    LastName: lastName,
    Company: prospect.company || "Unknown",
  }
  if (prospect.email) fields.Email = prospect.email
  if (prospect.phone) fields.Phone = prospect.phone
  if (prospect.title) fields.Title = prospect.title
  // LinkedIn_Profile__c is a custom field — omit if not in your org
  if (prospect.location) fields.City = prospect.location.split(",")[0]?.trim() || ""

  // Try to find existing Lead by email
  if (prospect.email) {
    const existingId = await findLeadByEmail(token, instanceUrl, prospect.email)
    if (existingId) {
      await sfFetch(token, instanceUrl, `/services/data/v59.0/sobjects/Lead/${existingId}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
      })
      return { leadId: existingId, created: false }
    }
  }

  try {
    const data = await sfFetch(token, instanceUrl, `/services/data/v59.0/sobjects/Lead`, {
      method: "POST",
      body: JSON.stringify(fields),
    })
    return { leadId: data.id, created: true }
  } catch (err) {
    // Salesforce duplicate rule blocked creation — use the existing lead
    if (err instanceof SalesforceDuplicateError) {
      return { leadId: err.existingId, created: false }
    }
    throw err
  }
}

// Find an existing Salesforce Account by name
async function findAccountByName(
  token: string,
  instanceUrl: string,
  name: string
): Promise<string | null> {
  try {
    const query = encodeURIComponent(
      `SELECT Id FROM Account WHERE Name = '${name.replace(/'/g, "\\'")}' LIMIT 1`
    )
    const data = await sfFetch(token, instanceUrl, `/services/data/v59.0/query?q=${query}`)
    return data?.records?.[0]?.Id || null
  } catch {
    return null
  }
}

// Create or update a Salesforce Account from a Boilerroom Account
export async function upsertAccount(
  token: string,
  instanceUrl: string,
  account: {
    name: string
    industry?: string | null
    website?: string | null
    employees?: number | null
    location?: string | null
  }
): Promise<{ accountId: string; created: boolean }> {
  const fields: Record<string, string> = {
    Name: account.name,
  }
  if (account.industry) fields.Industry = account.industry
  if (account.website) fields.Website = account.website
  if (account.employees) fields.NumberOfEmployees = String(account.employees)
  if (account.location) fields.BillingCity = account.location.split(",")[0]?.trim() || ""

  const existingId = await findAccountByName(token, instanceUrl, account.name)
  if (existingId) {
    await sfFetch(token, instanceUrl, `/services/data/v59.0/sobjects/Account/${existingId}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    })
    return { accountId: existingId, created: false }
  }

  try {
    const data = await sfFetch(token, instanceUrl, `/services/data/v59.0/sobjects/Account`, {
      method: "POST",
      body: JSON.stringify(fields),
    })
    return { accountId: data.id, created: true }
  } catch (err) {
    if (err instanceof SalesforceDuplicateError) {
      return { accountId: err.existingId, created: false }
    }
    throw err
  }
}

const callDispositionMap: Record<string, string> = {
  connected: "Connected",
  connected_intro_booked: "Connected",
  connected_referral: "Connected",
  connected_not_interested: "Connected",
  connected_info_gathered: "Connected",
  callback: "Connected",
  gatekeeper: "Connected",
  voicemail: "Left Voicemail",
  no_answer: "No Answer",
  busy: "Busy",
  failed: "Unsuccessful",
  wrong_number: "Unsuccessful",
}

// Log a completed call as a Salesforce Task linked to a Lead
export async function logCallTask(
  token: string,
  instanceUrl: string,
  params: {
    leadId: string
    accountId?: string | null
    outcome: string
    notes?: string | null
    duration?: number | null
    startedAt?: Date | null
    transcription?: string | null
  }
): Promise<{ taskId: string }> {
  const outcomeLabel = params.outcome.replace(/_/g, " ")
  const description = [
    params.notes,
    params.transcription ? `\n\nTranscription:\n${params.transcription}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const activityDate = (params.startedAt || new Date()).toISOString().split("T")[0]

  const body: Record<string, any> = {
    Subject: `Call - ${outcomeLabel}`,
    Type: "Call",
    Status: "Completed",
    ActivityDate: activityDate,
    WhoId: params.leadId,
    CallType: "Outbound",
    CallDisposition: callDispositionMap[params.outcome] || "Connected",
    CallDurationInSeconds: params.duration || 0,
    Description: description || "",
  }
  if (params.accountId) body.WhatId = params.accountId

  const data = await sfFetch(token, instanceUrl, `/services/data/v59.0/sobjects/Task`, {
    method: "POST",
    body: JSON.stringify(body),
  })

  return { taskId: data.id }
}

// Log a sent email as a Salesforce Task linked to a Lead
export async function logEmailTask(
  token: string,
  instanceUrl: string,
  params: {
    leadId: string
    accountId?: string | null
    subject: string
    bodyText: string
    sentAt?: Date | null
  }
): Promise<{ taskId: string }> {
  const activityDate = (params.sentAt || new Date()).toISOString().split("T")[0]

  const body: Record<string, any> = {
    Subject: `Email - ${params.subject}`,
    Type: "Email",
    Status: "Completed",
    ActivityDate: activityDate,
    WhoId: params.leadId,
    Description: params.bodyText || "",
  }
  if (params.accountId) body.WhatId = params.accountId

  const data = await sfFetch(token, instanceUrl, `/services/data/v59.0/sobjects/Task`, {
    method: "POST",
    body: JSON.stringify(body),
  })

  return { taskId: data.id }
}

// Fetch Leads owned by the connected Salesforce user (for import)
export async function fetchOwnedLeads(
  token: string,
  instanceUrl: string,
  sfUserId: string
): Promise<
  Array<{
    Id: string
    FirstName: string | null
    LastName: string
    Email: string | null
    Title: string | null
    Company: string | null
    Phone: string | null
    MobilePhone: string | null
    City: string | null
    State: string | null
  }>
> {
  const query = encodeURIComponent(
    `SELECT Id, FirstName, LastName, Email, Title, Company, Phone, MobilePhone, City, State ` +
      `FROM Lead WHERE OwnerId = '${sfUserId}' AND IsConverted = false ORDER BY CreatedDate DESC LIMIT 500`
  )
  const data = await sfFetch(token, instanceUrl, `/services/data/v59.0/query?q=${query}`)
  return data?.records || []
}

export async function isConfiguredForUser(userId: string): Promise<boolean> {
  const token = await getValidAccessToken(userId)
  return !!token
}
