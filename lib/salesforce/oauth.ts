import { prisma } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/encryption"

const SF_AUTH_URL = "https://login.salesforce.com/services/oauth2/authorize"
const SF_TOKEN_URL = "https://login.salesforce.com/services/oauth2/token"

const SCOPES = ["api", "refresh_token", "offline_access"]

function getClientId(): string {
  return process.env.SALESFORCE_CLIENT_ID || ""
}

function getClientSecret(): string {
  return process.env.SALESFORCE_CLIENT_SECRET || ""
}

function getRedirectUri(): string {
  return process.env.SALESFORCE_REDIRECT_URI || ""
}

export function getAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })

  return `${SF_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const res = await fetch(SF_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      code,
      code_verifier: codeVerifier,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => "")
    throw new Error(`Salesforce token exchange failed (${res.status}): ${errBody}`)
  }

  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    instance_url: string
    id: string // URL like https://login.salesforce.com/id/{orgId}/{userId}
    issued_at: string
  }>
}

async function refreshAccessToken(refreshTokenValue: string) {
  const res = await fetch(SF_TOKEN_URL, {
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
    throw new Error(`Salesforce token refresh failed (${res.status}): ${errBody}`)
  }

  return res.json() as Promise<{
    access_token: string
    instance_url: string
    issued_at: string
  }>
}

export function getOrgIdFromIdentityUrl(idUrl: string): string {
  // idUrl format: https://login.salesforce.com/id/{orgId}/{userId}
  const parts = idUrl.split("/")
  return parts[parts.length - 2] || ""
}

export async function saveSalesforceTokens(
  userId: string,
  tokens: {
    access_token: string
    refresh_token: string
    instance_url: string
    id: string
  }
) {
  const orgId = getOrgIdFromIdentityUrl(tokens.id)
  // SF access tokens expire in 2 hours
  const tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)

  await prisma.salesforceIntegration.upsert({
    where: { userId },
    update: {
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      instanceUrl: tokens.instance_url,
      orgId,
      tokenExpiresAt,
      scopes: SCOPES.join(","),
      isActive: true,
    },
    create: {
      userId,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      instanceUrl: tokens.instance_url,
      orgId,
      tokenExpiresAt,
      scopes: SCOPES.join(","),
      isActive: true,
    },
  })
}

export async function getValidAccessToken(
  userId: string
): Promise<{ token: string; instanceUrl: string } | null> {
  const integration = await prisma.salesforceIntegration.findUnique({
    where: { userId },
  })

  if (!integration || !integration.isActive) return null

  // Valid with 5 min buffer
  if (integration.tokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return {
      token: decrypt(integration.accessToken),
      instanceUrl: integration.instanceUrl,
    }
  }

  // Token expired — refresh
  try {
    const decryptedRefresh = decrypt(integration.refreshToken)
    const newTokens = await refreshAccessToken(decryptedRefresh)
    const tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)

    await prisma.salesforceIntegration.update({
      where: { userId },
      data: {
        accessToken: encrypt(newTokens.access_token),
        instanceUrl: newTokens.instance_url,
        tokenExpiresAt,
      },
    })

    return { token: newTokens.access_token, instanceUrl: newTokens.instance_url }
  } catch (error) {
    console.error("Failed to refresh Salesforce token:", error)
    await prisma.salesforceIntegration.update({
      where: { userId },
      data: { isActive: false },
    })
    return null
  }
}

export async function getSalesforceIntegration(userId: string) {
  return prisma.salesforceIntegration.findUnique({
    where: { userId },
    select: {
      orgId: true,
      instanceUrl: true,
      isActive: true,
      createdAt: true,
      tokenExpiresAt: true,
    },
  })
}

export async function deleteSalesforceIntegration(userId: string) {
  const integration = await prisma.salesforceIntegration.findUnique({
    where: { userId },
  })

  if (!integration) return null

  await prisma.salesforceIntegration.delete({ where: { userId } })
  return true
}
