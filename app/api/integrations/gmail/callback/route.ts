import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import {
  exchangeCodeForTokens,
  getGmailEmail,
  saveGmailTokens,
} from "@/lib/gmail/oauth"

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
      `${origin}/settings?tab=integrations&gmail_error=access_denied`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/settings?tab=integrations&gmail_error=missing_params`
    )
  }

  try {
    // Verify state from cookie
    const storedState = request.cookies.get("gmail_oauth_state")?.value
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${origin}/settings?tab=integrations&gmail_error=invalid_state`
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
        `${origin}/settings?tab=integrations&gmail_error=user_mismatch`
      )
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        `${origin}/settings?tab=integrations&gmail_error=token_error`
      )
    }

    // Get Gmail email address
    const gmailEmail = await getGmailEmail(tokens.access_token)

    // Save tokens
    await saveGmailTokens(
      user.id,
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date!,
      },
      gmailEmail
    )

    // Clear state cookie and redirect to settings
    const response = NextResponse.redirect(
      `${origin}/settings?tab=integrations&gmail_success=true`
    )
    response.cookies.delete("gmail_oauth_state")

    return response
  } catch (error: any) {
    console.error("Gmail callback error:", error)
    return NextResponse.redirect(
      `${origin}/settings?tab=integrations&gmail_error=callback_failed`
    )
  }
}
