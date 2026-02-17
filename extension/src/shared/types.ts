// Scraped data from LinkedIn DOM
export interface LinkedInScrapedData {
  name: string
  title: string
  company: string
  linkedinUrl: string
}

// Response from POST /api/extension/reveal
export interface RevealResponse {
  success: boolean
  revealData: RevealData | null
  matchedAccount: MatchedAccount | null
  existingProspect: ExistingProspect | null
  sequences: SequenceSummary[]
  scrapedData: LinkedInScrapedData
}

export interface RevealData {
  email: string | null
  emailType: string | null
  emailStatus: string | null
  emails: { email: string; type: string; status: string }[]
  phone: string | null
  phoneStatus: string | null
  phones: { number: string; prettyNumber: string; type: string }[]
  name: string | null
  title: string | null
  company: string | null
  location: string | null
  linkedinUrl: string | null
  companySize: number | null
  companySizeRange: string | null
  companyIndustry: string | null
  companyDomain: string | null
  companyFounded: number | null
  companyRevenue: string | null
  companyDescription: string | null
}

export interface MatchedAccount {
  id: string
  name: string
  industry: string | null
  website: string | null
  employees: number | null
  status: string
}

export interface ExistingProspect {
  id: string
  name: string
  email: string | null
  status: string
  company: string | null
}

export interface SequenceSummary {
  id: string
  name: string
  status: string
  prospectCount: number
}

// Response from POST /api/extension/save-prospect
export interface SaveProspectResponse {
  prospect: {
    id: string
    name: string
    email: string | null
    title: string | null
    company: string | null
    status: string
  }
}

// Response from POST /api/extension/add-to-sequence
export interface AddToSequenceResponse {
  success: boolean
  prospectSequence: {
    id: string
    prospectId: string
    sequenceId: string
    status: string
  }
  sequenceName: string
}

// Auth state stored in chrome.storage.local
export interface AuthState {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: {
    id: string
    email: string
  }
}

// Messages between content script <-> background service worker
export type ExtensionMessage =
  | { type: 'REVEAL_CONTACT'; data: LinkedInScrapedData }
  | { type: 'SAVE_PROSPECT'; data: SaveProspectPayload }
  | { type: 'ADD_TO_SEQUENCE'; data: { prospectId: string; sequenceId: string } }
  | { type: 'GET_AUTH_STATE' }
  | { type: 'LOGIN'; data: { email: string; password: string } }
  | { type: 'LOGIN_GOOGLE' }
  | { type: 'LOGOUT' }

export interface SaveProspectPayload {
  name: string
  email?: string | null
  title?: string | null
  company?: string | null
  phone?: string | null
  location?: string | null
  linkedin?: string | null
  wizaData?: Record<string, any> | null
}
