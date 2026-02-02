import { google } from "googleapis"
import { getOAuth2Client, refreshAccessToken } from "./oauth"

interface EmailOptions {
  to: string
  cc?: string
  bcc?: string
  subject: string
  bodyText: string
  bodyHtml?: string
  from: string
}

function createMimeMessage(options: EmailOptions): string {
  const boundary = "boundary_" + Date.now().toString(16)

  const headers = [
    `From: ${options.from}`,
    `To: ${options.to}`,
    options.cc ? `Cc: ${options.cc}` : "",
    options.bcc ? `Bcc: ${options.bcc}` : "",
    `Subject: ${options.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
    .filter(Boolean)
    .join("\r\n")

  let body = `${headers}\r\n\r\n`

  // Plain text part
  body += `--${boundary}\r\n`
  body += 'Content-Type: text/plain; charset="UTF-8"\r\n\r\n'
  body += options.bodyText + "\r\n\r\n"

  // HTML part (if provided)
  if (options.bodyHtml) {
    body += `--${boundary}\r\n`
    body += 'Content-Type: text/html; charset="UTF-8"\r\n\r\n'
    body += options.bodyHtml + "\r\n\r\n"
  }

  body += `--${boundary}--`

  // Base64url encode
  return Buffer.from(body)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export async function sendEmailViaGmail(
  userId: string,
  options: EmailOptions
): Promise<{ messageId: string; threadId: string }> {
  // Get fresh access token (refreshes if needed)
  const accessToken = await refreshAccessToken(userId)

  if (!accessToken) {
    throw new Error("Gmail not connected or token refresh failed")
  }

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: "v1", auth: oauth2Client })

  const raw = createMimeMessage(options)

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
    },
  })

  return {
    messageId: response.data.id!,
    threadId: response.data.threadId!,
  }
}
