import type {
  LinkedInScrapedData,
  RevealResponse,
  RevealData,
  MatchedAccount,
  ExistingProspect,
  SequenceSummary,
  SaveProspectPayload,
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
    // Try the inline "Current company" button in the top card
    const companyButton = document.querySelector(
      'button[aria-label*="Current company"] span'
    )
    company = companyButton?.textContent?.trim() || ''
  }
  if (!company) {
    // Fallback: first experience item
    const expCompany = document.querySelector(
      '#experience ~ .pvs-list__outer-container .t-bold span[aria-hidden="true"]'
    ) || document.querySelector(
      'section.experience .pv-entity__company-summary-info h3 span:nth-child(2)'
    )
    company = expCompany?.textContent?.trim() || ''
  }

  // LinkedIn URL
  const linkedinUrl = window.location.href.split('?')[0]

  return { name, title, company, linkedinUrl }
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
    <div class="br-panel">
      <div class="br-header">
        <span class="br-logo">BR</span>
        <span class="br-title">Boilerroom</span>
        <button class="br-close" id="br-close">&times;</button>
      </div>
      <div class="br-body" id="br-body">
        <button class="br-btn br-btn-primary br-reveal-btn" id="br-reveal">
          Reveal Contact
        </button>
      </div>
    </div>
  `
  document.body.appendChild(panelRoot)

  // Close button
  panelRoot.querySelector('#br-close')!.addEventListener('click', () => {
    panelRoot!.style.display = 'none'
  })

  // Reveal button
  panelRoot.querySelector('#br-reveal')!.addEventListener('click', handleReveal)

  return panelRoot
}

async function handleReveal() {
  const body = document.getElementById('br-body')!
  const revealBtn = document.getElementById('br-reveal') as HTMLButtonElement

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
      document.getElementById('br-reveal')!.addEventListener('click', handleReveal)
      return
    }
  } catch {
    // Continue anyway — the API call will fail with 401 if truly unauthenticated
  }

  // Show loading state
  revealBtn.disabled = true
  revealBtn.textContent = 'Revealing...'

  const scrapedData = scrapeProfileData()

  try {
    const result = await sendMessage<RevealResponse>({
      type: 'REVEAL_CONTACT',
      data: scrapedData,
    })
    renderRevealResult(result)
  } catch (err: any) {
    body.innerHTML = `
      <div class="br-message br-message-error">
        ${err.message || 'Failed to reveal contact'}
      </div>
      <button class="br-btn br-btn-primary br-reveal-btn" id="br-reveal">
        Try Again
      </button>
    `
    document.getElementById('br-reveal')!.addEventListener('click', handleReveal)
  }
}

function renderRevealResult(result: RevealResponse) {
  const body = document.getElementById('br-body')!
  const reveal = result.revealData
  const account = result.matchedAccount
  const existing = result.existingProspect
  const sequences = result.sequences

  let html = ''

  // Contact info
  if (reveal) {
    html += `<div class="br-section">`
    html += `<div class="br-contact-name">${escHtml(reveal.name || result.scrapedData.name)}</div>`
    if (reveal.title) html += `<div class="br-contact-detail">${escHtml(reveal.title)}</div>`
    if (reveal.company) html += `<div class="br-contact-detail">${escHtml(reveal.company)}</div>`

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
  }

  html += `</div>`
  body.innerHTML = html

  // --- Wire up event handlers ---

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
}

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

function getAppUrl(): string {
  // Check if we're in dev (extension loaded unpacked)
  const manifest = chrome.runtime.getManifest()
  return manifest.update_url ? 'https://app.boilerroom.ai' : 'http://localhost:3000'
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
