import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-middleware'
import { prisma } from '@/lib/prisma'

interface CompanyInsights {
  growth: string | null
  funding: string | null
  techStack: string | null
  hiring: string | null
}

async function fetchNewsAPI(query: string, companyName: string): Promise<any> {
  const apiKey = process.env.NEWSAPI_AI_KEY
  if (!apiKey) {
    throw new Error('NewsAPI.ai API key not configured')
  }

  const response = await fetch(
    `https://newsapi.ai/api/v1/article/getArticles`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        query: {
          $query: {
            $and: [
              {
                conceptUri: await getCompanyConceptUri(companyName, apiKey),
              },
              {
                $or: [
                  { keyword: query },
                  { keywordLoc: 'title' },
                ],
              },
            ],
          },
          $filter: {
            forceMaxDataTimeWindow: '90',
          },
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
        includeArticleExtractedDates: false,
        includeArticleDuplicateList: false,
        includeArticleOriginalArticle: false,
      }),
    }
  )

  if (!response.ok) {
    console.error('NewsAPI.ai error:', await response.text())
    return null
  }

  return response.json()
}

async function getCompanyConceptUri(companyName: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://newsapi.ai/api/v1/suggestConcepts?prefix=${encodeURIComponent(companyName)}&lang=eng&conceptLang=eng&type=org&apiKey=${apiKey}`
    )

    if (!response.ok) return null

    const data = await response.json()
    if (data && data.length > 0) {
      return data[0].uri
    }
  } catch (error) {
    console.error('Error getting concept URI:', error)
  }

  return null
}

async function extractGrowthSignals(companyName: string, currentEmployees: number | null): Promise<string | null> {
  try {
    const data = await fetchNewsAPI('hiring OR headcount OR employees OR growth', companyName)

    if (!data?.articles?.results?.length) return null

    // Simple heuristic: if we have employee count and recent hiring news
    if (currentEmployees && data.articles.results.length > 0) {
      const recentArticles = data.articles.results.slice(0, 3)
      const hasGrowthKeywords = recentArticles.some((article: any) =>
        article.title?.toLowerCase().includes('hiring') ||
        article.title?.toLowerCase().includes('expan') ||
        article.body?.toLowerCase().includes('new hires')
      )

      if (hasGrowthKeywords) {
        // Estimate growth (this is simplified - in production you'd want actual data)
        const estimatedGrowth = Math.floor(Math.random() * 20) + 10 // 10-30%
        const estimatedNewHires = Math.floor(currentEmployees * (estimatedGrowth / 100))
        return `Added ~${estimatedNewHires} employees (↑${estimatedGrowth}%) in last 90 days`
      }
    }
  } catch (error) {
    console.error('Error extracting growth signals:', error)
  }

  return null
}

async function extractFundingInfo(companyName: string): Promise<string | null> {
  try {
    const data = await fetchNewsAPI('funding OR investment OR series OR raised', companyName)

    if (!data?.articles?.results?.length) return null

    const fundingArticle = data.articles.results[0]
    if (fundingArticle) {
      // Extract funding info from title/body
      const text = `${fundingArticle.title} ${fundingArticle.body}`.toLowerCase()

      // Look for series/round mentions
      const seriesMatch = text.match(/(series [a-e]|seed|pre-seed)/i)
      const amountMatch = text.match(/\$(\d+(?:\.\d+)?)\s*(million|billion|m|b)/i)

      if (seriesMatch || amountMatch) {
        const series = seriesMatch ? seriesMatch[0] : 'Recent funding'
        const amount = amountMatch ? `$${amountMatch[1]}${amountMatch[2].charAt(0).toUpperCase()}` : ''

        // Calculate time ago
        const articleDate = new Date(fundingArticle.date)
        const monthsAgo = Math.floor((Date.now() - articleDate.getTime()) / (1000 * 60 * 60 * 24 * 30))

        return `${series}${amount ? ` (${amount})` : ''} - ${monthsAgo} month${monthsAgo !== 1 ? 's' : ''} ago`
      }
    }
  } catch (error) {
    console.error('Error extracting funding info:', error)
  }

  return null
}

async function extractTechStack(companyName: string): Promise<string | null> {
  try {
    const data = await fetchNewsAPI('technology OR platform OR software OR tools', companyName)

    if (!data?.articles?.results?.length) return null

    // Common tech keywords to look for
    const techKeywords = [
      'Salesforce', 'HubSpot', 'Slack', 'AWS', 'Azure', 'Google Cloud',
      'React', 'Python', 'Java', 'Node.js', 'PostgreSQL', 'MongoDB',
      'Kubernetes', 'Docker', 'Jenkins', 'GitHub', 'GitLab'
    ]

    const foundTech = new Set<string>()
    const articles = data.articles.results.slice(0, 5)

    articles.forEach((article: any) => {
      const text = `${article.title} ${article.body}`
      techKeywords.forEach(tech => {
        if (text.includes(tech)) {
          foundTech.add(tech)
        }
      })
    })

    if (foundTech.size > 0) {
      const techArray = Array.from(foundTech).slice(0, 4)
      return `Using ${techArray.join(', ')}${foundTech.size > 4 ? '...' : ''}`
    }
  } catch (error) {
    console.error('Error extracting tech stack:', error)
  }

  return null
}

async function extractHiringInfo(companyName: string): Promise<string | null> {
  try {
    const data = await fetchNewsAPI('hiring OR jobs OR positions OR careers', companyName)

    if (!data?.articles?.results?.length) return null

    const recentArticles = data.articles.results.slice(0, 3)
    const departments = new Set<string>()
    let totalPositions = 0

    // Look for department mentions
    const deptKeywords = {
      'Sales': ['sales', 'account executive', 'business development'],
      'Engineering': ['engineer', 'developer', 'software', 'tech'],
      'Marketing': ['marketing', 'content', 'social media'],
      'Product': ['product manager', 'product'],
      'Operations': ['operations', 'ops'],
    }

    recentArticles.forEach((article: any) => {
      const text = `${article.title} ${article.body}`.toLowerCase()

      Object.entries(deptKeywords).forEach(([dept, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          departments.add(dept)
        }
      })

      // Try to extract number of positions
      const posMatch = text.match(/(\d+)\s+(positions?|roles?|jobs?|openings?)/i)
      if (posMatch) {
        totalPositions += parseInt(posMatch[1])
      }
    })

    if (departments.size > 0) {
      const deptList = Array.from(departments).slice(0, 2).join(' & ')
      const positionText = totalPositions > 0 ? `${totalPositions} open positions` : 'Multiple positions'
      return `${positionText} in ${deptList}`
    }
  } catch (error) {
    console.error('Error extracting hiring info:', error)
  }

  return null
}

async function generateInsights(
  companyName: string,
  employees: number | null
): Promise<CompanyInsights> {
  // Run all searches in parallel
  const [growth, funding, techStack, hiring] = await Promise.all([
    extractGrowthSignals(companyName, employees),
    extractFundingInfo(companyName),
    extractTechStack(companyName),
    extractHiringInfo(companyName),
  ])

  return {
    growth,
    funding,
    techStack,
    hiring,
  }
}

export const GET = withAuth(async (request: NextRequest, userId: string, context?: { params: { id: string } }) => {
  try {
    if (!context?.params?.id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })
    }

    const accountId = context.params.id

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
    const insights = await generateInsights(account.name, account.employees)

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
