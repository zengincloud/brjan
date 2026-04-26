import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { exchangeCodeForTokens, getCalendarEmail, saveGcalTokens } from "@/lib/gcal/oauth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const origin = request.nextUrl.origin

  if (error) {
    return NextResponse.redirect(`${origin}/settings?tab=integrations&gcal_error=access_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/settings?tab=integrations&gcal_error=missing_params`)
  }

  try {
    const storedState = request.cookies.get("gcal_oauth_state")?.value
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${origin}/settings?tab=integrations&gcal_error=invalid_state`)
    }

    const stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf8"))

    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.redirect(`${origin}/login`)
    }

    const user = await prisma.user.findUnique({ where: { supabaseId: supabaseUser.id } })

    if (!user || user.id !== stateData.userId) {
      return NextResponse.redirect(`${origin}/settings?tab=integrations&gcal_error=user_mismatch`)
    }

    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(`${origin}/settings?tab=integrations&gcal_error=token_error`)
    }

    const calendarEmail = await getCalendarEmail(tokens.access_token)

    await saveGcalTokens(
      user.id,
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date!,
      },
      calendarEmail
    )

    const response = NextResponse.redirect(`${origin}/settings?tab=integrations&gcal_success=true`)
    response.cookies.delete("gcal_oauth_state")
    return response
  } catch (error: any) {
    console.error("GCal callback error:", error)
    return NextResponse.redirect(`${origin}/settings?tab=integrations&gcal_error=callback_failed`)
  }
}
