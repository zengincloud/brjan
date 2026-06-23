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
  meeting_url: string | { meeting_id?: string; platform?: string }
  status_changes: { code: string; created_at: string }[]
  meeting_metadata?: { title?: string; start_time?: string; end_time?: string }
  calendar_meetings?: Array<{
    id: string
    calendar_user?: { external_id?: string }
  }>
}

export function resolveMeetingUrl(raw: RecallBot["meeting_url"]): string | null {
  if (!raw) return null
  if (typeof raw === "string") return raw
  if (raw.platform === "google_meet" && raw.meeting_id) return `https://meet.google.com/${raw.meeting_id}`
  if (raw.platform === "zoom" && raw.meeting_id) return `https://zoom.us/j/${raw.meeting_id}`
  return JSON.stringify(raw)
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
    }),
  })
}

export async function getBot(botId: string): Promise<RecallBot> {
  return recallFetch(`/bot/${botId}`)
}

export async function getBotTranscript(botId: string): Promise<RecallTranscriptEntry[]> {
  return recallFetch(`/bot/${botId}/transcript`)
}

export async function deleteBot(botId: string): Promise<void> {
  await recallFetch(`/bot/${botId}/`, { method: "DELETE" })
}

export async function listBots(limit = 20): Promise<{ results: RecallBot[] }> {
  return recallFetch(`/bot/?limit=${limit}&ordering=-created_at`)
}

export interface RecallRecording {
  id: string
  status: { code: string }
  started_at: string | null
  completed_at: string | null
}

export async function listBotRecordings(botId: string): Promise<{ results: RecallRecording[] }> {
  return recallFetch(`/recording/?bot_id=${botId}`)
}

export interface RecallTranscriptMeta {
  id: string
  status: { code: string }
  download_url: string | null
}

export async function listRecordingTranscripts(recordingId: string): Promise<{ results: RecallTranscriptMeta[] }> {
  return recallFetch(`/recording/${recordingId}/transcript/`)
}

export async function createAsyncTranscript(recordingId: string): Promise<{ id: string }> {
  return recallFetch(`/recording/${recordingId}/create_transcript/`, {
    method: "POST",
    body: JSON.stringify({
      provider: { elevenlabs_async: { model_id: "scribe_v1", language_code: "en" } },
      diarization: { use_separate_streams_when_available: true },
    }),
  })
}

export async function getAsyncTranscript(transcriptId: string): Promise<{ download_url: string; status: string }> {
  return recallFetch(`/transcript/${transcriptId}/`)
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
  if (!secret) { console.warn("Recall webhook: RECALL_WEBHOOK_SECRET not set"); return false }

  const msgId = headers.get("webhook-id") ?? headers.get("svix-id")
  const msgTimestamp = headers.get("webhook-timestamp") ?? headers.get("svix-timestamp")
  const msgSignature = headers.get("webhook-signature") ?? headers.get("svix-signature")

  if (!msgId || !msgTimestamp || !msgSignature) {
    console.warn("Recall webhook: missing webhook headers", { msgId, msgTimestamp, hasSig: !!msgSignature })
    return false
  }

  // Reject if timestamp is more than 5 minutes old
  const ts = parseInt(msgTimestamp, 10)
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) {
    console.warn("Recall webhook: timestamp too old", { ts, now: Math.floor(Date.now() / 1000) })
    return false
  }

  const toSign = `${msgId}.${msgTimestamp}.${rawBody}`
  const secretBytes = Buffer.from(secret.replace("whsec_", ""), "base64")
  const computed = crypto.createHmac("sha256", secretBytes).update(toSign).digest("base64")

  return msgSignature.split(" ").some((sig) => {
    const [version, value] = sig.split(",")
    return version === "v1" && value === computed
  })
}
