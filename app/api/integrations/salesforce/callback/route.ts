import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import {
  exchangeCodeForTokens,
  saveSalesforceTokens,
} from "@/lib/salesforce/oauth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const origin = request.nextUrl.origin

  if (error) {
    return NextResponse.redirect(
      `${origin}/settings?tab=integrations&salesforce_error=access_denied`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/settings?tab=integrations&salesforce_error=missing_params`
    )
  }

  try {
    const storedState = request.cookies.get("salesforce_oauth_state")?.value
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${origin}/settings?tab=integrations&salesforce_error=invalid_state`
      )
    }

    const stateData = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    )

    const supabase = await createClient()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.redirect(`${origin}/login`)
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    })

    if (!user || user.id !== stateData.userId) {
      return NextResponse.redirect(
        `${origin}/settings?tab=integrations&salesforce_error=user_mismatch`
      )
    }

    const codeVerifier = request.cookies.get("salesforce_pkce_verifier")?.value
    if (!codeVerifier) {
      return NextResponse.redirect(
        `${origin}/settings?tab=integrations&salesforce_error=missing_verifier`
      )
    }

    const tokens = await exchangeCodeForTokens(code, codeVerifier)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        `${origin}/settings?tab=integrations&salesforce_error=token_error`
      )
    }

    await saveSalesforceTokens(user.id, tokens)

    const response = NextResponse.redirect(
      `${origin}/settings?tab=integrations&salesforce_success=true`
    )
    response.cookies.delete("salesforce_oauth_state")
    response.cookies.delete("salesforce_pkce_verifier")

    return response
  } catch (error: any) {
    console.error("Salesforce callback error:", error)
    return NextResponse.redirect(
      `${origin}/settings?tab=integrations&salesforce_error=callback_failed`
    )
  }
}
