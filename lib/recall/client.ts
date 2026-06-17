import crypto from "crypto"

const RECALL_API_KEY = process.env.RECALL_API_KEY
const RECALL_BASE_URL = process.env.RECALL_BASE_URL ?? "https://us-west-2.recall.ai/api/v1"

async function recallFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${RECALL_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Token ${RECALL_API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Recall API ${res.status}: ${text}`)
  }
  return res.json()
}

export interface RecallBot {
  id: string
  meeting_url: string
  status_changes: { code: string; created_at: string }[]
  meeting_metadata?: { title?: string; start_time?: string; end_time?: string }
}

export interface RecallTranscriptEntry {
  speaker: string
  words: { start_timestamp: number; end_timestamp: number; text: string }[]
}

export async function createBot(
  meetingUrl: string,
  botName = "Meeting Notes",
  joinAt?: string
): Promise<RecallBot> {
  return recallFetch("/bot", {
    method: "POST",
    body: JSON.stringify({
      meeting_url: meetingUrl,
      bot_name: botName,
      ...(joinAt ? { join_at: joinAt } : {}),
      transcription_options: { provider: "default" },
    }),
  })
}

export async function getBot(botId: string): Promise<RecallBot> {
  return recallFetch(`/bot/${botId}`)
}

export async function getBotTranscript(botId: string): Promise<RecallTranscriptEntry[]> {
  return recallFetch(`/bot/${botId}/transcript`)
}

export function transcriptToText(entries: RecallTranscriptEntry[]): string {
  return entries
    .map((e) => `${e.speaker}: ${e.words.map((w) => w.text).join(" ")}`)
    .join("\n")
}

// Svix-compatible HMAC-SHA256 webhook verification (whsec_ format)
export function verifyWebhookSignature(
  rawBody: string,
  headers: { get(name: string): string | null }
): boolean {
  const secret = process.env.RECALL_WEBHOOK_SECRET
  if (!secret) return false

  const msgId = headers.get("svix-id")
  const msgTimestamp = headers.get("svix-timestamp")
  const msgSignature = headers.get("svix-signature")

  if (!msgId || !msgTimestamp || !msgSignature) return false

  // Reject if timestamp is more than 5 minutes old
  const ts = parseInt(msgTimestamp, 10)
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) return false

  const toSign = `${msgId}.${msgTimestamp}.${rawBody}`
  const secretBytes = Buffer.from(secret.replace("whsec_", ""), "base64")
  const computed = crypto.createHmac("sha256", secretBytes).update(toSign).digest("base64")

  return msgSignature.split(" ").some((sig) => {
    const [version, value] = sig.split(",")
    return version === "v1" && value === computed
  })
}
