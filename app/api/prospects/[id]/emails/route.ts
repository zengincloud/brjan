import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type EmailEntry = { type?: string; email: string; status?: string }

function normalizeEmails(raw: any): EmailEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.map((e: any) =>
    typeof e === "string" ? { email: e } : { email: e?.email || "", type: e?.type, status: e?.status }
  ).filter((e: EmailEntry) => e.email)
}

async function getAuthedProspect(request: NextRequest, prospectId: string) {
  const supabase = await createClient()
  const { data: { user: supabaseUser } } = await supabase.auth.getUser()
  if (!supabaseUser) return null

  const user = await prisma.user.findUnique({ where: { supabaseId: supabaseUser.id } })
  if (!user) return null

  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, userId: user.id },
  })

  return prospect
}

/**
 * POST /api/prospects/[id]/emails - Add an email address
 * Body: { email: string }
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prospect = await getAuthedProspect(request, params.id)
    if (!prospect) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { email } = await request.json()
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()

    // Get current emails from wizaData
    const wizaData = (prospect.wizaData as any) || {}
    const emails = normalizeEmails(wizaData.emails)

    // Check for duplicate
    if (emails.some((e) => e.email.toLowerCase() === trimmedEmail)) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 })
    }
    if (prospect.email?.toLowerCase() === trimmedEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 })
    }

    // Add to list
    emails.push({ email: trimmedEmail })

    // If prospect has no primary email, set this as primary
    const updateData: any = {
      wizaData: { ...wizaData, emails },
    }
    if (!prospect.email) {
      updateData.email = trimmedEmail
    }

    const updated = await prisma.prospect.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ prospect: updated })
  } catch (error) {
    console.error("Error adding email:", error)
    return NextResponse.json({ error: "Failed to add email" }, { status: 500 })
  }
}

/**
 * PATCH /api/prospects/[id]/emails - Set primary email
 * Body: { email: string }
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prospect = await getAuthedProspect(request, params.id)
    if (!prospect) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { email } = await request.json()
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()

    // Verify the email exists in the prospect's email list or wizaData
    const wizaData = (prospect.wizaData as any) || {}
    const emails = normalizeEmails(wizaData.emails)
    const exists = emails.some((e) => e.email.toLowerCase() === trimmedEmail)
      || prospect.email?.toLowerCase() === trimmedEmail

    if (!exists) {
      return NextResponse.json({ error: "Email not found on this prospect" }, { status: 400 })
    }

    // Reorder: move selected email to front of wizaData.emails
    const reordered = [
      ...emails.filter((e) => e.email.toLowerCase() === trimmedEmail),
      ...emails.filter((e) => e.email.toLowerCase() !== trimmedEmail),
    ]

    const updated = await prisma.prospect.update({
      where: { id: params.id },
      data: {
        email: trimmedEmail,
        wizaData: { ...wizaData, emails: reordered },
      },
    })

    return NextResponse.json({ prospect: updated })
  } catch (error) {
    console.error("Error setting primary email:", error)
    return NextResponse.json({ error: "Failed to set primary email" }, { status: 500 })
  }
}

/**
 * DELETE /api/prospects/[id]/emails - Remove an email address
 * Body: { email: string }
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prospect = await getAuthedProspect(request, params.id)
    if (!prospect) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { email } = await request.json()
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()

    const wizaData = (prospect.wizaData as any) || {}
    const emails = normalizeEmails(wizaData.emails)
    const filtered = emails.filter((e) => e.email.toLowerCase() !== trimmedEmail)

    // If deleting the primary email, promote the next one (or clear)
    const updateData: any = {
      wizaData: { ...wizaData, emails: filtered },
    }
    if (prospect.email?.toLowerCase() === trimmedEmail) {
      updateData.email = filtered.length > 0 ? filtered[0].email : null
    }

    const updated = await prisma.prospect.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ prospect: updated })
  } catch (error) {
    console.error("Error removing email:", error)
    return NextResponse.json({ error: "Failed to remove email" }, { status: 500 })
  }
}
