import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-middleware'
import { prisma } from '@/lib/prisma'
import { fetchNewsArticles, generatePOV } from '@/lib/pov/generate'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request: NextRequest, userId: string, context?: { params: { id: string } }) => {
  try {
    if (!context?.params?.id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    const accountId = context.params.id
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Check cache (48 hour expiry) unless force refresh
    const cacheExpiry = 48 * 60 * 60 * 1000
    if (
      !force &&
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

    // Fetch company news for context
    const companyNews = newsApiKey
      ? await fetchNewsArticles(account.name, newsApiKey)
      : []

    // Generate POV using Claude
    const pov = await generatePOV(
      account.name,
      account.industry,
      account.employees,
      account.location,
      account.website,
      companyNews,
      [],
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
    console.error('Error generating POV:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate POV' },
      { status: 500 }
    )
  }
})
