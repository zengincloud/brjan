import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { getTimezoneFromLocation } from "@/lib/timezone"

export const dynamic = "force-dynamic"

type EmailEntry = { type?: string; email: string; status?: string }

function normalizeEmails(raw: any): EmailEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((e: any) =>
      typeof e === "string"
        ? { email: e }
        : { email: e?.email || "", type: e?.type, status: e?.status }
    )
    .filter((e: EmailEntry) => e.email)
}

/**
 * POST /api/prospects/[id]/enrich
 *
 * Calls Wiza Individual Reveal API to enrich a prospect's contact info.
 * Merges new emails/phones without overwriting existing data.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = process.env.WIZA_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Wiza API key not configured" },
        { status: 500 }
      )
    }

    // Auth check
    const supabase = await createClient()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()
    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const prospect = await prisma.prospect.findFirst({
      where: { id: params.id, userId: user.id },
    })
    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    const wizaData = (prospect.wizaData as any) || {}

    // Build reveal payload from prospect data
    const linkedinUrl = prospect.linkedin || wizaData.linkedinUrl
    const fullName = prospect.name
    const company = prospect.company
    const domain = wizaData.companyDomain

    if (!linkedinUrl && !fullName) {
      return NextResponse.json(
        { error: "Need LinkedIn URL or name to enrich" },
        { status: 400 }
      )
    }

    // Call Wiza reveal
    const revealPayload: any = {}
    if (linkedinUrl) {
      let profileUrl = linkedinUrl
      if (!profileUrl.startsWith("http")) {
        profileUrl = `https://${profileUrl}`
      }
      revealPayload.profile_url = profileUrl
    } else {
      revealPayload.full_name = fullName
      if (company) revealPayload.company = company
      if (domain) revealPayload.domain = domain
    }

    const startResponse = await fetch(
      "https://wiza.co/api/individual_reveals",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          individual_reveal: revealPayload,
          enrichment_level: "full",
          email_options: {
            accept_work: true,
            accept_personal: true,
          },
        }),
      }
    )

    if (!startResponse.ok) {
      const errorData = await startResponse.json().catch(() => ({}))
      if (startResponse.status === 429) {
        return NextResponse.json(
          { error: "Rate limited. Please try again in a moment." },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: errorData?.error || "Failed to start enrichment" },
        { status: startResponse.status }
      )
    }

    const startData = await startResponse.json()
    const revealId = startData.data?.id

    if (!revealId) {
      return NextResponse.json(
        { error: "Failed to start enrichment" },
        { status: 500 }
      )
    }

    // Poll for completion (max 30 seconds)
    let revealData = startData.data
    if (!revealData?.is_complete && revealData?.status !== "finished") {
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise((r) =>
          setTimeout(r, attempt === 0 ? 1000 : 2000)
        )

        const pollResponse = await fetch(
          `https://wiza.co/api/individual_reveals/${revealId}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        )

        if (!pollResponse.ok) continue

        const pollData = await pollResponse.json()
        if (
          pollData.data?.status === "finished" ||
          pollData.data?.is_complete
        ) {
          revealData = pollData.data
          break
        }
        if (pollData.data?.status === "failed") {
          return NextResponse.json(
            { error: "Enrichment failed — no data found" },
            { status: 404 }
          )
        }
      }
    }

    if (
      !revealData?.is_complete &&
      revealData?.status !== "finished"
    ) {
      return NextResponse.json(
        { error: "Enrichment timed out. Try again in a moment." },
        { status: 408 }
      )
    }

    // Extract enriched data. Wiza's response fields aren't guaranteed to
    // match the documented shape, so coerce to the expected type here.
    const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null)
    const num = (v: unknown): number | null => {
      if (typeof v === "number" && !isNaN(v)) return v
      if (typeof v === "string" && v.trim()) {
        const parsed = parseInt(v, 10)
        if (!isNaN(parsed)) return parsed
      }
      return null
    }

    const enriched = {
      email: str(revealData.email),
      emails: (Array.isArray(revealData.emails) ? revealData.emails : []).map((e: any) => ({
        email: str(e?.email),
        type: str(e?.type || e?.email_type),
        status: str(e?.status || e?.email_status),
      })),
      phone: str(revealData.mobile_phone || revealData.phone_number),
      phones: (Array.isArray(revealData.phones) ? revealData.phones : []).map((p: any) => ({
        number: str(p?.number),
        prettyNumber: str(p?.number_pretty || p?.pretty_number),
        type: str(p?.type),
      })),
      title: str(revealData.title),
      location: str(revealData.location),
      linkedinUrl: str(revealData.linkedin_profile_url),
      companySize: num(revealData.company_size),
      companySizeRange: str(revealData.company_size_range),
      companyIndustry: str(revealData.company_industry),
      companyDomain: str(revealData.company_domain),
      companyFounded: num(revealData.company_founded),
      companyRevenue: str(revealData.company_revenue),
      companyDescription: str(revealData.company_description),
    }

    // --- Merge without overwriting existing data ---
    const existingEmails = normalizeEmails(wizaData.emails)
    const existingEmailSet = new Set(
      existingEmails.map((e) => e.email.toLowerCase())
    )
    if (prospect.email) {
      existingEmailSet.add(prospect.email.toLowerCase())
    }

    // Add new emails that don't already exist
    const newEmails: EmailEntry[] = []
    for (const e of enriched.emails) {
      if (e.email && !existingEmailSet.has(e.email.toLowerCase())) {
        newEmails.push(e)
        existingEmailSet.add(e.email.toLowerCase())
      }
    }
    if (
      enriched.email &&
      !existingEmailSet.has(enriched.email.toLowerCase())
    ) {
      newEmails.push({ email: enriched.email })
    }

    const mergedEmails = [...existingEmails, ...newEmails]

    // Phone: only set if prospect doesn't have one
    const existingPhones = wizaData.phones || []

    // Merge phones
    const existingPhoneSet = new Set(
      existingPhones.map((p: any) => (p.number || "").replace(/\D/g, ""))
    )
    if (prospect.phone) {
      existingPhoneSet.add(prospect.phone.replace(/\D/g, ""))
    }

    const newPhones: any[] = []
    for (const p of enriched.phones) {
      const normalized = (p.number || "").replace(/\D/g, "")
      if (normalized && !existingPhoneSet.has(normalized)) {
        newPhones.push(p)
        existingPhoneSet.add(normalized)
      }
    }
    if (enriched.phone) {
      const normalized = enriched.phone.replace(/\D/g, "")
      if (normalized && !existingPhoneSet.has(normalized)) {
        newPhones.push({
          number: enriched.phone,
          type: "mobile",
        })
      }
    }

    const mergedPhones = [...existingPhones, ...newPhones]

    // Build update object — only set fields that are currently empty
    const updateData: any = {
      wizaData: {
        ...wizaData,
        emails: mergedEmails,
        phones: mergedPhones,
        // Merge company enrichment data (don't overwrite existing)
        companySize: wizaData.companySize || enriched.companySize,
        companySizeRange:
          wizaData.companySizeRange || enriched.companySizeRange,
        companyIndustry:
          wizaData.companyIndustry || enriched.companyIndustry,
        companyDomain: wizaData.companyDomain || enriched.companyDomain,
        companyFounded:
          wizaData.companyFounded || enriched.companyFounded,
        companyRevenue:
          wizaData.companyRevenue || enriched.companyRevenue,
        companyDescription:
          wizaData.companyDescription || enriched.companyDescription,
        linkedinUrl: wizaData.linkedinUrl || enriched.linkedinUrl,
        lastEnrichedAt: new Date().toISOString(),
      },
    }

    // Set primary email if prospect doesn't have one
    if (!prospect.email && (newEmails.length > 0 || enriched.email)) {
      updateData.email = newEmails[0]?.email || enriched.email
    }

    // Set phone if prospect doesn't have one
    if (!prospect.phone && enriched.phone) {
      updateData.phone = enriched.phone
    }

    // Set linkedin if prospect doesn't have one
    if (!prospect.linkedin && enriched.linkedinUrl) {
      updateData.linkedin = enriched.linkedinUrl
    }

    // Set title if prospect doesn't have one
    if (!prospect.title && enriched.title) {
      updateData.title = enriched.title
    }

    // Set location if prospect doesn't have one
    if (!prospect.location && enriched.location) {
      updateData.location = enriched.location
    }

    // Set timezone if prospect doesn't have one (derive from best available location)
    if (!prospect.timezone) {
      const locationForTz = updateData.location || prospect.location || enriched.location
      const derivedTz = getTimezoneFromLocation(locationForTz)
      if (derivedTz) {
        updateData.timezone = derivedTz
      }
    }

    const updated = await prisma.prospect.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({
      prospect: updated,
      enrichmentResults: {
        newEmails: newEmails.length,
        newPhones: newPhones.length,
        fieldsUpdated: [
          ...(!prospect.email && updateData.email ? ["email"] : []),
          ...(!prospect.phone && updateData.phone ? ["phone"] : []),
          ...(!prospect.linkedin && updateData.linkedin
            ? ["linkedin"]
            : []),
          ...(!prospect.title && updateData.title ? ["title"] : []),
          ...(!prospect.location && updateData.location
            ? ["location"]
            : []),
        ],
      },
    })
  } catch (error: any) {
    console.error("Error enriching prospect:", error)
    return NextResponse.json(
      { error: error.message || "Failed to enrich prospect" },
      { status: 500 }
    )
  }
}
