import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'
import type { AuthState } from './types'

// Lazy-init the Supabase client so a crash here doesn't kill the service worker.
// Service workers have no localStorage/sessionStorage, so we provide explicit overrides.
let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: 'implicit',
        storage: {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        },
      },
      global: {
        fetch: fetch.bind(globalThis),
      },
    })
  }
  return _supabase
}

const STORAGE_KEY = 'boilerroom_auth'

/** Save auth state to chrome.storage.local */
export async function saveAuthState(state: AuthState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state })
}

/** Load auth state from chrome.storage.local */
export async function getAuthState(): Promise<AuthState | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return result[STORAGE_KEY] || null
}

/** Clear auth state */
export async function clearAuthState(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}

/** Login with email/password via Supabase, store tokens */
export async function login(email: string, password: string): Promise<AuthState> {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    throw new Error(error?.message || 'Login failed')
  }

  const authState: AuthState = {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? 0,
    user: {
      id: data.user.id,
      email: data.user.email!,
    },
  }

  await saveAuthState(authState)
  return authState
}

/** Refresh the access token if it's expired or about to expire */
export async function refreshTokenIfNeeded(): Promise<string | null> {
  const state = await getAuthState()
  if (!state) return null

  const now = Math.floor(Date.now() / 1000)
  // Refresh if token expires within 60 seconds
  if (state.expiresAt > now + 60) {
    return state.accessToken
  }

  const { data, error } = await getSupabase().auth.refreshSession({
    refresh_token: state.refreshToken,
  })

  if (error || !data.session) {
    await clearAuthState()
    return null
  }

  const newState: AuthState = {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? 0,
    user: state.user,
  }

  await saveAuthState(newState)
  return newState.accessToken
}

/** Login with Google OAuth via chrome.identity.launchWebAuthFlow */
export async function loginWithGoogle(): Promise<AuthState> {
  const redirectUrl = chrome.identity.getRedirectURL()

  // Get the OAuth URL from Supabase (implicit flow returns tokens in hash)
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  })

  if (error || !data.url) {
    throw new Error(error?.message || 'Failed to start Google login')
  }

  // Open the Google consent screen in a Chrome identity popup
  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: data.url, interactive: true },
      (callbackUrl) => {
        if (chrome.runtime.lastError || !callbackUrl) {
          reject(new Error(chrome.runtime.lastError?.message || 'Login cancelled'))
          return
        }
        resolve(callbackUrl)
      }
    )
  })

  // Parse tokens from the callback URL hash fragment
  // Supabase implicit flow returns: #access_token=...&refresh_token=...&expires_in=...
  const url = new URL(responseUrl)
  const hashParams = new URLSearchParams(url.hash.substring(1))
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  const expiresIn = hashParams.get('expires_in')

  if (!accessToken || !refreshToken) {
    throw new Error('No tokens received from Google login')
  }

  // Set the session in Supabase to get user info
  const { data: sessionData, error: sessionError } = await getSupabase().auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (sessionError || !sessionData.user) {
    throw new Error(sessionError?.message || 'Failed to set session')
  }

  const authState: AuthState = {
    accessToken,
    refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + parseInt(expiresIn || '3600'),
    user: {
      id: sessionData.user.id,
      email: sessionData.user.email!,
    },
  }

  await saveAuthState(authState)
  return authState
}

/** Logout — clear local state */
export async function logout(): Promise<void> {
  await clearAuthState()
}
