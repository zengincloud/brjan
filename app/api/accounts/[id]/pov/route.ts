import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-middleware'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

interface POVData {
  industryLandscape: string
  companyIntel: string
  swot: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
  keyPlayers: string[]
  engagementStrategy: string
}

async function fetchNewsArticles(query: string, apiKey: string): Promise<string[]> {
  try {
    // Try concept URI first for better results
    const conceptResponse = await fetch(
      `https://newsapi.ai/api/v1/suggestConcepts?prefix=${encodeURIComponent(query)}&lang=eng&conceptLang=eng&type=org&apiKey=${apiKey}`
    )

    let articles: any[] = []

    if (conceptResponse.ok) {
      const concepts = await conceptResponse.json()
      const conceptUri = concepts?.[0]?.uri

      if (conceptUri) {
        const response = await fetch('https://newsapi.ai/api/v1/article/getArticles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            query: {
              $query: { conceptUri },
              $filter: { forceMaxDataTimeWindow: '90' },
            },
            resultType: 'articles',
            articlesSortBy: 'date',
            articlesCount: 10,
            includeArticleSocialScore: false,
            includeArticleSentiment: false,
            includeArticleCategories: false,
            includeArticleLocation: false,
            includeArticleImage: false,
            includeArticleVideos: false,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          articles = data?.articles?.results || []
        }
      }
    }

    // Fallback to keyword search if no concept results
    if (articles.length === 0) {
      const response = await fetch('https://newsapi.ai/api/v1/article/getArticles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          query: {
            $query: { keyword: query },
            $filter: { forceMaxDataTimeWindow: '90' },
          },
          resultType: 'articles',
          articlesSortBy: 'date',
          articlesCount: 10,
          includeArticleSocialScore: false,
          includeArticleSentiment: false,
          includeArticleCategories: false,
          includeArticleLocation: false,
          includeArticleImage: false,
          includeArticleVideos: false,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        articles = data?.articles?.results || []
      }
    }

    return articles.map((a: any) => `[${a.date}] ${a.title}: ${(a.body || '').substring(0, 300)}`).filter(Boolean)
  } catch (error) {
    console.error('Error fetching news:', error)
    return []
  }
}

async function generatePOV(
  companyName: string,
  industry: string | null,
  employees: number | null,
  location: string | null,
  website: string | null,
  companyNews: string[],
  industryNews: string[],
): Promise<POVData> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey })

  const companyContext = companyNews.length > 0
    ? `Recent news about ${companyName}:\n${companyNews.join('\n')}`
    : `No recent news found for ${companyName}.`

  const industryContext = industryNews.length > 0
    ? `Recent ${industry || 'industry'} news and trends:\n${industryNews.join('\n')}`
    : `No recent industry news available.`

  const prompt = `You are a senior Deloitte strategy consultant preparing a comprehensive briefing on ${companyName} for a sales team. Your goal is to make the sales rep sound like a knowledgeable industry insider — someone who understands the company's world, not just their product.

Company details:
- Name: ${companyName}
- Industry: ${industry || 'Unknown'}
- Employees: ${employees ? employees.toLocaleString() : 'Unknown'}
- Location: ${location || 'Unknown'}
- Website: ${website || 'Unknown'}

${companyContext}

${industryContext}

Generate a JSON response with the following structure. Be specific, data-driven, and insightful. Reference real trends, real companies, real regulations, and real market dynamics. If you don't have enough data on something, use your knowledge of the industry to provide relevant, accurate context. Never make up specific financial figures or dates you're not sure about.

{
  "industryLandscape": "A 3-4 paragraph macro analysis of what's happening in their industry RIGHT NOW. Include: major trends reshaping the space, regulatory changes, technology shifts, market pressures, consolidation/M&A activity, and what keeps executives in this space up at night. Be specific — name real trends, frameworks, and market dynamics. For example, if they're in cybersecurity, discuss zero-trust adoption rates, AI-powered threats, SEC disclosure rules, the talent gap, etc.",

  "companyIntel": "A 2-3 paragraph analysis of what THIS specific company is doing, working on, and facing. Use the news data to identify their strategic priorities, recent moves, challenges, and positioning within their market. If limited company data, infer from their size, location, and industry what they're likely dealing with.",

  "swot": {
    "strengths": ["3-4 specific strengths based on their profile and industry position"],
    "weaknesses": ["3-4 likely weaknesses or vulnerabilities given their size/industry"],
    "opportunities": ["3-4 market opportunities they could capitalize on"],
    "threats": ["3-4 external threats or competitive pressures they face"]
  },

  "keyPlayers": ["List 6-8 major companies, competitors, or key players in their industry space that a consultant would name-drop in conversation. Include a brief note on each, e.g. 'CrowdStrike — leader in endpoint detection, recently expanded into cloud security'"],

  "engagementStrategy": "A 2-3 paragraph strategy for how to engage this company. What pain points to lead with, what language/frameworks resonate in their industry, which stakeholders to target, and how to position yourself as a trusted advisor rather than a vendor. Include specific conversation starters and the business case angle most likely to resonate."
}

Return ONLY the JSON, no markdown fences or other text.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    return JSON.parse(text) as POVData
  } catch {
    // Try to extract JSON from the response if it has extra text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as POVData
    }
    throw new Error('Failed to parse POV response')
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
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    if (!anthropicKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured. Add it to your .env file.' },
        { status: 500 }
      )
    }

    // Fetch news in parallel: company-specific + industry-level
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
    console.error('Error generating POV:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate POV' },
      { status: 500 }
    )
  }
})
