import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withExtensionAuth } from "@/lib/auth/extension-middleware"

export const dynamic = 'force-dynamic'

// POST /api/extension/reveal
// Accepts scraped LinkedIn data, calls Wiza reveal, checks for Account match,
// returns enriched contact info + account match + active sequences.
export const POST = withExtensionAuth(async (request: NextRequest, userId: string) => {
  try {
    const body = await request.json()
    const { name, title, company, linkedinUrl } = body

    if (!name && !linkedinUrl) {
      return NextResponse.json(
        { error: "Name or LinkedIn URL is required" },
        { status: 400 }
      )
    }

    // --- 1. Call Wiza reveal for email/phone ---
    const apiKey = process.env.WIZA_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Wiza API key not configured" },
        { status: 500 }
      )
    }

    // Wiza's response fields aren't guaranteed to match the documented shape,
    // so coerce to the expected type at this boundary rather than trusting `d`.
    const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null)
    const num = (v: unknown): number | null => {
      if (typeof v === "number" && !isNaN(v)) return v
      if (typeof v === "string" && v.trim()) {
        const parsed = parseInt(v, 10)
        if (!isNaN(parsed)) return parsed
      }
      return null
    }

    const extractRevealData = (d: any) => ({
      email: str(d.email),
      emailType: str(d.email_type),
      emailStatus: str(d.email_status),
      emails: (Array.isArray(d.emails) ? d.emails : []).map((e: any) => ({
        email: str(e?.email),
        type: str(e?.type || e?.email_type),
        status: str(e?.status || e?.email_status),
      })),
      phone: str(d.mobile_phone || d.phone_number),
      phoneStatus: str(d.phone_status),
      phones: (Array.isArray(d.phones) ? d.phones : []).map((p: any) => ({
        number: str(p?.number),
        prettyNumber: str(p?.number_pretty || p?.pretty_number),
        type: str(p?.type),
      })),
      name: str(d.name),
      title: str(d.title),
      company: str(d.company),
      location: str(d.location),
      linkedinUrl: str(d.linkedin_profile_url),
      companySize: num(d.company_size),
      companySizeRange: str(d.company_size_range),
      companyIndustry: str(d.company_industry),
      companyDomain: str(d.company_domain),
      companyFounded: num(d.company_founded),
      companyRevenue: str(d.company_revenue),
      companyDescription: str(d.company_description),
    })

    const hasContactData = (d: any) => {
      return d.email || d.mobile_phone || d.phone_number ||
        (d.emails && d.emails.length > 0) ||
        (d.phones && d.phones.length > 0)
    }

    const doReveal = async (individualReveal: any, label: string) => {
      const startResponse = await fetch("https://wiza.co/api/individual_reveals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          individual_reveal: individualReveal,
          enrichment_level: "full",
          email_options: {
            accept_work: true,
            accept_personal: true,
          },
        }),
      })

      if (!startResponse.ok) {
        const errorData = await startResponse.json().catch(() => ({}))
        console.error(`Extension reveal start error (${label}):`, errorData)
        return { ok: false as const, status: startResponse.status, errorData }
      }

      const startData = await startResponse.json()
      const revealId = startData.data?.id

      if (!revealId) {
        return { ok: false as const, status: 500, errorData: { error: "Failed to get reveal ID" } }
      }

      if (startData.data?.is_complete || startData.data?.status === "finished") {
        return { ok: true as const, data: startData.data }
      }

      // Poll for completion (max 30 seconds)
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1000 : 2000))

        const pollResponse = await fetch(
          `https://wiza.co/api/individual_reveals/${revealId}`,
          { headers: { "Authorization": `Bearer ${apiKey}` } }
        )

        if (!pollResponse.ok) continue

        const pollData = await pollResponse.json()
        const status = pollData.data?.status

        if (status === "finished" || pollData.data?.is_complete) {
          return { ok: true as const, data: pollData.data }
        }
        if (status === "failed") {
          return { ok: false as const, status: 404, errorData: { error: "Reveal failed" } }
        }
      }

      return { ok: false as const, status: 408, errorData: { error: "Reveal timed out", pending: true, revealId } }
    }

    // Build reveal payload
    let primaryReveal: any
    let fallbackReveal: any = null

    if (linkedinUrl) {
      let profileUrl = linkedinUrl
      if (!profileUrl.startsWith("http")) {
        profileUrl = `https://${profileUrl}`
      }
      primaryReveal = { profile_url: profileUrl }

      if (name) {
        fallbackReveal = {
          full_name: name,
          company: company || undefined,
        }
      }
    } else {
      primaryReveal = {
        full_name: name,
        company: company || undefined,
      }
    }

    const primaryResult = await doReveal(primaryReveal, "primary")

    let revealData: any = null

    if (primaryResult.ok) {
      // Try fallback if primary has no contact data
      if (!hasContactData(primaryResult.data) && fallbackReveal) {
        const fallbackResult = await doReveal(fallbackReveal, "fallback-name")
        if (fallbackResult.ok && hasContactData(fallbackResult.data)) {
          revealData = extractRevealData(fallbackResult.data)
        }
      }
      if (!revealData) {
        revealData = extractRevealData(primaryResult.data)
      }
    }

    // --- 2. Check for matching Account (case-insensitive on name) ---
    const companyName = revealData?.company || company
    let matchedAccount = null

    if (companyName) {
      matchedAccount = await prisma.account.findFirst({
        where: {
          userId,
          name: { equals: companyName, mode: "insensitive" },
        },
        select: {
          id: true,
          name: true,
          industry: true,
          website: true,
          employees: true,
          status: true,
        },
      })
    }

    // --- 3. Check if prospect already exists ---
    let existingProspect = null
    if (revealData?.email) {
      existingProspect = await prisma.prospect.findFirst({
        where: {
          userId,
          email: revealData.email,
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          company: true,
        },
      })
    }
    if (!existingProspect && linkedinUrl) {
      existingProspect = await prisma.prospect.findFirst({
        where: {
          userId,
          linkedin: { contains: linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com/, '') },
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          company: true,
        },
      })
    }

    // --- 4. Get user's active sequences ---
    const sequences = await prisma.sequence.findMany({
      where: {
        userId,
        status: { in: ["active", "draft"] },
      },
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { prospectSequences: true } },
      },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({
      success: !!revealData,
      revealData,
      matchedAccount,
      existingProspect,
      sequences: sequences.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        prospectCount: s._count.prospectSequences,
      })),
      scrapedData: { name, title, company, linkedinUrl },
    })
  } catch (error: any) {
    console.error("Extension reveal error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to reveal contact" },
      { status: 500 }
    )
  }
})
