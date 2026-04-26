import { google } from "googleapis"
import { prisma } from "@/lib/prisma"
import { encrypt, decrypt } from "@/lib/encryption"

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
]

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_GCAL_CLIENT_ID,
    process.env.GOOGLE_GCAL_CLIENT_SECRET,
    process.env.GOOGLE_GCAL_REDIRECT_URI
  )
}

export function getAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state,
    prompt: "consent",
  })
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function getCalendarEmail(accessToken: string): Promise<string> {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()

  return data.email!
}

export async function refreshAccessToken(userId: string): Promise<string | null> {
  const integration = await prisma.gcalIntegration.findUnique({
    where: { userId },
  })

  if (!integration || !integration.isActive) return null

  if (integration.tokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return decrypt(integration.accessToken)
  }

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    refresh_token: decrypt(integration.refreshToken),
  })

  try {
    const { credentials } = await oauth2Client.refreshAccessToken()

    await prisma.gcalIntegration.update({
      where: { userId },
      data: {
        accessToken: encrypt(credentials.access_token!),
        tokenExpiresAt: new Date(credentials.expiry_date!),
      },
    })

    return credentials.access_token!
  } catch (error) {
    console.error("Failed to refresh GCal token:", error)
    await prisma.gcalIntegration.update({
      where: { userId },
      data: { isActive: false },
    })
    return null
  }
}

export async function saveGcalTokens(
  userId: string,
  tokens: {
    access_token: string
    refresh_token: string
    expiry_date: number
  },
  calendarEmail: string
) {
  await prisma.gcalIntegration.upsert({
    where: { userId },
    update: {
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      tokenExpiresAt: new Date(tokens.expiry_date),
      calendarEmail,
      scopes: SCOPES.join(","),
      isActive: true,
    },
    create: {
      userId,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      tokenExpiresAt: new Date(tokens.expiry_date),
      calendarEmail,
      scopes: SCOPES.join(","),
      isActive: true,
    },
  })
}

export async function getGcalIntegration(userId: string) {
  return prisma.gcalIntegration.findUnique({
    where: { userId },
    select: {
      calendarEmail: true,
      isActive: true,
      createdAt: true,
      tokenExpiresAt: true,
    },
  })
}

export async function deleteGcalIntegration(userId: string) {
  const integration = await prisma.gcalIntegration.findUnique({
    where: { userId },
  })

  if (!integration) return null

  try {
    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials({
      access_token: decrypt(integration.accessToken),
    })
    await oauth2Client.revokeCredentials()
  } catch (error) {
    console.warn("GCal token revocation failed:", error)
  }

  await prisma.gcalIntegration.delete({ where: { userId } })

  return true
}
