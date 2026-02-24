import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/auth/api-middleware"
import { pushContact } from "@/lib/hubspot/client"
import { getValidAccessToken } from "@/lib/hubspot/oauth"

export const dynamic = "force-dynamic"

// POST /api/integrations/hubspot/sync - Push prospect(s) to HubSpot
// Pass { syncAll: true } to sync all prospects, or { prospectIds: [...] } for specific ones
export const POST = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const accessToken = await getValidAccessToken(userId)
    if (!accessToken) {
      return NextResponse.json({ error: "HubSpot not connected" }, { status: 400 })
    }

    const { prospectIds, syncAll } = await request.json()

    if (!syncAll && (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0)) {
      return NextResponse.json({ error: "prospectIds or syncAll required" }, { status: 400 })
    }

    const prospects = await prisma.prospect.findMany({
      where: syncAll ? { userId } : { id: { in: prospectIds }, userId },
    })

    const results = await Promise.allSettled(
      prospects.map(async (prospect) => {
        const result = await pushContact(accessToken, {
          name: prospect.name,
          email: prospect.email,
          phone: prospect.phone,
          title: prospect.title,
          company: prospect.company,
          linkedin: prospect.linkedin,
        })

        // Store the HubSpot contact ID on the prospect for future syncs
        await prisma.prospect.update({
          where: { id: prospect.id },
          data: {
            wizaData: {
              ...(typeof prospect.wizaData === "object" && prospect.wizaData !== null ? prospect.wizaData : {}),
              hubspotContactId: result.hubspotContactId,
            } as any,
          },
        })

        return { prospectId: prospect.id, ...result }
      })
    )

    const synced = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    return NextResponse.json({ synced, failed, total: prospects.length })
  } catch (error: any) {
    console.error("HubSpot sync error:", error)
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 })
  }
})
