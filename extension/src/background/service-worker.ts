import { login, loginWithGoogle, logout, getAuthState, refreshTokenIfNeeded } from '@shared/auth'
import { revealContact, saveProspect, addToSequence, fetchAccountPov } from '@shared/api'
import type { ExtensionMessage } from '@shared/types'

/**
 * Background service worker — handles all API calls and auth on behalf
 * of content scripts and the popup. Content scripts send messages here
 * so that auth tokens stay in the background context (not in page DOM).
 */
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch((err) => {
    sendResponse({ error: err.message || 'Unknown error' })
  })
  // Return true to indicate we will sendResponse asynchronously
  return true
})

async function handleMessage(message: ExtensionMessage): Promise<any> {
  switch (message.type) {
    case 'GET_AUTH_STATE': {
      const state = await getAuthState()
      if (state) {
        // Also attempt a token refresh to keep it fresh
        await refreshTokenIfNeeded()
        const fresh = await getAuthState()
        return { authenticated: true, user: fresh?.user }
      }
      return { authenticated: false }
    }

    case 'LOGIN': {
      const authState = await login(message.data.email, message.data.password)
      return { authenticated: true, user: authState.user }
    }

    case 'LOGIN_GOOGLE': {
      const googleAuthState = await loginWithGoogle()
      return { authenticated: true, user: googleAuthState.user }
    }

    case 'LOGOUT': {
      await logout()
      return { authenticated: false }
    }

    case 'REVEAL_CONTACT': {
      return await revealContact(message.data)
    }

    case 'SAVE_PROSPECT': {
      return await saveProspect(message.data)
    }

    case 'ADD_TO_SEQUENCE': {
      return await addToSequence(message.data.prospectId, message.data.sequenceId)
    }

    case 'GET_CACHED_REVEAL': {
      const cacheKey = `br_reveal_cache_${message.data.linkedinUrl}`
      const result = await chrome.storage.local.get(cacheKey)
      return result[cacheKey] || null
    }

    case 'CACHE_REVEAL': {
      const cacheKey = `br_reveal_cache_${message.data.linkedinUrl}`
      await chrome.storage.local.set({
        [cacheKey]: {
          ...message.data.result,
          cachedAt: Date.now(),
        },
      })
      return { success: true }
    }

    case 'FETCH_ACCOUNT_POV': {
      return await fetchAccountPov(message.data.accountId)
    }

    default:
      throw new Error(`Unknown message type: ${(message as any).type}`)
  }
}
