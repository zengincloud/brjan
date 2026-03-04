import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-middleware'
import { prisma } from '@/lib/prisma'
import { fetchNewsArticles } from '@/lib/pov/generate'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

interface CompanyInsights {
  growth: string | null
  funding: string | null
  techStack: string | null
  hiring: string | null
}

async function generateInsights(
  companyName: string,
  industry: string | null,
  employees: number | null,
  website: string | null,
): Promise<CompanyInsights> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  // Fetch company news for context (reuse the POV news fetcher)
  const newsApiKey = process.env.NEWSAPI_AI_KEY
  const news = newsApiKey ? await fetchNewsArticles(companyName, newsApiKey) : []
  const newsContext = news.length > 0
    ? `Recent news:\n${news.join('\n')}`
    : 'No recent news available.'

  const anthropic = new Anthropic({ apiKey: anthropicKey })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Given this company, extract key business signals. Use your knowledge and the news provided. If you can't determine a signal with reasonable confidence, use null.

Company: ${companyName}
Industry: ${industry || 'Unknown'}
Employees: ${employees ? employees.toLocaleString() : 'Unknown'}
Website: ${website || 'Unknown'}
${newsContext}

Return ONLY this JSON (no markdown, no extra text):
{
  "growth": "Brief growth signal if evident, e.g. 'Expanding rapidly — opened 3 new offices in Q4' or 'Headcount grew ~40% YoY based on LinkedIn data'. null if unknown.",
  "funding": "Latest funding round if known, e.g. 'Series B ($45M) led by Sequoia — Jan 2025' or 'Bootstrapped / no known funding'. null if unknown.",
  "techStack": "Key technologies they use or sell, e.g. 'AWS, React, Python — builds on Kubernetes'. null if unknown.",
  "hiring": "Notable hiring activity, e.g. 'Actively hiring engineers and sales reps — 50+ open roles'. null if unknown."
}`
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    return JSON.parse(text) as CompanyInsights
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as CompanyInsights
    }
    return { growth: null, funding: null, techStack: null, hiring: null }
  }
}

export const GET = withAuth(async (request: NextRequest, userId: string, context?: { params: { id: string } }) => {
  try {
    if (!context?.params?.id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    const accountId = context.params.id
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    // Fetch account with userId check for security
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Check if we have cached insights less than 24 hours old
    const cacheExpiry = 24 * 60 * 60 * 1000 // 24 hours
    if (
      !force &&
      account.insights &&
      account.insightsFetchedAt &&
      Date.now() - account.insightsFetchedAt.getTime() < cacheExpiry
    ) {
      return NextResponse.json({
        insights: account.insights,
        cached: true,
      })
    }

    // Generate fresh insights
    const insights = await generateInsights(account.name, account.industry, account.employees, account.website)

    // Cache insights in database
    await prisma.account.update({
      where: { id: accountId },
      data: {
        insights,
        insightsFetchedAt: new Date(),
      },
    })

    return NextResponse.json({
      insights,
      cached: false,
    })
  } catch (error: any) {
    console.error('Error generating insights:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate insights' },
      { status: 500 }
    )
  }
})
