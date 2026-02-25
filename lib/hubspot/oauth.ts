import { prisma } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/encryption"

const HUBSPOT_AUTH_URL = "https://app.hubspot.com/oauth/authorize"
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token"

const SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.schemas.contacts.read",
  "crm.schemas.contacts.write",
  "crm.objects.companies.read",
  "crm.objects.companies.write",
  "crm.schemas.companies.read",
  "crm.schemas.companies.write",
]

function getClientId(): string {
  return process.env.HUBSPOT_CLIENT_ID || ""
}

function getClientSecret(): string {
  return process.env.HUBSPOT_CLIENT_SECRET || ""
}

function getRedirectUri(): string {
  return process.env.HUBSPOT_REDIRECT_URI || ""
}

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    scope: SCOPES.join(" "),
    state,
  })

  return `${HUBSPOT_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      code,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => "")
    throw new Error(`HubSpot token exchange failed (${res.status}): ${errBody}`)
  }

  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number // seconds
  }>
}

async function refreshToken(refreshTokenValue: string) {
  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: refreshTokenValue,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => "")
    throw new Error(`HubSpot token refresh failed (${res.status}): ${errBody}`)
  }

  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
  }>
}

export async function getPortalId(accessToken: string): Promise<number> {
  const res = await fetch("https://api.hubapi.com/account-info/v3/details", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) throw new Error("Failed to get HubSpot portal info")

  const data = await res.json()
  return data.portalId
}

export async function saveHubspotTokens(
  userId: string,
  tokens: {
    access_token: string
    refresh_token: string
    expires_in: number
  },
  portalId: number
) {
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  await prisma.hubspotIntegration.upsert({
    where: { userId },
    update: {
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      tokenExpiresAt,
      portalId,
      scopes: SCOPES.join(","),
      isActive: true,
    },
    create: {
      userId,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      tokenExpiresAt,
      portalId,
      scopes: SCOPES.join(","),
      isActive: true,
    },
  })
}

/**
 * Get a valid access token for a user, refreshing if expired.
 * Returns null if user has no integration or refresh fails.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const integration = await prisma.hubspotIntegration.findUnique({
    where: { userId },
  })

  if (!integration || !integration.isActive) return null

  // Check if token is still valid (with 5 min buffer)
  if (integration.tokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return decrypt(integration.accessToken)
  }

  // Token expired, refresh it
  try {
    const decryptedRefresh = decrypt(integration.refreshToken)
    const newTokens = await refreshToken(decryptedRefresh)

    const tokenExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000)

    await prisma.hubspotIntegration.update({
      where: { userId },
      data: {
        accessToken: encrypt(newTokens.access_token),
        refreshToken: encrypt(newTokens.refresh_token),
        tokenExpiresAt,
      },
    })

    return newTokens.access_token
  } catch (error) {
    console.error("Failed to refresh HubSpot token:", error)
    // Mark integration as inactive if refresh fails
    await prisma.hubspotIntegration.update({
      where: { userId },
      data: { isActive: false },
    })
    return null
  }
}

export async function getHubspotIntegration(userId: string) {
  return prisma.hubspotIntegration.findUnique({
    where: { userId },
    select: {
      portalId: true,
      isActive: true,
      createdAt: true,
      tokenExpiresAt: true,
    },
  })
}

export async function deleteHubspotIntegration(userId: string) {
  const integration = await prisma.hubspotIntegration.findUnique({
    where: { userId },
  })

  if (!integration) return null

  // Delete the integration record
  await prisma.hubspotIntegration.delete({
    where: { userId },
  })

  return true
}
