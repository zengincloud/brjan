import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Unipile redirects here after the user authenticates LinkedIn.
 * Query params include: account_id (the newly connected Unipile account ID)
 */
export async function GET(request: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get("account_id")

  if (!accountId) {
    return NextResponse.redirect(`${siteUrl}/linkedin?error=missing_account_id`)
  }

  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (!supabaseUser) {
      return NextResponse.redirect(`${siteUrl}/login`)
    }

    const user = await prisma.user.findUnique({ where: { supabaseId: supabaseUser.id } })
    if (!user) {
      return NextResponse.redirect(`${siteUrl}/login`)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { unipileAccountId: accountId },
    })

    // Kick off initial sync in background (fire and forget)
    fetch(`${siteUrl}/api/linkedin/sync`, {
      method: "POST",
      headers: { "Cookie": request.headers.get("cookie") || "" },
    }).catch(() => {})

    return NextResponse.redirect(`${siteUrl}/linkedin?connected=true`)
  } catch (error: any) {
    console.error("LinkedIn connect callback error:", error)
    return NextResponse.redirect(`${siteUrl}/linkedin?error=connection_failed`)
  }
}
