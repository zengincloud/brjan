import type {
  LinkedInConversationSync,
  LinkedInMessageSync,
  PendingMessage,
  LinkedinTemplate,
  LinkedinTemplatesResponse,
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
    // Sales Navigator selectors
    '.conversation-header__profile-name',
    '.message-overlay__header-profile-name',
    '.thread-header__lead-name',
    '[data-test-thread-header] .artdeco-entity-lockup__title',
    '.artdeco-entity-lockup__title a',
    '.profile-topcard-person-entity__name',
    // Sales Nav compose form recipient
    '[class*="_recipient"] [class*="_name"]',
    '[class*="_compose-header"] [class*="_name"]',
    '[class*="_recipient-name"]',
    // Sales Nav lead profile name (when messaging from lead page)
    '.profile-topcard h1',
    '.top-card-layout__title',
    '[data-anonymize="person-name"]',
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

async function navigateToThread(threadId: string): Promise<boolean> {
  // Already on this thread?
  if (window.location.pathname.includes(`/messaging/thread/${threadId}`)) {
    return true
  }

  // Strategy 1: Click the conversation in the sidebar (SPA-safe, no page reload)
  const convLinks = document.querySelectorAll('a[href*="/messaging/thread/"]')
  for (const link of convLinks) {
    if ((link as HTMLAnchorElement).href?.includes(`/messaging/thread/${threadId}`)) {
      ;(link as HTMLElement).click()
      // Wait for SPA navigation and DOM update
      await new Promise(resolve => setTimeout(resolve, 2000))
      return true
    }
  }

  // Strategy 2: Use history.pushState + popstate to trigger SPA navigation
  // (LinkedIn's React Router listens for popstate events)
  try {
    const targetUrl = `/messaging/thread/${threadId}/`
    window.history.pushState({}, '', targetUrl)
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }))
    await new Promise(resolve => setTimeout(resolve, 2500))

    // Verify we navigated successfully by checking if message input appeared
    const input = document.querySelector('.msg-form__contenteditable, div[role="textbox"]')
    if (input) return true
  } catch {}

  // Strategy 3: Last resort — skip this message. Don't navigate away as it kills the script.
  console.warn(`[BR Messaging] Cannot navigate to thread ${threadId} — skipping for now`)
  return false
}

async function sendLinkedInMessage(threadId: string, body: string): Promise<boolean> {
  // Navigate to the thread within the SPA (no full page reload)
  const navigated = await navigateToThread(threadId)
  if (!navigated) {
    return false
  }

  // Find the message input — try multiple selectors with retries
  const inputSelectors = [
    '.msg-form__contenteditable[contenteditable="true"]',
    '.msg-form__msg-content-container .msg-form__contenteditable',
    'div[role="textbox"][contenteditable="true"]',
    '.msg-form__placeholder + div[contenteditable="true"]',
    '.msg-form__contenteditable',
    '.msg-form div[contenteditable]',
    'form.msg-form div[contenteditable]',
  ]

  let inputEl: HTMLElement | null = null
  for (let retry = 0; retry < 5; retry++) {
    for (const sel of inputSelectors) {
      inputEl = document.querySelector(sel) as HTMLElement | null
      if (inputEl) break
    }
    if (inputEl) break
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  if (!inputEl) {
    console.error('[BR Messaging] Could not find message input after 5 retries')
    return false
  }

  // Focus the input
  inputEl.focus()
  await new Promise(resolve => setTimeout(resolve, 200))

  // Clear existing content
  const sel = window.getSelection()
  if (sel) {
    sel.selectAllChildren(inputEl)
    sel.deleteFromDocument()
  }

  // Use execCommand for React-compatible input (simulates real typing)
  document.execCommand('insertText', false, body)

  // Also dispatch events LinkedIn might listen to
  inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, data: body, inputType: 'insertText' }))
  inputEl.dispatchEvent(new Event('change', { bubbles: true }))

  // Wait for LinkedIn to process and enable the send button
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Click send button — try multiple selectors
  const sendSelectors = [
    '.msg-form__send-button',
    'button.msg-form__send-btn',
    'button[type="submit"].msg-form__send-button',
    '.msg-form__send-toggle button',
    'button[data-control-name="send"]',
    'form.msg-form button[type="submit"]',
    '.msg-form button.artdeco-button--primary',
  ]

  let sendBtn: HTMLButtonElement | null = null
  // Retry finding the send button (it may take a moment to become enabled)
  for (let retry = 0; retry < 3; retry++) {
    for (const sel of sendSelectors) {
      sendBtn = document.querySelector(sel) as HTMLButtonElement | null
      if (sendBtn && !sendBtn.disabled) break
      sendBtn = null
    }
    if (sendBtn) break
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  if (!sendBtn) {
    console.error('[BR Messaging] Could not find enabled send button')
    return false
  }

  sendBtn.click()
  console.log('[BR Messaging] Clicked send button')

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
      console.log(`[BR Messaging] Attempting to send message ${msg.id} to thread ${msg.linkedinThreadId}`)
      const success = await sendLinkedInMessage(msg.linkedinThreadId, msg.body)

      // Report result back — but only if we actually attempted (navigated to thread)
      // If navigation failed, we don't report so the message stays "sending" and
      // gets recovered to "pending" after the 2-min timeout
      try {
        await sendMessage({
          type: 'REPORT_PENDING_RESULT',
          data: {
            messageId: msg.id,
            success,
            errorMessage: success ? undefined : 'Failed to send via LinkedIn DOM',
          },
        })
        console.log(`[BR Messaging] Reported result for ${msg.id}: ${success ? 'sent' : 'failed'}`)
      } catch (err) {
        console.error(`[BR Messaging] Failed to report result for ${msg.id}:`, err)
      }

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

// ——— LinkedIn DM Templates ———

// Template variable substitution (ported from lib/template-variables.ts)
function replaceTemplateVariables(
  text: string,
  prospect: { name: string; email?: string | null; company?: string | null; title?: string | null; phone?: string | null } | null
): string {
  if (!text || !prospect) return text
  const firstName = prospect.name?.split(' ')[0] || ''
  const lastName = prospect.name?.split(' ').slice(1).join(' ') || ''
  return text
    .replace(/\{\{name\}\}/gi, prospect.name || '')
    .replace(/\{\{firstName\}\}/gi, firstName)
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{lastName\}\}/gi, lastName)
    .replace(/\{\{last_name\}\}/gi, lastName)
    .replace(/\{\{email\}\}/gi, prospect.email || '')
    .replace(/\{\{company\}\}/gi, prospect.company || '')
    .replace(/\{\{title\}\}/gi, prospect.title || '')
    .replace(/\{\{phone\}\}/gi, prospect.phone || '')
}

// Template cache
let cachedTemplates: LinkedinTemplate[] | null = null
let cachedProspect: LinkedinTemplatesResponse['prospect'] = null
let templateCacheTime = 0
const TEMPLATE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

let templateButtonInjected = false
let lastInjectLog = 0

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function injectTemplateButton() {
  if (templateButtonInjected) return
  if (findElementAcrossFrames('br-template-btn')) {
    templateButtonInjected = true
    return
  }
  // Throttle debug logging to once per 5 seconds
  const now = Date.now()
  const shouldLog = now - lastInjectLog > 5000
  if (shouldLog) lastInjectLog = now

  // Find the message form area (regular LinkedIn + Sales Navigator)
  const formSelectors = [
    '.msg-form__left-actions',
    '.msg-form__footer',
    '.msg-form__msg-content-container',
    'form.msg-form',
    // Sales Navigator selectors
    '.compose-form__actions',
    '.compose-form__footer',
    '.message-overlay__compose',
    '.inbox-compose__form',
    '[data-test-message-compose]',
    '.message-compose-form',
  ]

  let formEl: Element | null = null
  for (const sel of formSelectors) {
    formEl = document.querySelector(sel)
    if (formEl) break
  }

  // Check for Sales Nav attach button first — most reliable anchor point
  const attachBtn = document.querySelector('button[aria-describedby*="msg-add-attachment"]') as HTMLElement | null

  // Fallback: find the textarea/contenteditable and use its parent form or container
  if (!formEl) {
    const textarea = document.querySelector('textarea[class*="_message-field"]') as HTMLElement | null
    // Match msg-form__contenteditable with or without contenteditable="true" (LinkedIn sets it dynamically)
    const contentEditable = document.querySelector('.msg-form__contenteditable') as HTMLElement | null
    // Broader fallback: any role="textbox" or contenteditable inside messaging overlays
    const anyEditable = document.querySelector(
      '.msg-overlay-conversation-bubble [role="textbox"], ' +
      '.msg-overlay-conversation-bubble [contenteditable], ' +
      'div[role="textbox"][aria-label*="message" i], ' +
      'div[role="textbox"][aria-label*="Write" i]'
    ) as HTMLElement | null
    const inputEl = textarea || contentEditable || anyEditable
    if (inputEl) {
      formEl = inputEl.closest('.msg-form__left-actions')
        || inputEl.closest('.msg-form__footer')
        || inputEl.closest('form')
        || inputEl.parentElement
    }
  }

  // If we have an attach button but no form, use the attach button's parent as anchor
  if (!formEl && attachBtn) {
    formEl = attachBtn.parentElement
  }

  // Check inside same-origin iframes (LinkedIn message popups use about:blank iframes)
  if (!formEl) {
    const iframes = document.querySelectorAll('iframe')
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument
        if (!iframeDoc) continue
        // Look for msg-form elements inside iframe
        const iframeForm = iframeDoc.querySelector('.msg-form__left-actions')
          || iframeDoc.querySelector('.msg-form__footer')
          || iframeDoc.querySelector('form.msg-form')
        if (iframeForm) {
          formEl = iframeForm
          break
        }
        const iframeEditable = iframeDoc.querySelector('.msg-form__contenteditable') as HTMLElement | null
        if (iframeEditable) {
          formEl = iframeEditable.closest('form') || iframeEditable.parentElement
          break
        }
      } catch {}
    }
  }

  if (!formEl) {
    if (shouldLog) {
      const editables = document.querySelectorAll('[contenteditable]')
      const msgForms = document.querySelectorAll('.msg-form__contenteditable')
      // Also check iframes
      let iframeEditables = 0
      document.querySelectorAll('iframe').forEach(iframe => {
        try { iframeEditables += iframe.contentDocument?.querySelectorAll('.msg-form__contenteditable')?.length || 0 } catch {}
      })
      console.log('[BR Templates] No form found. contenteditable:', editables.length, 'msg-form:', msgForms.length, 'iframe-msg-form:', iframeEditables)
    }
    return
  }
  // Use the form element's ownerDocument (may be inside an iframe)
  const targetDoc = formEl.ownerDocument || document
  console.log('[BR Templates] Form found:', formEl.tagName, formEl.className?.substring(0, 60), 'iframe:', targetDoc !== document)

  const btn = targetDoc.createElement('button')
  btn.id = 'br-template-btn'
  btn.type = 'button'
  btn.title = 'Insert DM template'
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`
  Object.assign(btn.style, {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 6px',
    color: '#666',
    borderRadius: '4px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s',
  })
  btn.addEventListener('mouseenter', () => { btn.style.color = '#4CD112' })
  btn.addEventListener('mouseleave', () => {
    if (!document.getElementById('br-template-dropdown')) btn.style.color = '#666'
  })
  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleTemplateDropdown()
  })

  // Insert into the toolbar
  if (attachBtn && attachBtn.parentElement) {
    // Sales Nav: Ember re-renders the form, so append to document.body
    // as a fixed overlay positioned near the attach button
    const wrapper = document.createElement('div')
    wrapper.id = 'br-template-wrapper'
    const rect = attachBtn.getBoundingClientRect()
    Object.assign(wrapper.style, {
      position: 'fixed',
      top: `${rect.top + 5}px`,
      left: `${rect.right + 5}px`,
      zIndex: '100000',
    })
    wrapper.appendChild(btn)
    document.body.appendChild(wrapper)

    // Reposition on scroll/resize
    let missingCount = 0
    const reposition = () => {
      if (!document.body.contains(wrapper)) return
      const r = attachBtn.getBoundingClientRect()
      if (r.width === 0) {
        missingCount++
        // Only remove after attach button is gone for 30+ frames (~500ms)
        if (missingCount > 30) {
          wrapper.remove()
          templateButtonInjected = false
          return
        }
      } else {
        missingCount = 0
        wrapper.style.top = `${r.top + 5}px`
        wrapper.style.left = `${r.right + 5}px`
      }
      requestAnimationFrame(reposition)
    }
    requestAnimationFrame(reposition)
    console.log('[BR Templates] Button injected as fixed overlay near attach button')
  } else if (formEl.classList.contains('msg-form__left-actions') || formEl.classList.contains('msg-form__footer')) {
    formEl.insertBefore(btn, formEl.firstChild)
  } else {
    // Wrap relative for dropdown positioning
    const wrapper = targetDoc.createElement('div')
    wrapper.id = 'br-template-wrapper'
    Object.assign(wrapper.style, { position: 'relative', display: 'inline-block' })
    wrapper.appendChild(btn)
    formEl.parentElement?.insertBefore(wrapper, formEl)
  }

  templateButtonInjected = true
}

/** Find an element by ID across main document and iframes */
function findElementAcrossFrames(id: string): HTMLElement | null {
  const el = document.getElementById(id)
  if (el) return el
  const iframes = document.querySelectorAll('iframe')
  for (const iframe of iframes) {
    try {
      const iframeEl = iframe.contentDocument?.getElementById(id)
      if (iframeEl) return iframeEl
    } catch {}
  }
  return null
}

function toggleTemplateDropdown() {
  const existing = findElementAcrossFrames('br-template-dropdown')
  if (existing) {
    existing.remove()
    const btn = findElementAcrossFrames('br-template-btn')
    if (btn) btn.style.color = '#666'
    return
  }
  showTemplateDropdown()
}

async function showTemplateDropdown() {
  const participantName = getThreadParticipantName()

  // Create dropdown
  const btn = findElementAcrossFrames('br-template-btn')
  const wrapper = findElementAcrossFrames('br-template-wrapper')
  const isFixedWrapper = wrapper?.style.position === 'fixed'

  const dropdownDoc = btn?.ownerDocument || document
  const dropdown = dropdownDoc.createElement('div')
  dropdown.id = 'br-template-dropdown'

  if (isFixedWrapper && btn) {
    // Sales Nav: dropdown as fixed overlay positioned relative to button
    const btnRect = btn.getBoundingClientRect()
    Object.assign(dropdown.style, {
      position: 'fixed',
      bottom: `${window.innerHeight - btnRect.top + 5}px`,
      left: `${btnRect.left}px`,
      width: '280px',
      maxHeight: '320px',
      overflowY: 'auto',
      background: '#121620',
      border: '1px solid #222833',
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: '100001',
      padding: '4px 0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px',
      color: '#f2f3f5',
    })
    document.body.appendChild(dropdown)
  } else {
    Object.assign(dropdown.style, {
      position: 'absolute',
      bottom: '100%',
      left: '0',
      width: '280px',
      maxHeight: '320px',
      overflowY: 'auto',
      background: '#121620',
      border: '1px solid #222833',
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: '100000',
      padding: '4px 0',
      marginBottom: '4px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px',
      color: '#f2f3f5',
    })
    const parent = wrapper || btn?.parentElement
    if (parent) {
      parent.style.position = 'relative'
      parent.appendChild(dropdown)
    } else {
      return
    }
  }

  // Loading state
  dropdown.innerHTML = `<div style="padding:12px;text-align:center;color:#808590;font-size:12px;">Loading templates...</div>`

  // Fetch templates
  const now = Date.now()
  const needsRefresh = !cachedTemplates || (now - templateCacheTime > TEMPLATE_CACHE_TTL)

  try {
    if (needsRefresh) {
      const result = await sendMessage<LinkedinTemplatesResponse>({
        type: 'GET_LINKEDIN_TEMPLATES',
        data: { participantName: participantName || undefined },
      })
      cachedTemplates = result.templates
      cachedProspect = result.prospect
      templateCacheTime = now
    }

    if (!cachedTemplates || cachedTemplates.length === 0) {
      dropdown.innerHTML = `<div style="padding:12px;text-align:center;color:#808590;font-size:12px;">No templates yet.<br>Create templates in the Boilerroom web app.</div>`
      setupDropdownClose(dropdown)
      return
    }

    // Render template list
    dropdown.innerHTML = ''
    const header = dropdownDoc.createElement('div')
    Object.assign(header.style, {
      padding: '8px 12px 4px',
      fontSize: '10px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: '#808590',
      fontWeight: '600',
    })
    header.textContent = 'LinkedIn Templates'
    dropdown.appendChild(header)

    for (const tmpl of cachedTemplates) {
      const item = dropdownDoc.createElement('button')
      item.type = 'button'
      Object.assign(item.style, {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '8px 12px',
        background: 'none',
        border: 'none',
        color: '#f2f3f5',
        cursor: 'pointer',
        fontSize: '13px',
        lineHeight: '1.4',
        transition: 'background 0.1s',
        fontFamily: 'inherit',
      })

      const preview = tmpl.body.substring(0, 60).replace(/\n/g, ' ')
      item.innerHTML = `
        <div style="font-weight:600;margin-bottom:2px;">${escapeHtml(tmpl.name)}</div>
        <div style="color:#808590;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(preview)}${tmpl.body.length > 60 ? '...' : ''}</div>
      `

      item.addEventListener('mouseenter', () => { item.style.background = '#1e2330' })
      item.addEventListener('mouseleave', () => { item.style.background = 'none' })
      item.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        insertTemplate(tmpl.body)
        dropdown.remove()
        const btnEl = findElementAcrossFrames('br-template-btn')
        if (btnEl) btnEl.style.color = '#666'
      })

      dropdown.appendChild(item)
    }

    setupDropdownClose(dropdown)
  } catch (err) {
    console.error('[BR Templates] Failed to load templates:', err)
    dropdown.innerHTML = `<div style="padding:12px;text-align:center;color:#ef4444;font-size:12px;">Failed to load templates</div>`
    setupDropdownClose(dropdown)
  }
}

function setupDropdownClose(dropdown: HTMLElement) {
  const btn = findElementAcrossFrames('br-template-btn')
  const closeHandler = (e: MouseEvent) => {
    if (!dropdown.contains(e.target as Node) && e.target !== btn && !btn?.contains(e.target as Node)) {
      dropdown.remove()
      if (btn) btn.style.color = '#666'
      document.removeEventListener('click', closeHandler)
    }
  }
  setTimeout(() => document.addEventListener('click', closeHandler), 0)
}

function insertTemplate(templateBody: string) {
  // Apply variable substitution
  const resolved = replaceTemplateVariables(templateBody, cachedProspect)

  // Find the message input (regular LinkedIn + Sales Navigator)
  const inputSelectors = [
    '.msg-form__contenteditable[contenteditable="true"]',
    '.msg-form__msg-content-container .msg-form__contenteditable',
    'div[role="textbox"][contenteditable="true"]',
    '.msg-form__contenteditable',
    '.msg-form div[contenteditable]',
    'form.msg-form div[contenteditable]',
    // Sales Navigator selectors
    '.compose-form__message-input [contenteditable="true"]',
    '.message-overlay [contenteditable="true"]',
    '.inbox-compose [contenteditable="true"]',
    '[data-test-message-input] [contenteditable="true"]',
    'textarea.compose-form__message-input',
    // Sales Navigator textarea
    'textarea[class*="_message-field"]',
    'textarea[name="message"]',
  ]

  let inputEl: HTMLElement | null = null
  // Search main document first
  for (const sel of inputSelectors) {
    inputEl = document.querySelector(sel) as HTMLElement | null
    if (inputEl) break
  }
  // Search iframes if not found in main document
  if (!inputEl) {
    const iframes = document.querySelectorAll('iframe')
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument
        if (!iframeDoc) continue
        for (const sel of inputSelectors) {
          inputEl = iframeDoc.querySelector(sel) as HTMLElement | null
          if (inputEl) break
        }
        if (inputEl) break
      } catch {}
    }
  }

  if (!inputEl) {
    console.error('[BR Templates] Could not find message input')
    return
  }

  // Focus the input
  inputEl.focus()

  const isTextarea = inputEl.tagName === 'TEXTAREA'

  if (isTextarea) {
    // Sales Nav textarea handling
    const ta = inputEl as HTMLTextAreaElement
    ta.value = resolved
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    ta.dispatchEvent(new Event('change', { bubbles: true }))
  } else {
    // Contenteditable handling (regular LinkedIn + Sales Nav overlays)

    // Remove LinkedIn's placeholder paragraph if present
    const placeholder = inputEl.querySelector('.msg-form__placeholder')
      || inputEl.querySelector('[data-placeholder]')
    if (placeholder) placeholder.remove()

    // Clear existing content
    const selection = window.getSelection()
    if (selection) {
      selection.selectAllChildren(inputEl)
      selection.deleteFromDocument()
    }

    // Simulate a paste event — this is the most reliable way to get
    // LinkedIn's React editor to register the content
    const dt = new DataTransfer()
    dt.setData('text/plain', resolved)
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    })
    const handled = !inputEl.dispatchEvent(pasteEvent)

    // If paste wasn't handled, fall back to execCommand
    if (!handled) {
      document.execCommand('insertText', false, resolved)
    }

    // Dispatch input event to ensure React state syncs
    inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, data: resolved, inputType: 'insertFromPaste' }))
  }
}

// ——— Initialization ———

const isMessagingPage = () => window.location.pathname.startsWith('/messaging')
const isSalesNavPage = () => window.location.pathname.startsWith('/sales')
const isProfilePage = () => window.location.pathname.startsWith('/in/')

async function initMessagingSync() {
  if (!isMessagingPage()) return

  // Fetch the logged-in user's name for direction detection
  if (!myName) {
    await fetchMyName()
  }

  sendMessage({ type: 'MESSAGING_TAB_READY' }).catch(() => {})

  setTimeout(() => {
    doSync()
    startMessageObserver()
  }, 3000)

  if (!syncInterval) syncInterval = setInterval(doSync, 30000)
  if (!pendingInterval) pendingInterval = setInterval(checkPendingMessages, 10000)
}

// Handle URL changes (LinkedIn SPA navigation)
let lastUrl = window.location.href
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href

    // Reset template button on any navigation
    templateButtonInjected = false
    cachedProspect = null
    templateCacheTime = 0

    if (isMessagingPage()) {
      if (messageObserver) {
        messageObserver.disconnect()
        messageObserver = null
      }
      initMessagingSync()
      setTimeout(() => injectTemplateButton(), 2000)
    } else if (isSalesNavPage() || isProfilePage()) {
      setTimeout(() => injectTemplateButton(), 2000)
    }
  }
})
urlObserver.observe(document.body, { childList: true, subtree: true })

// Watch for compose box appearing on ANY LinkedIn page (message popups, overlays, etc.)
const composeObserver = new MutationObserver((mutations) => {
  // If button was injected but is no longer in DOM, reset flag
  if (templateButtonInjected && !document.getElementById('br-template-btn')) {
    templateButtonInjected = false
  }

  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node instanceof HTMLElement) {
        const hasForm = node.querySelector?.('.msg-form__contenteditable, .msg-form__left-actions, .msg-form, [contenteditable="true"], textarea[class*="_message-field"], textarea[name="message"]')
        if (hasForm && !document.getElementById('br-template-btn')) {
          templateButtonInjected = false
          injectTemplateButton()
          return
        }
      }
    }
  }
  if (!templateButtonInjected) injectTemplateButton()
})
composeObserver.observe(document.body, { childList: true, subtree: true })

// Polling fallback — compose box may load lazily on any page type
setInterval(() => {
  if (templateButtonInjected || document.getElementById('br-template-btn')) return
  const hasInput = document.querySelector(
    'textarea[class*="_message-field"], textarea[name="message"], ' +
    '.msg-form__contenteditable, .msg-form__left-actions, ' +
    'form.msg-form, div[role="textbox"]'
  )
  if (hasInput) {
    injectTemplateButton()
  }
}, 2000)

// Listen for messages from service worker (e.g., to send a message)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SEND_LINKEDIN_MESSAGE') {
    sendLinkedInMessage(message.data.linkedinThreadId, message.data.body)
      .then((success) => sendResponse({ success }))
      .catch((err) => sendResponse({ success: false, error: err.message }))
    return true // async response
  }
})

// Initialize messaging sync if already on a messaging page
fetchMyName().then(() => {
  initMessagingSync()
  if (isMessagingPage() || isSalesNavPage() || isProfilePage()) {
    setTimeout(() => injectTemplateButton(), 3500)
  }
})
