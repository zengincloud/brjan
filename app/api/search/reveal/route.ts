import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"

export const dynamic = 'force-dynamic'

// POST /api/search/reveal - Reveal contact details for a prospect using Wiza Individual Reveal
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const apiKey = process.env.WIZA_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "Wiza API key not configured" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { linkedinUrl, fullName, company, domain } = body

    if (!linkedinUrl && !fullName) {
      return NextResponse.json(
        { error: "LinkedIn URL or full name is required" },
        { status: 400 }
      )
    }

    // Helper to extract reveal data from response
    const extractRevealData = (d: any) => ({
      email: d.email || null,
      emailType: d.email_type || null,
      emailStatus: d.email_status || null,
      emails: (d.emails || []).map((e: any) => ({
        email: e.email,
        type: e.type || e.email_type,
        status: e.status || e.email_status,
      })),
      phone: d.mobile_phone || d.phone_number || null,
      phoneStatus: d.phone_status || null,
      phones: (d.phones || []).map((p: any) => ({
        number: p.number,
        prettyNumber: p.number_pretty || p.pretty_number,
        type: p.type,
      })),
      name: d.name || null,
      title: d.title || null,
      company: d.company || null,
      location: d.location || null,
      linkedinUrl: d.linkedin_profile_url || null,
      companySize: d.company_size || null,
      companySizeRange: d.company_size_range || null,
      companyIndustry: d.company_industry || null,
      companyDomain: d.company_domain || null,
      companyFounded: d.company_founded || null,
      companyRevenue: d.company_revenue || null,
      companyDescription: d.company_description || null,
    })

    // Helper to check if reveal data has actual contact info
    const hasContactData = (d: any) => {
      return d.email || d.mobile_phone || d.phone_number ||
        (d.emails && d.emails.length > 0) ||
        (d.phones && d.phones.length > 0)
    }

    // Helper to start a reveal and poll for completion
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
        console.error(`Wiza reveal start error (${label}):`, errorData)
        return { ok: false, status: startResponse.status, errorData }
      }

      const startData = await startResponse.json()
      console.log(`Wiza reveal start response (${label}):`, JSON.stringify(startData, null, 2))
      const revealId = startData.data?.id

      if (!revealId) {
        return { ok: false, status: 500, errorData: { error: "Failed to get reveal ID" } }
      }

      // Check if completed immediately
      if (startData.data?.is_complete || startData.data?.status === "finished") {
        console.log(`Reveal completed immediately (${label})`)
        return { ok: true, data: startData.data }
      }

      // Poll for completion (max 30 seconds)
      const maxAttempts = 15
      const pollInterval = 2000

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1000 : pollInterval))

        const pollResponse = await fetch(
          `https://wiza.co/api/individual_reveals/${revealId}`,
          {
            headers: {
              "Authorization": `Bearer ${apiKey}`,
            },
          }
        )

        if (!pollResponse.ok) {
          console.error(`Wiza poll error (${label}):`, pollResponse.status)
          continue
        }

        const pollData = await pollResponse.json()
        const status = pollData.data?.status
        console.log(`Wiza reveal poll attempt ${attempt + 1} (${label}), status: ${status}`)

        if (status === "finished" || pollData.data?.is_complete) {
          console.log(`Reveal finished (${label}):`, JSON.stringify(pollData.data, null, 2))
          return { ok: true, data: pollData.data }
        }

        if (status === "failed") {
          return { ok: false, status: 404, errorData: { error: "Reveal failed" } }
        }
      }

      return { ok: false, status: 408, errorData: { error: "Reveal timed out", pending: true, revealId } }
    }

    // Build primary lookup payload
    let primaryReveal: any
    let fallbackReveal: any = null

    if (linkedinUrl) {
      let profileUrl = linkedinUrl
      if (!profileUrl.startsWith("http")) {
        profileUrl = `https://${profileUrl}`
      }
      primaryReveal = { profile_url: profileUrl }

      // Prepare name-based fallback if we have the data
      if (fullName) {
        fallbackReveal = {
          full_name: fullName,
          company: company || undefined,
          domain: domain || undefined,
        }
      }
    } else {
      primaryReveal = {
        full_name: fullName,
        company: company || undefined,
        domain: domain || undefined,
      }
    }

    // Try primary reveal
    const primaryResult = await doReveal(primaryReveal, "primary")

    if (!primaryResult.ok) {
      if (primaryResult.status === 429) {
        return NextResponse.json(
          { error: "Reveal queue is full. Please try again in a moment." },
          { status: 429 }
        )
      }
      if (primaryResult.errorData?.pending) {
        return NextResponse.json({
          success: false,
          pending: true,
          revealId: primaryResult.errorData.revealId,
          message: "Reveal is still processing. Try again in a moment.",
        })
      }
      return NextResponse.json(
        { error: primaryResult.errorData?.error || "Failed to start reveal" },
        { status: primaryResult.status || 500 }
      )
    }

    // If primary result came back "unfound" and we have a fallback, try the alternate lookup
    if (primaryResult.ok && !hasContactData(primaryResult.data) && fallbackReveal) {
      console.log("Primary reveal returned no contact data, trying fallback (name-based) lookup...")
      const fallbackResult = await doReveal(fallbackReveal, "fallback-name")

      if (fallbackResult.ok && hasContactData(fallbackResult.data)) {
        console.log("Fallback reveal found contact data!")
        return NextResponse.json({
          success: true,
          data: extractRevealData(fallbackResult.data),
          _rawWizaResponse: fallbackResult.data,
          _lookupMethod: "fallback-name",
        })
      }
      console.log("Fallback reveal also returned no contact data")
    }

    // Return primary result
    return NextResponse.json({
      success: true,
      data: extractRevealData(primaryResult.data),
      _rawWizaResponse: primaryResult.data,
      _lookupMethod: "primary",
    })
  } catch (error: any) {
    console.error("Error revealing contact:", error)
    return NextResponse.json(
      { error: error.message || "Failed to reveal contact" },
      { status: 500 }
    )
  }
})
