import { API_BASE_URL } from './config'
import { refreshTokenIfNeeded } from './auth'
import type {
  LinkedInScrapedData,
  RevealResponse,
  SaveProspectPayload,
  SaveProspectResponse,
  AddToSequenceResponse,
  AccountPovResponse,
  LinkedInConversationSync,
  SyncMessagesResponse,
  PendingMessagesResponse,
} from './types'

/** Make an authenticated API call to the Boilerroom backend */
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await refreshTokenIfNeeded()
  if (!token) {
    throw new Error('Not authenticated. Please log in via the extension popup.')
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    let message = `API error: ${res.status}`
    try {
      const json = await res.json()
      message = json.error || message
    } catch {}
    throw new Error(message)
  }

  return (await res.json()) as T
}

/** POST /api/extension/reveal — reveal contact from LinkedIn data */
export function revealContact(data: LinkedInScrapedData): Promise<RevealResponse> {
  return apiFetch<RevealResponse>('/api/extension/reveal', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** POST /api/extension/save-prospect — save as prospect in CRM */
export function saveProspect(data: SaveProspectPayload): Promise<SaveProspectResponse> {
  return apiFetch<SaveProspectResponse>('/api/extension/save-prospect', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** POST /api/extension/add-to-sequence — add prospect to a sequence */
export function addToSequence(prospectId: string, sequenceId: string): Promise<AddToSequenceResponse> {
  return apiFetch<AddToSequenceResponse>('/api/extension/add-to-sequence', {
    method: 'POST',
    body: JSON.stringify({ prospectId, sequenceId }),
  })
}

/** GET /api/extension/account-pov — fetch account POV briefing */
export function fetchAccountPov(accountId: string): Promise<AccountPovResponse> {
  return apiFetch<AccountPovResponse>(
    `/api/extension/account-pov?accountId=${encodeURIComponent(accountId)}`
  )
}

/** POST /api/extension/sync-messages — sync scraped LinkedIn conversations */
export function syncMessages(conversations: LinkedInConversationSync[]): Promise<SyncMessagesResponse> {
  return apiFetch<SyncMessagesResponse>('/api/extension/sync-messages', {
    method: 'POST',
    body: JSON.stringify({ conversations }),
  })
}

/** GET /api/extension/pending-messages — get queued outbound messages */
export function getPendingMessages(): Promise<PendingMessagesResponse> {
  return apiFetch<PendingMessagesResponse>('/api/extension/pending-messages')
}

/** POST /api/extension/pending-messages — report send result */
export function reportPendingResult(
  messageId: string,
  success: boolean,
  errorMessage?: string
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/api/extension/pending-messages', {
    method: 'POST',
    body: JSON.stringify({ messageId, success, errorMessage }),
  })
}
