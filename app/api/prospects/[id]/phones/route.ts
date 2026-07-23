import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { digitsOnly, normalizePhones } from "@/lib/phone"

export const dynamic = "force-dynamic"

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
 * POST /api/prospects/[id]/phones - Add a phone number
 * Body: { number: string }
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prospect = await getAuthedProspect(request, params.id)
    if (!prospect) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { number } = await request.json()
    if (!number || typeof number !== "string" || digitsOnly(number).length < 7) {
      return NextResponse.json({ error: "Valid phone number required" }, { status: 400 })
    }

    const trimmedNumber = number.trim()
    const digits = digitsOnly(trimmedNumber)

    const wizaData = (prospect.wizaData as any) || {}
    const phones = normalizePhones(wizaData.phones)

    if (phones.some((p) => digitsOnly(p.number) === digits)) {
      return NextResponse.json({ error: "Phone number already exists" }, { status: 400 })
    }
    if (prospect.phone && digitsOnly(prospect.phone) === digits) {
      return NextResponse.json({ error: "Phone number already exists" }, { status: 400 })
    }

    phones.push({ number: trimmedNumber })

    const updateData: any = {
      wizaData: { ...wizaData, phones },
    }
    if (!prospect.phone) {
      updateData.phone = trimmedNumber
    }

    const updated = await prisma.prospect.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ prospect: updated })
  } catch (error) {
    console.error("Error adding phone:", error)
    return NextResponse.json({ error: "Failed to add phone" }, { status: 500 })
  }
}

/**
 * PATCH /api/prospects/[id]/phones - Set primary phone
 * Body: { number: string }
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prospect = await getAuthedProspect(request, params.id)
    if (!prospect) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { number } = await request.json()
    if (!number || typeof number !== "string") {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 })
    }

    const trimmedNumber = number.trim()
    const digits = digitsOnly(trimmedNumber)

    const wizaData = (prospect.wizaData as any) || {}
    const phones = normalizePhones(wizaData.phones)
    const exists = phones.some((p) => digitsOnly(p.number) === digits)
      || (prospect.phone ? digitsOnly(prospect.phone) === digits : false)

    if (!exists) {
      return NextResponse.json({ error: "Phone number not found on this prospect" }, { status: 400 })
    }

    // Ensure the previous primary number isn't lost, then reorder so the chosen one is first
    const withPreviousPrimary = prospect.phone && !phones.some((p) => digitsOnly(p.number) === digitsOnly(prospect.phone!))
      ? [{ number: prospect.phone }, ...phones]
      : phones
    const reordered = [
      ...withPreviousPrimary.filter((p) => digitsOnly(p.number) === digits),
      ...withPreviousPrimary.filter((p) => digitsOnly(p.number) !== digits),
    ]

    const updated = await prisma.prospect.update({
      where: { id: params.id },
      data: {
        phone: trimmedNumber,
        wizaData: { ...wizaData, phones: reordered },
      },
    })

    return NextResponse.json({ prospect: updated })
  } catch (error) {
    console.error("Error setting primary phone:", error)
    return NextResponse.json({ error: "Failed to set primary phone" }, { status: 500 })
  }
}

/**
 * PUT /api/prospects/[id]/phones - Edit a phone number
 * Body: { oldNumber: string, newNumber: string }
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prospect = await getAuthedProspect(request, params.id)
    if (!prospect) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { oldNumber, newNumber } = await request.json()
    if (!oldNumber || !newNumber || digitsOnly(newNumber).length < 7) {
      return NextResponse.json({ error: "Valid old and new phone number required" }, { status: 400 })
    }

    const trimmedOld = oldNumber.trim()
    const trimmedNew = newNumber.trim()
    const digitsOld = digitsOnly(trimmedOld)
    const digitsNew = digitsOnly(trimmedNew)

    if (digitsOld === digitsNew) {
      return NextResponse.json({ prospect })
    }

    const wizaData = (prospect.wizaData as any) || {}
    const phones = normalizePhones(wizaData.phones)

    const alreadyExists = phones.some((p) => digitsOnly(p.number) === digitsNew)
      || (prospect.phone ? digitsOnly(prospect.phone) === digitsNew && digitsOnly(prospect.phone) !== digitsOld : false)
    if (alreadyExists) {
      return NextResponse.json({ error: "Phone number already exists" }, { status: 400 })
    }

    const updatedPhones = phones.map((p) =>
      digitsOnly(p.number) === digitsOld ? { ...p, number: trimmedNew } : p
    )

    const updateData: any = {
      wizaData: { ...wizaData, phones: updatedPhones },
    }

    if (prospect.phone && digitsOnly(prospect.phone) === digitsOld) {
      updateData.phone = trimmedNew
    }

    const updated = await prisma.prospect.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ prospect: updated })
  } catch (error) {
    console.error("Error editing phone:", error)
    return NextResponse.json({ error: "Failed to edit phone" }, { status: 500 })
  }
}

/**
 * DELETE /api/prospects/[id]/phones - Remove a phone number
 * Body: { number: string }
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const prospect = await getAuthedProspect(request, params.id)
    if (!prospect) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { number } = await request.json()
    if (!number || typeof number !== "string") {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 })
    }

    const digits = digitsOnly(number)

    const wizaData = (prospect.wizaData as any) || {}
    const phones = normalizePhones(wizaData.phones)
    const filtered = phones.filter((p) => digitsOnly(p.number) !== digits)

    const updateData: any = {
      wizaData: { ...wizaData, phones: filtered },
    }
    if (prospect.phone && digitsOnly(prospect.phone) === digits) {
      updateData.phone = filtered.length > 0 ? filtered[0].number : null
    }

    const updated = await prisma.prospect.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ prospect: updated })
  } catch (error) {
    console.error("Error removing phone:", error)
    return NextResponse.json({ error: "Failed to remove phone" }, { status: 500 })
  }
}
