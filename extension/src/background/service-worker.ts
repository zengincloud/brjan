import { login, loginWithGoogle, logout, getAuthState, refreshTokenIfNeeded } from '@shared/auth'
import { revealContact, saveProspect, addToSequence, fetchAccountPov, syncMessages, getPendingMessages, reportPendingResult } from '@shared/api'
import type { ExtensionMessage } from '@shared/types'

// Track the LinkedIn messaging tab
let messagingTabId: number | null = null

/**
 * Background service worker — handles all API calls and auth on behalf
 * of content scripts and the popup. Content scripts send messages here
 * so that auth tokens stay in the background context (not in page DOM).
 */
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  // Track messaging tab ID from the sender
  if (message.type === 'MESSAGING_TAB_READY' && sender.tab?.id) {
    messagingTabId = sender.tab.id
  }

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
      return await addToSequence(message.data.sequenceId, message.data.prospectId, message.data.prospectData)
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

    // ——— LinkedIn Messaging Bridge ———

    case 'SYNC_MESSAGES': {
      return await syncMessages(message.data.conversations)
    }

    case 'GET_PENDING_MESSAGES': {
      return await getPendingMessages()
    }

    case 'REPORT_PENDING_RESULT': {
      return await reportPendingResult(
        message.data.messageId,
        message.data.success,
        message.data.errorMessage
      )
    }

    case 'MESSAGING_TAB_READY': {
      // Track the messaging tab when content script reports ready
      return { success: true }
    }

    case 'ENSURE_MESSAGING_TAB': {
      await ensureMessagingTab()
      return { success: true }
    }

    case 'SEND_LINKEDIN_MESSAGE': {
      // Forward to the messaging content script
      if (messagingTabId) {
        return new Promise((resolve) => {
          chrome.tabs.sendMessage(
            messagingTabId!,
            {
              type: 'SEND_LINKEDIN_MESSAGE',
              data: message.data,
            },
            (response) => {
              resolve(response || { success: false, error: 'No response from messaging tab' })
            }
          )
        })
      }
      throw new Error('LinkedIn messaging tab is not open')
    }

    default:
      throw new Error(`Unknown message type: ${(message as any).type}`)
  }
}

// ——— Messaging Tab Management ———

async function ensureMessagingTab() {
  // Check if we already have a valid messaging tab
  if (messagingTabId) {
    try {
      const tab = await chrome.tabs.get(messagingTabId)
      if (tab && tab.url?.includes('linkedin.com/messaging')) {
        return // Tab is still valid
      }
    } catch {
      // Tab was closed
      messagingTabId = null
    }
  }

  // Find an existing LinkedIn messaging tab
  const tabs = await chrome.tabs.query({ url: 'https://www.linkedin.com/messaging/*' })
  if (tabs.length > 0 && tabs[0].id) {
    messagingTabId = tabs[0].id
    // Pin it if not already
    await chrome.tabs.update(messagingTabId, { pinned: true })
    return
  }

  // Create a new pinned tab
  const newTab = await chrome.tabs.create({
    url: 'https://www.linkedin.com/messaging/',
    pinned: true,
    active: false,
  })
  messagingTabId = newTab.id ?? null
}

// Track when messaging tabs are opened/closed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('linkedin.com/messaging')) {
    messagingTabId = tabId
  }
})

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === messagingTabId) {
    messagingTabId = null
  }
})
