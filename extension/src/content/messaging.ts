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

// ——— Logged-in user info (for direction detection) ———

let myName = ''

async function fetchMyName() {
  // 1. Try auth state from service worker (most reliable)
  try {
    const response = await sendMessage<{ authenticated: boolean; user?: { name?: string; email: string } }>(
      { type: 'GET_AUTH_STATE' }
    )
    if (response?.authenticated && response.user?.name) {
      myName = response.user.name.trim()
      return
    }
  } catch {}

  // 2. Fallback: LinkedIn nav bar profile photo alt text
  const navSelectors = [
    'img.global-nav__me-photo',
    '.global-nav__me-photo',
    '.global-nav__me img',
    'img[alt].feed-identity-module__actor-image',
  ]
  for (const sel of navSelectors) {
    const el = document.querySelector(sel) as HTMLImageElement | null
    if (el?.alt && el.alt.length > 1) {
      myName = el.alt.trim()
      return
    }
  }

  // 3. Fallback: profile link text in nav
  const profileLink = document.querySelector('.global-nav__me-content .t-14') ||
    document.querySelector('.feed-identity-module__actor-meta a')
  if (profileLink?.textContent?.trim()) {
    myName = profileLink.textContent.trim()
  }
}

/** Check if a sender name matches the logged-in user */
function isMe(senderName: string): boolean {
  if (!senderName || !myName) return false

  const sender = senderName.toLowerCase().trim()
  const me = myName.toLowerCase().trim()

  // Exact match
  if (sender === me) return true

  // First + last name match (handles "John D." vs "John Doe")
  const myParts = me.split(/\s+/)
  const senderParts = sender.split(/\s+/)

  if (myParts.length > 0 && senderParts.length > 0) {
    const myFirst = myParts[0]
    const senderFirst = senderParts[0]

    // First names must match
    if (myFirst.length > 1 && myFirst === senderFirst) {
      // If both have last names, check those too
      if (myParts.length > 1 && senderParts.length > 1) {
        const myLast = myParts[myParts.length - 1]
        const senderLast = senderParts[senderParts.length - 1]
        // Last name or initial matches
        if (senderLast.startsWith(myLast[0]) || myLast.startsWith(senderLast[0])) {
          return true
        }
      }
      // Only first name available and it matches
      if (senderParts.length === 1 || myParts.length === 1) {
        return true
      }
    }
  }

  return false
}

/** Check if a sender name matches the conversation participant (the other person) */
function isParticipant(senderName: string, participantName: string): boolean {
  if (!senderName || !participantName) return false

  const sender = senderName.toLowerCase().trim()
  const participant = participantName.toLowerCase().trim()

  if (sender === participant) return true

  const pParts = participant.split(/\s+/)
  const sParts = sender.split(/\s+/)

  if (pParts.length > 0 && sParts.length > 0 && pParts[0].length > 1) {
    if (pParts[0] === sParts[0]) return true
  }

  return false
}

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

    // Avatar
    const avatarEl = item.querySelector('img.presence-entity__image') ||
      item.querySelector('.msg-facepile-grid--no-facepile img') ||
      item.querySelector('img.EntityPhoto-circle-3')
    const participantAvatar = (avatarEl as HTMLImageElement)?.src || undefined

    conversations.push({
      linkedinThreadId: threadId,
      participantName,
      participantAvatar,
      messages: [],
    })
  }

  return conversations
}

/** Get the participant name from the thread header (when viewing a conversation) */
function getThreadParticipantName(): string {
  const headerSelectors = [
    '.msg-overlay-bubble-header__title',
    '.msg-thread__link-to-profile',
    '.msg-entity-lockup__entity-title',
    'h2.msg-overlay-bubble-header__title',
    '.msg-s-message-list-container + .msg-thread h2',
  ]

  for (const sel of headerSelectors) {
    const el = document.querySelector(sel)
    if (el?.textContent?.trim()) {
      return el.textContent.trim()
    }
  }

  return ''
}

/** Determine message direction using multiple strategies */
function determineDirection(senderName: string, participantName: string): 'inbound' | 'outbound' {
  // Strategy 1: If we know the logged-in user's name, check against it
  if (myName && isMe(senderName)) {
    return 'outbound'
  }

  // Strategy 2: If we know the participant (other person), messages from them are inbound
  if (participantName && isParticipant(senderName, participantName)) {
    return 'inbound'
  }

  // Strategy 3: If we have myName but sender didn't match me, it's likely inbound
  if (myName) {
    return 'inbound'
  }

  // Strategy 4: If we have participantName but sender didn't match them, it's likely outbound
  if (participantName) {
    return 'outbound'
  }

  // Default: can't determine, assume inbound
  return 'inbound'
}

/** Scrape messages from the currently open conversation thread */
function scrapeCurrentThread(): { threadId: string; participantName: string; messages: LinkedInMessageSync[] } | null {
  // Get thread ID from URL
  const urlMatch = window.location.pathname.match(/\/messaging\/thread\/([^/]+)/)
  if (!urlMatch) return null

  const threadId = urlMatch[1]
  const messages: LinkedInMessageSync[] = []

  // Get the participant name from the thread header
  const participantName = getThreadParticipantName()

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

  if (!msgItems || msgItems.length === 0) return { threadId, participantName, messages }

  // Track the last known sender for messages in the same group
  let lastSenderName = ''
  let lastDirection: 'inbound' | 'outbound' = 'inbound'
  let messageIndex = 0

  for (const msgEl of msgItems) {
    // Message body
    const bodyEl =
      msgEl.querySelector('.msg-s-event-listitem__body') ||
      msgEl.querySelector('.msg-s-event__content p') ||
      msgEl.querySelector('.msg-s-message-group__message-body')
    const body = bodyEl?.textContent?.trim() || ''
    if (!body) continue

    // Sender name — LinkedIn groups consecutive messages from the same sender,
    // so the sender name might only appear on the first message in the group
    const senderEl =
      msgEl.querySelector('.msg-s-message-group__name') ||
      msgEl.querySelector('.msg-s-event-listitem__header .t-bold') ||
      msgEl.querySelector('.msg-s-message-group__profile-link')
    let senderName = senderEl?.textContent?.trim() || ''

    // If no sender name on this message, it's part of the same group as the previous
    if (senderName) {
      lastSenderName = senderName
      lastDirection = determineDirection(senderName, participantName)
    } else {
      senderName = lastSenderName
    }

    const direction = lastDirection

    // Timestamp — walk up to find the nearest time element (LinkedIn puts timestamps
    // on message groups, not individual messages)
    let sentAt = ''
    const timeEl =
      msgEl.querySelector('time') ||
      msgEl.querySelector('.msg-s-message-group__timestamp') ||
      msgEl.querySelector('.msg-s-event-listitem__timestamp')
    if (timeEl) {
      sentAt = timeEl.getAttribute('datetime') || ''
    }
    // Walk up to parent group to find timestamp if not on this element
    if (!sentAt) {
      const parentGroup = msgEl.closest('.msg-s-message-group') || msgEl.parentElement
      const groupTime = parentGroup?.querySelector('time')
      if (groupTime) {
        sentAt = groupTime.getAttribute('datetime') || ''
      }
    }
    // Use message index as a stable fallback (not current time, to avoid duplicates)
    if (!sentAt) {
      sentAt = `unknown-${messageIndex}`
    }
    messageIndex++

    // Generate a stable message ID from content that doesn't change between syncs
    // Exclude timestamp since it may not be scrapeable — use body + sender + position
    const linkedinMsgId = hashString(`${threadId}_${senderName}_${body.substring(0, 80)}_${messageIndex}`)

    messages.push({
      linkedinMsgId,
      direction,
      body,
      senderName,
      sentAt,
    })
  }

  return { threadId, participantName, messages }
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
    // Wait for navigation and page load
    await new Promise(resolve => setTimeout(resolve, 4000))
  }

  // Find the message input — try multiple selectors
  const inputSelectors = [
    '.msg-form__contenteditable[contenteditable="true"]',
    '.msg-form__msg-content-container .msg-form__contenteditable',
    'div[role="textbox"][contenteditable="true"]',
    '.msg-form__placeholder + div[contenteditable="true"]',
    '.msg-form__contenteditable',
  ]

  let inputEl: HTMLElement | null = null
  // Retry a few times since the DOM may still be loading
  for (let retry = 0; retry < 3; retry++) {
    for (const sel of inputSelectors) {
      inputEl = document.querySelector(sel) as HTMLElement | null
      if (inputEl) break
    }
    if (inputEl) break
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  if (!inputEl) {
    console.error('[BR Messaging] Could not find message input')
    return false
  }

  // Focus the input
  inputEl.focus()

  // Clear existing content
  inputEl.innerHTML = ''

  // Use execCommand for React-compatible input (simulates real typing)
  document.execCommand('insertText', false, body)

  // Also dispatch events LinkedIn might listen to
  inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, data: body, inputType: 'insertText' }))

  // Wait for LinkedIn to process
  await new Promise(resolve => setTimeout(resolve, 800))

  // Click send button
  const sendSelectors = [
    '.msg-form__send-button',
    'button.msg-form__send-btn',
    'button[type="submit"].msg-form__send-button',
    '.msg-form__send-toggle button',
    'button[data-control-name="send"]',
  ]

  let sendBtn: HTMLButtonElement | null = null
  for (const sel of sendSelectors) {
    sendBtn = document.querySelector(sel) as HTMLButtonElement | null
    if (sendBtn && !sendBtn.disabled) break
    sendBtn = null
  }

  if (!sendBtn) {
    console.error('[BR Messaging] Could not find send button')
    return false
  }

  sendBtn.click()

  // Wait for the message to be sent
  await new Promise(resolve => setTimeout(resolve, 1500))

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
        // Thread is open but not in sidebar list — add it
        conversations.push({
          linkedinThreadId: currentThread.threadId,
          participantName: currentThread.participantName,
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

async function init() {
  // Only run on messaging pages
  if (!window.location.pathname.startsWith('/messaging')) return

  console.log('[BR Messaging] Content script loaded')

  // Fetch the logged-in user's name for direction detection
  await fetchMyName()
  console.log('[BR Messaging] Logged-in user:', myName || '(unknown)')

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
