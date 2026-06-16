import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import dns from "dns/promises"

export const dynamic = "force-dynamic"

const DOMAIN_DNSBLS = [
  { name: "Spamhaus DBL", host: "dbl.spamhaus.org" },
  { name: "URIBL", host: "multi.uribl.com" },
  { name: "SURBL", host: "multi.surbl.org" },
  { name: "NordSpam DBL", host: "dbl.nordspam.com" },
  { name: "SpamEatingMonkey", host: "uribl.spameatingmonkey.net" },
]

async function checkDnsbl(domain: string, dnsbl: string): Promise<boolean> {
  try {
    await dns.resolve4(`${domain}.${dnsbl}`)
    return true // Listed
  } catch {
    return false // NXDOMAIN = clean
  }
}

export const GET = withAuth(async (request: NextRequest, _userId: string) => {
  const domain = request.nextUrl.searchParams.get("domain")
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 })

  const results = await Promise.all(
    DOMAIN_DNSBLS.map(async (bl) => ({
      name: bl.name,
      listed: await checkDnsbl(domain, bl.host),
    }))
  )

  const listedOn = results.filter(r => r.listed).map(r => r.name)
  const clean = results.filter(r => !r.listed).map(r => r.name)

  return NextResponse.json({
    domain,
    listed: listedOn,
    clean,
    totalChecked: results.length,
    isClean: listedOn.length === 0,
  })
})
