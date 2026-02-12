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

    // Build individual_reveal payload
    let individualReveal: any
    if (linkedinUrl) {
      let profileUrl = linkedinUrl
      if (!profileUrl.startsWith("http")) {
        profileUrl = `https://${profileUrl}`
      }
      individualReveal = { profile_url: profileUrl }
    } else {
      individualReveal = {
        full_name: fullName,
        company: company || undefined,
        domain: domain || undefined,
      }
    }

    // Start individual reveal
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
      console.error("Wiza reveal start error:", errorData)

      if (startResponse.status === 429) {
        return NextResponse.json(
          { error: "Reveal queue is full. Please try again in a moment." },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: errorData.status?.message || "Failed to start reveal" },
        { status: startResponse.status }
      )
    }

    const startData = await startResponse.json()
    console.log("Wiza reveal start response:", JSON.stringify(startData, null, 2))
    const revealId = startData.data?.id

    if (!revealId) {
      return NextResponse.json(
        { error: "Failed to get reveal ID" },
        { status: 500 }
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

    // Check if the initial response already has data (sometimes finishes instantly)
    if (startData.data?.is_complete || startData.data?.status === "finished") {
      console.log("Reveal completed immediately")
      return NextResponse.json({
        success: true,
        data: extractRevealData(startData.data),
        _rawWizaResponse: startData.data, // DEBUG
      })
    }

    // Poll for completion (max 30 seconds)
    const maxAttempts = 15
    const pollInterval = 2000 // 2 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // First poll after 1 second, then every 2 seconds
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
        console.error("Wiza poll error:", pollResponse.status)
        continue
      }

      const pollData = await pollResponse.json()
      const status = pollData.data?.status
      console.log(`Wiza reveal poll attempt ${attempt + 1}, status: ${status}`)

      if (status === "finished" || pollData.data?.is_complete) {
        console.log("Reveal finished:", JSON.stringify(pollData.data, null, 2))
        return NextResponse.json({
          success: true,
          data: extractRevealData(pollData.data),
          _rawWizaResponse: pollData.data, // DEBUG: include raw response for debugging
        })
      }

      if (status === "failed") {
        return NextResponse.json(
          { error: "Reveal failed. The contact may not be available." },
          { status: 404 }
        )
      }
    }

    // If we get here, it timed out but still processing
    return NextResponse.json({
      success: false,
      pending: true,
      revealId,
      message: "Reveal is still processing. Try again in a moment.",
    })
  } catch (error: any) {
    console.error("Error revealing contact:", error)
    return NextResponse.json(
      { error: error.message || "Failed to reveal contact" },
      { status: 500 }
    )
  }
})
