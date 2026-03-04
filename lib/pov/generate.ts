import Anthropic from '@anthropic-ai/sdk'

export interface POVData {
  whatTheyDo: string
  specificIndustry: string
  exampleUseCase: string
  // Legacy fields (kept for backward compat with cached data)
  industryLandscape?: string
  companyIntel?: string
  swot?: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
  keyPlayers?: string[]
  engagementStrategy?: string
}

export async function fetchNewsArticles(query: string, apiKey: string): Promise<string[]> {
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
            articlesCount: 5,
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

export async function generatePOV(
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

  const prompt = `You are a sales intelligence analyst. Given this company, return a concise JSON briefing.

Company: ${companyName}
Industry: ${industry || 'Unknown'}
Employees: ${employees ? employees.toLocaleString() : 'Unknown'}
Location: ${location || 'Unknown'}
Website: ${website || 'Unknown'}
${companyContext}

Return ONLY this JSON (no markdown, no extra text):
{
  "whatTheyDo": "1-2 sentences on what this company specifically does. Be precise about their product/service. Example: 'Builds route optimization software that helps last-mile delivery companies reduce fuel costs and missed deliveries' NOT 'A software company in the logistics space'.",
  "specificIndustry": "Their specific industry niche, not just the broad category. Example: 'SaaS for Healthcare Revenue Cycle Management' or 'AI-Powered Logistics for E-Commerce Fulfillment'.",
  "exampleUseCase": "A concrete example of who uses them or what problem they solve. Example: 'Mid-market e-commerce brands use them to cut shipping costs by optimizing carrier selection in real-time'. Make it feel real and specific."
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 500,
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
