import type {
  LinkedInScrapedData,
  RevealResponse,
  RevealData,
  MatchedAccount,
  ExistingProspect,
  SequenceSummary,
  SaveProspectPayload,
  AccountPovResponse,
} from '@shared/types'

// Import CSS for webpack to bundle it
import './linkedin.css'

/**
 * LinkedIn Content Script
 * Injects a floating "Reveal" panel on linkedin.com/in/* profile pages.
 */

// ——— DOM Scraping ———

function scrapeProfileData(): LinkedInScrapedData {
  // Name: primary heading on profile
  const nameEl =
    document.querySelector('h1.text-heading-xlarge') ||
    document.querySelector('h1.inline.t-24') ||
    document.querySelector('.pv-top-card--list li') ||
    document.querySelector('h1')
  const name = nameEl?.textContent?.trim() || ''

  // Headline / Title
  const headlineEl =
    document.querySelector('div.text-body-medium.break-words') ||
    document.querySelector('.pv-top-card--list + .mt1 .text-body-medium') ||
    document.querySelector('.ph5 .text-body-medium')
  const title = headlineEl?.textContent?.trim() || ''

  // Company — from the experience section's first entry, or from the top card
  let company = ''
  const topCardCompany = document.querySelector(
    '.pv-top-card--experience-list-item .pv-entity__secondary-title'
  )
  if (topCardCompany) {
    company = topCardCompany.textContent?.trim() || ''
  }
  if (!company) {
    const companyButton = document.querySelector(
      'button[aria-label*="Current company"] span'
    )
    company = companyButton?.textContent?.trim() || ''
  }
  if (!company) {
    const expCompany = document.querySelector(
      '#experience ~ .pvs-list__outer-container .t-bold span[aria-hidden="true"]'
    ) || document.querySelector(
      'section.experience .pv-entity__company-summary-info h3 span:nth-child(2)'
    )
    company = expCompany?.textContent?.trim() || ''
  }

  // LinkedIn URL
  const linkedinUrl = window.location.href.split('?')[0]

  // Profile picture
  let profilePictureUrl: string | undefined
  const profileImgSelectors = [
    'img.pv-top-card-profile-picture__image--show',
    '.pv-top-card--photo img',
    'button[aria-label*="photo"] img',
    '.pv-top-card__photo-wrapper img',
    'img.presence-entity__image',
    '.pv-top-card-profile-picture img',
  ]
  for (const selector of profileImgSelectors) {
    const img = document.querySelector(selector) as HTMLImageElement | null
    if (img?.src && !img.src.includes('ghost') && !img.src.includes('default')) {
      profilePictureUrl = img.src
      break
    }
  }

  return { name, title, company, linkedinUrl, profilePictureUrl }
}

// ——— Send message to background service worker ———

function sendMessage<T = any>(message: any): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (response?.error) {
        reject(new Error(response.error))
        return
      }
      resolve(response)
    })
  })
}

// ——— Panel UI ———

let panelRoot: HTMLDivElement | null = null

function getOrCreatePanel(): HTMLDivElement {
  if (panelRoot) return panelRoot

  panelRoot = document.createElement('div')
  panelRoot.id = 'boilerroom-panel'
  panelRoot.innerHTML = `
    <div class="br-panel" id="br-panel-expanded">
      <div class="br-header">
        <span class="br-logo">BR</span>
        <span class="br-title">Boilerroom</span>
        <button class="br-minimize" id="br-minimize" title="Minimize">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
      <div class="br-user-greeting" id="br-user-greeting" style="display:none;"></div>
      <div class="br-body" id="br-body">
        <div class="br-loading">
          <div class="br-spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
    </div>
    <button class="br-fab" id="br-fab" title="Open Boilerroom">
      <span class="br-fab-logo">BR</span>
    </button>
  `
  document.body.appendChild(panelRoot)

  const expandedPanel = panelRoot.querySelector('#br-panel-expanded') as HTMLElement
  const fab = panelRoot.querySelector('#br-fab') as HTMLElement

  // Start minimized, panel hidden
  expandedPanel.style.display = 'none'

  // Minimize button — collapse panel to small icon
  panelRoot.querySelector('#br-minimize')!.addEventListener('click', () => {
    expandedPanel.style.display = 'none'
    fab.style.display = 'flex'
  })

  // FAB — expand panel back
  fab.addEventListener('click', () => {
    fab.style.display = 'none'
    expandedPanel.style.display = ''
  })

  // Fetch user name for greeting
  sendMessage<{ authenticated: boolean; user?: { name?: string; email: string } }>(
    { type: 'GET_AUTH_STATE' }
  ).then((response) => {
    if (response?.authenticated && response.user) {
      const greeting = document.getElementById('br-user-greeting')
      if (greeting) {
        const displayName = response.user.name || response.user.email.split('@')[0]
        greeting.textContent = `Hi, ${displayName}`
        greeting.style.display = ''
      }
    }
  }).catch(() => { /* silent fail */ })

  // Check cache, then render
  checkCacheAndRender()

  return panelRoot
}

// ——— Cache-first reveal flow ———

async function checkCacheAndRender() {
  const body = document.getElementById('br-body')
  if (!body) return

  const linkedinUrl = window.location.href.split('?')[0]
  try {
    const cached = await sendMessage<(RevealResponse & { cachedAt?: number }) | null>({
      type: 'GET_CACHED_REVEAL',
      data: { linkedinUrl },
    })
    if (cached) {
      // Re-scrape profile picture (LinkedIn CDN URLs may expire)
      const freshPic = scrapeProfileData().profilePictureUrl
      if (freshPic) {
        cached.scrapedData.profilePictureUrl = freshPic
      }
      renderRevealResult(cached, true)
      return
    }
  } catch {
    // Cache miss or error
  }

  // No cache — show the reveal button
  body.innerHTML = `
    <button class="br-btn br-btn-primary br-reveal-btn" id="br-reveal">
      Reveal Contact
    </button>
  `
  document.getElementById('br-reveal')!.addEventListener('click', () => handleReveal())
}

async function handleReveal(forceRefresh = false) {
  const body = document.getElementById('br-body')!

  // Check auth first
  try {
    const authCheck = await sendMessage<{ authenticated: boolean }>({ type: 'GET_AUTH_STATE' })
    if (!authCheck.authenticated) {
      body.innerHTML = `
        <div class="br-message br-message-warn">
          Not logged in. Open the Boilerroom extension popup to sign in.
        </div>
        <button class="br-btn br-btn-primary br-reveal-btn" id="br-reveal">
          Reveal Contact
        </button>
      `
      document.getElementById('br-reveal')!.addEventListener('click', () => handleReveal())
      return
    }
  } catch {
    // Continue anyway
  }

  // Show loading
  body.innerHTML = `
    <div class="br-loading">
      <div class="br-spinner"></div>
      <span>Revealing...</span>
    </div>
  `

  const scrapedData = scrapeProfileData()

  try {
    const result = await sendMessage<RevealResponse>({
      type: 'REVEAL_CONTACT',
      data: scrapedData,
    })

    // Attach locally-scraped profile picture
    result.scrapedData.profilePictureUrl = scrapedData.profilePictureUrl

    // Cache the result
    sendMessage({
      type: 'CACHE_REVEAL',
      data: { linkedinUrl: scrapedData.linkedinUrl, result },
    }).catch(() => { /* silent cache fail */ })

    renderRevealResult(result, false)
  } catch (err: any) {
    body.innerHTML = `
      <div class="br-message br-message-error">
        ${err.message || 'Failed to reveal contact'}
      </div>
      <button class="br-btn br-btn-primary br-reveal-btn" id="br-reveal">
        Try Again
      </button>
    `
    document.getElementById('br-reveal')!.addEventListener('click', () => handleReveal())
  }
}

// ——— Render reveal result ———

function renderRevealResult(result: RevealResponse, fromCache: boolean) {
  const body = document.getElementById('br-body')!
  const reveal = result.revealData
  const account = result.matchedAccount
  const existing = result.existingProspect
  const sequences = result.sequences

  let html = ''

  // Cached result notice with refresh button
  if (fromCache) {
    html += `<div class="br-cache-notice">
      <span class="br-cache-label">Cached result</span>
      <button class="br-btn br-btn-secondary br-btn-sm" id="br-refresh-reveal">Refresh</button>
    </div>`
  }

  // Contact info
  if (reveal) {
    html += `<div class="br-section">`

    // Profile picture + name
    const picUrl = result.scrapedData?.profilePictureUrl
    if (picUrl) {
      html += `<div class="br-profile-pic-row">
        <img class="br-profile-pic" src="${escHtml(picUrl)}" alt="" />
        <div>
          <div class="br-contact-name">${escHtml(reveal.name || result.scrapedData.name)}</div>
          ${reveal.title ? `<div class="br-contact-detail">${escHtml(reveal.title)}</div>` : ''}
          ${reveal.company ? `<div class="br-contact-detail">${escHtml(reveal.company)}</div>` : ''}
        </div>
      </div>`
    } else {
      html += `<div class="br-contact-name">${escHtml(reveal.name || result.scrapedData.name)}</div>`
      if (reveal.title) html += `<div class="br-contact-detail">${escHtml(reveal.title)}</div>`
      if (reveal.company) html += `<div class="br-contact-detail">${escHtml(reveal.company)}</div>`
    }

    if (reveal.email) {
      html += `<div class="br-field">
        <span class="br-label">Email</span>
        <a href="mailto:${escHtml(reveal.email)}" class="br-value br-link">${escHtml(reveal.email)}</a>
        <span class="br-badge ${reveal.emailStatus === 'verified' ? 'br-badge-green' : 'br-badge-gray'}">${escHtml(reveal.emailStatus || 'unknown')}</span>
      </div>`
    }
    if (reveal.phone) {
      html += `<div class="br-field">
        <span class="br-label">Phone</span>
        <span class="br-value">${escHtml(reveal.phone)}</span>
      </div>`
    }
    html += `</div>`
  } else {
    html += `<div class="br-message br-message-warn">No contact data found for this profile.</div>`
  }

  // Account match
  if (account) {
    const appUrl = getAppUrl()
    html += `<div class="br-section">
      <div class="br-field">
        <span class="br-label">Linked Account</span>
        <a href="${appUrl}/accounts/${account.id}" target="_blank" class="br-value br-link">${escHtml(account.name)}</a>
      </div>
    </div>`
  }

  // POV placeholder (loads async)
  if (account) {
    html += `<div class="br-section" id="br-pov-section">
      <div class="br-pov-loading">
        <div class="br-spinner-sm"></div>
        <span>Loading company brief...</span>
      </div>
    </div>`
  }

  // Existing prospect notice
  if (existing) {
    html += `<div class="br-message br-message-info">
      Already in CRM as "${escHtml(existing.name)}" (${escHtml(existing.status.replace(/_/g, ' '))})
    </div>`
  }

  // Action buttons
  html += `<div class="br-actions">`

  if (!existing) {
    html += `<button class="br-btn br-btn-primary" id="br-save-prospect">Save as Prospect</button>`
  }

  if (sequences.length > 0) {
    html += `
      <div class="br-sequence-picker">
        <select class="br-select" id="br-sequence-select">
          <option value="">Add to Sequence...</option>
          ${sequences.map((s) => `<option value="${s.id}">${escHtml(s.name)} (${s.prospectCount})</option>`).join('')}
        </select>
        <button class="br-btn br-btn-secondary" id="br-add-sequence" disabled>Add</button>
      </div>
    `
  } else {
    const appUrl = getAppUrl()
    html += `
      <div class="br-sequence-empty">
        No sequences yet — <a href="${appUrl}/sequences" target="_blank" class="br-link">create one in Boilerroom</a>
      </div>
    `
  }

  html += `</div>`
  body.innerHTML = html

  // --- Wire up event handlers ---

  // Refresh button
  const refreshBtn = document.getElementById('br-refresh-reveal')
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => handleReveal(true))
  }

  // Save as Prospect
  const saveBtn = document.getElementById('br-save-prospect')
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      saveBtn.textContent = 'Saving...'
      ;(saveBtn as HTMLButtonElement).disabled = true

      const payload: SaveProspectPayload = {
        name: reveal?.name || result.scrapedData.name,
        email: reveal?.email || null,
        title: reveal?.title || result.scrapedData.title || null,
        company: reveal?.company || result.scrapedData.company || null,
        phone: reveal?.phone || null,
        location: reveal?.location || null,
        linkedin: result.scrapedData.linkedinUrl,
        wizaData: reveal ? {
          email: reveal.email,
          emailType: reveal.emailType,
          emailStatus: reveal.emailStatus,
          emails: reveal.emails,
          phone: reveal.phone,
          phoneStatus: reveal.phoneStatus,
          phones: reveal.phones,
          companySize: reveal.companySize,
          companySizeRange: reveal.companySizeRange,
          companyIndustry: reveal.companyIndustry,
          companyDomain: reveal.companyDomain,
          companyFounded: reveal.companyFounded,
          companyRevenue: reveal.companyRevenue,
          companyDescription: reveal.companyDescription,
        } : null,
      }

      try {
        const resp = await sendMessage<{ prospect: { id: string; name: string } }>({
          type: 'SAVE_PROSPECT',
          data: payload,
        })
        saveBtn.textContent = 'Saved!'
        saveBtn.classList.add('br-btn-success')

        // Enable sequence picker now that we have a prospect ID
        enableSequencePicker(resp.prospect.id)
      } catch (err: any) {
        saveBtn.textContent = err.message?.includes('already exists') ? 'Already Exists' : 'Failed'
        saveBtn.classList.add('br-btn-error')
      }
    })
  }

  // Sequence picker
  const seqSelect = document.getElementById('br-sequence-select') as HTMLSelectElement | null
  const seqBtn = document.getElementById('br-add-sequence') as HTMLButtonElement | null
  if (seqSelect && seqBtn) {
    seqSelect.addEventListener('change', () => {
      seqBtn.disabled = !seqSelect.value
    })

    // If prospect already exists, enable immediately
    if (existing) {
      enableSequencePicker(existing.id)
    }
  }

  // Fetch POV if account matched
  if (account) {
    fetchAndRenderPov(account.id)
  }
}

// ——— POV section ———

async function fetchAndRenderPov(accountId: string) {
  const povSection = document.getElementById('br-pov-section')
  if (!povSection) return

  try {
    const response = await sendMessage<AccountPovResponse>({
      type: 'FETCH_ACCOUNT_POV',
      data: { accountId },
    })

    if (!response?.pov) {
      povSection.innerHTML = `
        <div class="br-pov-empty">No company brief available yet.</div>
      `
      return
    }

    const pov = response.pov
    let povHtml = `<div class="br-pov-header">Company Brief</div>`

    if (pov.companyIntel) {
      povHtml += `<div class="br-pov-block">
        <div class="br-pov-block-title">Company Intel</div>
        <div class="br-pov-text">${escHtml(pov.companyIntel)}</div>
      </div>`
    }

    if (pov.engagementStrategy) {
      povHtml += `<div class="br-pov-block">
        <div class="br-pov-block-title">Engagement Strategy</div>
        <div class="br-pov-text">${escHtml(pov.engagementStrategy)}</div>
      </div>`
    }

    povSection.innerHTML = povHtml
  } catch {
    povSection.innerHTML = `
      <div class="br-pov-empty">Could not load company brief.</div>
    `
  }
}

// ——— Sequence picker ———

function enableSequencePicker(prospectId: string) {
  const seqBtn = document.getElementById('br-add-sequence') as HTMLButtonElement | null
  const seqSelect = document.getElementById('br-sequence-select') as HTMLSelectElement | null
  if (!seqBtn || !seqSelect) return

  seqBtn.addEventListener('click', async () => {
    const sequenceId = seqSelect.value
    if (!sequenceId) return

    seqBtn.textContent = 'Adding...'
    seqBtn.disabled = true

    try {
      const resp = await sendMessage<{ sequenceName: string }>({
        type: 'ADD_TO_SEQUENCE',
        data: { prospectId, sequenceId },
      })
      seqBtn.textContent = `Added to ${resp.sequenceName}`
      seqBtn.classList.add('br-btn-success')
      seqSelect.disabled = true
    } catch (err: any) {
      seqBtn.textContent = 'Failed'
      seqBtn.classList.add('br-btn-error')
    }
  })
}

// ——— Helpers ———

function getAppUrl(): string {
  return 'https://app.boilerroom.ai'
}

function escHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// ——— Initialization ———

function init() {
  // Only inject on profile pages
  if (!window.location.pathname.startsWith('/in/')) return

  // Wait for profile to load, then show panel
  const observer = new MutationObserver(() => {
    const nameEl = document.querySelector('h1.text-heading-xlarge') || document.querySelector('h1')
    if (nameEl?.textContent?.trim()) {
      observer.disconnect()
      getOrCreatePanel()
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })

  // Fallback: if profile already loaded
  setTimeout(() => {
    observer.disconnect()
    getOrCreatePanel()
  }, 3000)
}

// LinkedIn uses client-side navigation — re-init on URL changes
let lastUrl = window.location.href
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href
    // Remove old panel
    if (panelRoot) {
      panelRoot.remove()
      panelRoot = null
    }
    if (window.location.pathname.startsWith('/in/')) {
      init()
    }
  }
})
urlObserver.observe(document.body, { childList: true, subtree: true })

init()
