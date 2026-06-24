import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withExtensionAuth } from "@/lib/auth/extension-middleware"
import { fetchNewsArticles, generatePOV } from "@/lib/pov/generate"

export const dynamic = 'force-dynamic'

// GET /api/extension/account-pov?accountId=xxx
// Returns the account's POV briefing, generating it if not cached.
export const GET = withExtensionAuth(async (request: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId query parameter is required' },
        { status: 400 }
      )
    }

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Check cache (48 hour expiry)
    const cacheExpiry = 48 * 60 * 60 * 1000
    if (
      account.pov &&
      account.povFetchedAt &&
      Date.now() - account.povFetchedAt.getTime() < cacheExpiry
    ) {
      return NextResponse.json({ pov: account.pov, cached: true })
    }

    // Check for required API keys
    const newsApiKey = process.env.NEWSAPI_AI_KEY
    if (!process.env.GROK_API_KEY) {
      return NextResponse.json(
        { error: 'GROK_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Fetch news in parallel
    const [companyNews, industryNews] = await Promise.all([
      newsApiKey ? fetchNewsArticles(account.name, newsApiKey) : Promise.resolve([]),
      newsApiKey && account.industry
        ? fetchNewsArticles(`${account.industry} industry trends`, newsApiKey)
        : Promise.resolve([]),
    ])

    // Generate POV using Claude
    const pov = await generatePOV(
      account.name,
      account.industry,
      account.employees,
      account.location,
      account.website,
      companyNews,
      industryNews,
    )

    // Cache in database
    await prisma.account.update({
      where: { id: accountId },
      data: {
        pov: pov as any,
        povFetchedAt: new Date(),
      },
    })

    return NextResponse.json({ pov, cached: false })
  } catch (error: any) {
    console.error('Extension account-pov error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate POV' },
      { status: 500 }
    )
  }
})
