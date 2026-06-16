import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import dns from "dns/promises"

export const dynamic = "force-dynamic"

interface DnsCheckResult {
  pass: boolean
  record: string | null
  fix: string | null
}

async function checkSpf(domain: string): Promise<DnsCheckResult> {
  try {
    const records = await dns.resolveTxt(domain)
    const spf = records.flat().find(r => r.startsWith("v=spf1"))
    if (!spf) {
      return {
        pass: false,
        record: null,
        fix: `Add a TXT record on ${domain}: v=spf1 include:_spf.google.com ~all`,
      }
    }
    const hasGoogle = spf.includes("_spf.google.com") || spf.includes("google.com")
    return {
      pass: hasGoogle,
      record: spf,
      fix: hasGoogle
        ? null
        : `Your SPF record doesn't include Google. Add include:_spf.google.com to your existing SPF record.`,
    }
  } catch {
    return {
      pass: false,
      record: null,
      fix: `Add a TXT record on ${domain}: v=spf1 include:_spf.google.com ~all`,
    }
  }
}

async function checkDkim(domain: string): Promise<DnsCheckResult> {
  // Google Workspace uses selector "google"
  const selectors = ["google", "selector1", "selector2", "default"]
  for (const selector of selectors) {
    try {
      const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`)
      const record = records.flat().join("")
      if (record.includes("v=DKIM1") || record.includes("k=rsa")) {
        return { pass: true, record: `${selector}._domainkey.${domain}: ${record.slice(0, 80)}...`, fix: null }
      }
    } catch {
      // Try next selector
    }
  }
  return {
    pass: false,
    record: null,
    fix: `Enable DKIM in Google Workspace Admin → Apps → Gmail → Authenticate email, then add the generated TXT record to your DNS.`,
  }
}

async function checkDmarc(domain: string): Promise<DnsCheckResult> {
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`)
    const dmarc = records.flat().find(r => r.startsWith("v=DMARC1"))
    if (!dmarc) {
      return {
        pass: false,
        record: null,
        fix: `Add a TXT record on _dmarc.${domain}: v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`,
      }
    }
    const isEnforced = dmarc.includes("p=quarantine") || dmarc.includes("p=reject")
    return {
      pass: true,
      record: dmarc,
      fix: !isEnforced
        ? `Your DMARC policy is p=none (monitoring only). Consider upgrading to p=quarantine or p=reject for stronger protection.`
        : null,
    }
  } catch {
    return {
      pass: false,
      record: null,
      fix: `Add a TXT record on _dmarc.${domain}: v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`,
    }
  }
}

export const GET = withAuth(async (request: NextRequest, _userId: string) => {
  const domain = request.nextUrl.searchParams.get("domain")
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 })

  const [spf, dkim, dmarc] = await Promise.all([
    checkSpf(domain),
    checkDkim(domain),
    checkDmarc(domain),
  ])

  return NextResponse.json({ domain, spf, dkim, dmarc })
})
