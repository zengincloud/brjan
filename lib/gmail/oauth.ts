import { google } from "googleapis"
import { prisma } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/encryption"

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
]

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_GMAIL_CLIENT_ID,
    process.env.GOOGLE_GMAIL_CLIENT_SECRET,
    process.env.GOOGLE_GMAIL_REDIRECT_URI
  )
}

export function getAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state,
    prompt: "consent", // Force consent to ensure refresh token
  })
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function getGmailEmail(accessToken: string): Promise<string> {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()

  return data.email!
}

export async function refreshAccessToken(
  userId: string
): Promise<string | null> {
  const integration = await prisma.gmailIntegration.findUnique({
    where: { userId },
  })

  if (!integration || !integration.isActive) return null

  // Check if token is still valid (with 5 min buffer)
  if (integration.tokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return decrypt(integration.accessToken)
  }

  // Refresh the token
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    refresh_token: decrypt(integration.refreshToken),
  })

  try {
    const { credentials } = await oauth2Client.refreshAccessToken()

    // Update stored tokens
    await prisma.gmailIntegration.update({
      where: { userId },
      data: {
        accessToken: encrypt(credentials.access_token!),
        tokenExpiresAt: new Date(credentials.expiry_date!),
      },
    })

    return credentials.access_token!
  } catch (error) {
    console.error("Failed to refresh Gmail token:", error)
    // Mark integration as inactive if refresh fails
    await prisma.gmailIntegration.update({
      where: { userId },
      data: { isActive: false },
    })
    return null
  }
}

export async function saveGmailTokens(
  userId: string,
  tokens: {
    access_token: string
    refresh_token: string
    expiry_date: number
  },
  gmailEmail: string
) {
  await prisma.gmailIntegration.upsert({
    where: { userId },
    update: {
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      tokenExpiresAt: new Date(tokens.expiry_date),
      gmailEmail,
      scopes: SCOPES.join(","),
      isActive: true,
    },
    create: {
      userId,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      tokenExpiresAt: new Date(tokens.expiry_date),
      gmailEmail,
      scopes: SCOPES.join(","),
      isActive: true,
    },
  })
}

export async function getGmailIntegration(userId: string) {
  return prisma.gmailIntegration.findUnique({
    where: { userId },
    select: {
      gmailEmail: true,
      isActive: true,
      createdAt: true,
      tokenExpiresAt: true,
    },
  })
}

export async function deleteGmailIntegration(userId: string) {
  const integration = await prisma.gmailIntegration.findUnique({
    where: { userId },
  })

  if (!integration) return null

  // Try to revoke the token with Google
  try {
    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials({
      access_token: decrypt(integration.accessToken),
    })
    await oauth2Client.revokeCredentials()
  } catch (error) {
    // Log but don't fail - token may already be revoked
    console.warn("Token revocation failed:", error)
  }

  // Delete the integration record
  await prisma.gmailIntegration.delete({
    where: { userId },
  })

  return true
}
