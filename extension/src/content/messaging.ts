import type {
  LinkedInConversationSync,
  LinkedInMessageSync,
  PendingMessage,
} from '@shared/types'

/**
 * LinkedIn Messaging Content Script
 * Runs on linkedin.com/messaging/* pages.
 * Scrapes conversations and messages, syncs them to the backend,
 * and handles sending outbound messages queued from the Boilerroom web app.
 */

// ——— Communication with service worker ———

function sendMessage<T = any>(message: any): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || ''))
          return
        }
        if (response?.error) {
          reject(new Error(response.error))
          return
        }
        resolve(response)
      })
    } catch (err: any) {
      reject(err)
    }
  })
}

// ——— LinkedIn DOM Scraping ———

/** Extract conversation thread ID from a conversation list item or thread URL */
function extractThreadId(el: Element): string | null {
  // Try data attribute
  const threadUrl =
    el.getAttribute('data-thread-id') ||
    el.querySelector('a')?.getAttribute('href')

  if (threadUrl) {
    // Format: /messaging/thread/THREAD_ID/
    const match = threadUrl.match(/\/messaging\/thread\/([^/]+)/)
    if (match) return match[1]
    // Sometimes it's just the thread ID in data attribute
    if (!threadUrl.startsWith('/')) return threadUrl
  }

  // Try the link href directly
  const link = el.querySelector('a[href*="/messaging/thread/"]') as HTMLAnchorElement | null
  if (link) {
    const match = link.href.match(/\/messaging\/thread\/([^/]+)/)
    if (match) return match[1]
  }

  return null
}

/** Scrape conversations from the sidebar list */
function scrapeConversationList(): LinkedInConversationSync[] {
  const conversations: LinkedInConversationSync[] = []

  // LinkedIn messaging conversation list selectors
  const convSelectors = [
    '.msg-conversations-container__conversations-list li.msg-conversation-listitem',
    '.msg-conversations-container__conversations-list > li',
    'ul.msg-conversations-container__conversations-list > li',
    '.scaffold-layout__list ul > li',
  ]

  let items: NodeListOf<Element> | null = null
  for (const sel of convSelectors) {
    items = document.querySelectorAll(sel)
    if (items.length > 0) break
  }

  if (!items || items.length === 0) return conversations

  for (const item of items) {
    const threadId = extractThreadId(item)
    if (!threadId) continue

    // Participant name
    const nameEl =
      item.querySelector('.msg-conversation-listitem__participant-names .truncate') ||
      item.querySelector('.msg-conversation-card__participant-names') ||
      item.querySelector('.msg-conversation-listitem__participant-names') ||
      item.querySelector('h3 span.truncate')
    const participantName = nameEl?.textContent?.trim() || ''
    if (!participantName) continue

    // Participant headline/title
    const titleEl = item.querySelector('.msg-conversation-card__message-snippet-body')
    const participantTitle = undefined // Title isn't visible in list; we'll get it from the thread

    // Avatar
    const avatarEl = item.querySelector('img.presence-entity__image') ||
      item.querySelector('.msg-facepile-grid--no-facepile img') ||
      item.querySelector('img.EntityPhoto-circle-3')
    const participantAvatar = (avatarEl as HTMLImageElement)?.src || undefined

    conversations.push({
      linkedinThreadId: threadId,
      participantName,
      participantTitle,
      participantAvatar,
      messages: [], // Messages are scraped per-thread when opened
    })
  }

  return conversations
}

/** Scrape messages from the currently open conversation thread */
function scrapeCurrentThread(): { threadId: string; messages: LinkedInMessageSync[] } | null {
  // Get thread ID from URL
  const urlMatch = window.location.pathname.match(/\/messaging\/thread\/([^/]+)/)
  if (!urlMatch) return null

  const threadId = urlMatch[1]
  const messages: LinkedInMessageSync[] = []

  // Message event selectors
  const msgSelectors = [
    '.msg-s-event-listitem',
    '.msg-s-message-list__event',
    'li.msg-s-message-list-item',
  ]

  let msgItems: NodeListOf<Element> | null = null
  for (const sel of msgSelectors) {
    msgItems = document.querySelectorAll(sel)
    if (msgItems.length > 0) break
  }

  if (!msgItems || msgItems.length === 0) return { threadId, messages }

  // Get the logged-in user's name for direction detection
  const myNameEl =
    document.querySelector('.global-nav__me-photo') ||
    document.querySelector('img.global-nav__me-photo')
  const myName = (myNameEl as HTMLImageElement)?.alt?.trim() || ''

  for (const msgEl of msgItems) {
    // Message body
    const bodyEl =
      msgEl.querySelector('.msg-s-event-listitem__body') ||
      msgEl.querySelector('.msg-s-event__content p') ||
      msgEl.querySelector('.msg-s-message-group__message-body')
    const body = bodyEl?.textContent?.trim() || ''
    if (!body) continue

    // Sender name
    const senderEl =
      msgEl.querySelector('.msg-s-message-group__name') ||
      msgEl.querySelector('.msg-s-event-listitem__header .t-bold') ||
      msgEl.querySelector('.msg-s-message-group__profile-link')
    const senderName = senderEl?.textContent?.trim() || ''

    // Direction: compare sender to logged-in user
    const direction: 'inbound' | 'outbound' =
      myName && senderName.toLowerCase().includes(myName.toLowerCase().split(' ')[0])
        ? 'outbound'
        : 'inbound'

    // Timestamp
    const timeEl =
      msgEl.querySelector('.msg-s-message-group__timestamp') ||
      msgEl.querySelector('.msg-s-event-listitem__timestamp') ||
      msgEl.querySelector('time')
    const sentAt = timeEl?.getAttribute('datetime') || new Date().toISOString()

    // Generate a message ID from content hash (LinkedIn doesn't expose message IDs in the DOM)
    const linkedinMsgId = hashString(`${threadId}_${senderName}_${sentAt}_${body.substring(0, 50)}`)

    messages.push({
      linkedinMsgId,
      direction,
      body,
      senderName,
      sentAt,
    })
  }

  return { threadId, messages }
}

/** Simple string hash for generating stable message IDs */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

// ——— Send a message via LinkedIn DOM ———

async function sendLinkedInMessage(threadId: string, body: string): Promise<boolean> {
  // Navigate to the thread if not already there
  if (!window.location.pathname.includes(`/messaging/thread/${threadId}`)) {
    window.location.href = `https://www.linkedin.com/messaging/thread/${threadId}/`
    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  // Find the message input
  const inputSelectors = [
    '.msg-form__contenteditable[contenteditable="true"]',
    '.msg-form__msg-content-container .msg-form__contenteditable',
    'div[role="textbox"][contenteditable="true"]',
    '.msg-form__placeholder + div[contenteditable="true"]',
  ]

  let inputEl: HTMLElement | null = null
  for (const sel of inputSelectors) {
    inputEl = document.querySelector(sel) as HTMLElement | null
    if (inputEl) break
  }

  if (!inputEl) {
    console.error('[BR Messaging] Could not find message input')
    return false
  }

  // Focus and type
  inputEl.focus()
  inputEl.textContent = body

  // Dispatch input event so LinkedIn's React picks it up
  inputEl.dispatchEvent(new Event('input', { bubbles: true }))
  inputEl.dispatchEvent(new Event('change', { bubbles: true }))

  // Small delay for LinkedIn to process
  await new Promise(resolve => setTimeout(resolve, 500))

  // Click send button
  const sendSelectors = [
    '.msg-form__send-button',
    'button.msg-form__send-btn',
    'button[type="submit"].msg-form__send-button',
  ]

  let sendBtn: HTMLButtonElement | null = null
  for (const sel of sendSelectors) {
    sendBtn = document.querySelector(sel) as HTMLButtonElement | null
    if (sendBtn) break
  }

  if (!sendBtn) {
    console.error('[BR Messaging] Could not find send button')
    return false
  }

  sendBtn.click()

  // Wait for the message to be sent
  await new Promise(resolve => setTimeout(resolve, 1000))

  return true
}

// ——— Main sync loop ———

let syncInterval: ReturnType<typeof setInterval> | null = null
let pendingInterval: ReturnType<typeof setInterval> | null = null

async function doSync() {
  try {
    // 1. Scrape conversation list
    const conversations = scrapeConversationList()

    // 2. If a thread is open, scrape its messages
    const currentThread = scrapeCurrentThread()
    if (currentThread && currentThread.messages.length > 0) {
      const existing = conversations.find(
        (c) => c.linkedinThreadId === currentThread.threadId
      )
      if (existing) {
        existing.messages = currentThread.messages
      } else {
        conversations.push({
          linkedinThreadId: currentThread.threadId,
          participantName: '',
          messages: currentThread.messages,
        })
      }
    }

    if (conversations.length === 0) return

    // 3. Sync to backend
    await sendMessage({
      type: 'SYNC_MESSAGES',
      data: { conversations },
    })
  } catch (err) {
    console.error('[BR Messaging] Sync error:', err)
  }
}

async function checkPendingMessages() {
  try {
    const result = await sendMessage<{ messages: PendingMessage[] }>({
      type: 'GET_PENDING_MESSAGES',
    })

    if (!result.messages || result.messages.length === 0) return

    for (const msg of result.messages) {
      const success = await sendLinkedInMessage(msg.linkedinThreadId, msg.body)

      // Report result back
      await sendMessage({
        type: 'REPORT_PENDING_RESULT',
        data: {
          messageId: msg.id,
          success,
          errorMessage: success ? undefined : 'Failed to send via LinkedIn DOM',
        },
      })

      // Wait between messages to not overwhelm LinkedIn
      if (result.messages.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
  } catch (err) {
    console.error('[BR Messaging] Pending messages check error:', err)
  }
}

// ——— MutationObserver for new messages ———

let messageObserver: MutationObserver | null = null

function startMessageObserver() {
  if (messageObserver) return

  const msgListSelectors = [
    '.msg-s-message-list',
    '.msg-s-event-list',
    '.scaffold-layout__detail',
  ]

  let target: Element | null = null
  for (const sel of msgListSelectors) {
    target = document.querySelector(sel)
    if (target) break
  }

  if (!target) return

  messageObserver = new MutationObserver(() => {
    // Debounce: sync after mutations settle
    if (syncDebounce) clearTimeout(syncDebounce)
    syncDebounce = setTimeout(() => doSync(), 2000)
  })

  messageObserver.observe(target, { childList: true, subtree: true })
}

let syncDebounce: ReturnType<typeof setTimeout> | null = null

// ——— Initialization ———

function init() {
  // Only run on messaging pages
  if (!window.location.pathname.startsWith('/messaging')) return

  console.log('[BR Messaging] Content script loaded')

  // Notify service worker that messaging tab is ready
  sendMessage({ type: 'MESSAGING_TAB_READY' }).catch(() => {})

  // Initial sync after page loads
  setTimeout(() => {
    doSync()
    startMessageObserver()
  }, 3000)

  // Periodic sync every 30 seconds
  syncInterval = setInterval(doSync, 30000)

  // Check for pending outbound messages every 10 seconds
  pendingInterval = setInterval(checkPendingMessages, 10000)
}

// Handle URL changes (LinkedIn SPA navigation)
let lastUrl = window.location.href
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href

    if (window.location.pathname.startsWith('/messaging')) {
      // Re-setup observer for new thread
      if (messageObserver) {
        messageObserver.disconnect()
        messageObserver = null
      }
      setTimeout(() => {
        doSync()
        startMessageObserver()
      }, 2000)
    }
  }
})
urlObserver.observe(document.body, { childList: true, subtree: true })

// Listen for messages from service worker (e.g., to send a message)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SEND_LINKEDIN_MESSAGE') {
    sendLinkedInMessage(message.data.linkedinThreadId, message.data.body)
      .then((success) => sendResponse({ success }))
      .catch((err) => sendResponse({ success: false, error: err.message }))
    return true // async response
  }
})

init()
