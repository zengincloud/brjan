import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { getGmailIntegration, refreshAccessToken as refreshGmail } from "@/lib/gmail/oauth"
import { getGcalIntegration, refreshAccessToken as refreshGcal } from "@/lib/gcal/oauth"
import { getHubspotIntegration, getValidAccessToken as refreshHubspot } from "@/lib/hubspot/oauth"
import { getSalesforceIntegration, getValidAccessToken as refreshSalesforce } from "@/lib/salesforce/oauth"

export const dynamic = "force-dynamic"

async function getGmailStatus(userId: string) {
  try {
    const integration = await getGmailIntegration(userId)
    if (!integration) return { connected: false, integration: null }
    let tokenValid = integration.tokenExpiresAt > new Date()
    if (!tokenValid && integration.isActive) tokenValid = !!(await refreshGmail(userId))
    const updated = await getGmailIntegration(userId)
    return {
      connected: !!updated,
      integration: updated ? { email: updated.gmailEmail, isActive: updated.isActive, connectedAt: updated.createdAt, tokenValid: updated.isActive && tokenValid } : null,
    }
  } catch { return { connected: false, integration: null } }
}

async function getGcalStatus(userId: string) {
  try {
    const integration = await getGcalIntegration(userId)
    if (!integration) return { connected: false, integration: null }
    let tokenValid = integration.tokenExpiresAt > new Date()
    if (!tokenValid && integration.isActive) tokenValid = !!(await refreshGcal(userId))
    const updated = await getGcalIntegration(userId)
    return {
      connected: !!updated,
      integration: updated ? { email: updated.calendarEmail, isActive: updated.isActive, connectedAt: updated.createdAt, tokenValid: updated.isActive && tokenValid } : null,
    }
  } catch { return { connected: false, integration: null } }
}

async function getHubspotStatus(userId: string) {
  try {
    const integration = await getHubspotIntegration(userId)
    if (!integration) return { connected: false, integration: null }
    let tokenValid = integration.tokenExpiresAt > new Date()
    if (!tokenValid && integration.isActive) tokenValid = !!(await refreshHubspot(userId))
    const updated = await getHubspotIntegration(userId)
    return {
      connected: !!updated?.isActive,
      integration: updated ? { portalId: updated.portalId, isActive: updated.isActive, connectedAt: updated.createdAt, tokenValid: updated.isActive && tokenValid } : null,
    }
  } catch { return { connected: false, integration: null } }
}

async function getSalesforceStatus(userId: string) {
  try {
    const integration = await getSalesforceIntegration(userId)
    if (!integration) return { connected: false, integration: null }
    let tokenValid = integration.tokenExpiresAt > new Date()
    if (!tokenValid && integration.isActive) tokenValid = !!(await refreshSalesforce(userId))
    const updated = await getSalesforceIntegration(userId)
    return {
      connected: !!updated?.isActive,
      integration: updated ? { orgId: updated.orgId, instanceUrl: updated.instanceUrl, isActive: updated.isActive, connectedAt: updated.createdAt, tokenValid: updated.isActive && tokenValid } : null,
    }
  } catch { return { connected: false, integration: null } }
}

export const GET = withAuth(async (_request: NextRequest, userId: string) => {
  const [gmail, gcal, hubspot, salesforce] = await Promise.all([
    getGmailStatus(userId),
    getGcalStatus(userId),
    getHubspotStatus(userId),
    getSalesforceStatus(userId),
  ])
  return NextResponse.json({ gmail, gcal, hubspot, salesforce })
})
