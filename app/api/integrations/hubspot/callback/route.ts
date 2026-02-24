import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import {
  exchangeCodeForTokens,
  getPortalId,
  saveHubspotTokens,
} from "@/lib/hubspot/oauth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const origin = request.nextUrl.origin

  // Handle user denial
  if (error) {
    return NextResponse.redirect(
      `${origin}/settings?tab=integrations&hubspot_error=access_denied`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/settings?tab=integrations&hubspot_error=missing_params`
    )
  }

  try {
    // Verify state from cookie
    const storedState = request.cookies.get("hubspot_oauth_state")?.value
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${origin}/settings?tab=integrations&hubspot_error=invalid_state`
      )
    }

    // Decode state to get userId
    const stateData = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    )

    // Verify the user is still authenticated
    const supabase = await createClient()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.redirect(`${origin}/login`)
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    })

    if (!user || user.id !== stateData.userId) {
      return NextResponse.redirect(
        `${origin}/settings?tab=integrations&hubspot_error=user_mismatch`
      )
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        `${origin}/settings?tab=integrations&hubspot_error=token_error`
      )
    }

    // Get the HubSpot portal ID
    const portalId = await getPortalId(tokens.access_token)

    // Save tokens
    await saveHubspotTokens(user.id, tokens, portalId)

    // Clear state cookie and redirect to settings
    const response = NextResponse.redirect(
      `${origin}/settings?tab=integrations&hubspot_success=true`
    )
    response.cookies.delete("hubspot_oauth_state")

    return response
  } catch (error: any) {
    console.error("HubSpot callback error:", error)
    return NextResponse.redirect(
      `${origin}/settings?tab=integrations&hubspot_error=callback_failed`
    )
  }
}
