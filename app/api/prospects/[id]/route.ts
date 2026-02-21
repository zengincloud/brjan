import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { findMatchingAccount } from "@/lib/account-linking"

export const dynamic = 'force-dynamic'

// GET /api/prospects/[id] - Get single prospect
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prospect = await prisma.prospect.findFirst({
      where: {
        id: params.id,
        userId: user.id, // Verify ownership
      },
      include: {
        account: {
          select: { id: true, name: true },
        },
        prospectSequences: {
          where: { status: 'active' },
          include: {
            sequence: {
              include: {
                steps: {
                  orderBy: { order: 'asc' }
                }
              }
            }
          },
          take: 1,
        }
      }
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    // Extract current step details if in an active sequence
    let currentStepDetails = null
    if (prospect.prospectSequences?.[0]) {
      const ps = prospect.prospectSequences[0]
      const currentStep = ps.sequence.steps[ps.currentStep]
      if (currentStep) {
        currentStepDetails = {
          id: currentStep.id,
          name: currentStep.name,
          type: currentStep.type,
          order: currentStep.order,
          sequenceId: ps.sequenceId,
          sequenceName: ps.sequence.name,
        }
      }
    }

    // Remove nested data and add flattened currentStepDetails
    const { prospectSequences, ...prospectData } = prospect

    return NextResponse.json({
      prospect: {
        ...prospectData,
        currentStepDetails,
      }
    })
  } catch (error: any) {
    console.error("Error fetching prospect:", error)
    return NextResponse.json({ error: "Failed to fetch prospect" }, { status: 500 })
  }
}

// PATCH /api/prospects/[id] - Update prospect
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, title, company, location, linkedin, status, accountId: explicitAccountId } = body

    // Check if prospect exists and belongs to user
    const existingProspect = await prisma.prospect.findFirst({
      where: {
        id: params.id,
        userId: user.id, // Verify ownership
      },
    })

    if (!existingProspect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    // Validation
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    // Check if email is being changed and if new email already exists for this user
    if (email !== existingProspect.email) {
      const emailExists = await prisma.prospect.findFirst({
        where: {
          email,
          userId: user.id,
        },
      })

      if (emailExists) {
        return NextResponse.json({ error: "Email already exists for another prospect" }, { status: 400 })
      }
    }

    // Resolve accountId: explicit accountId takes priority, otherwise auto-match by company name
    let resolvedAccountId = existingProspect.accountId
    if (explicitAccountId !== undefined) {
      // Explicit link/unlink: null means unlink, string means link
      resolvedAccountId = explicitAccountId || null
      // If linking to an account, also update the company name to match
      if (resolvedAccountId) {
        const linkedAccount = await prisma.account.findFirst({
          where: { id: resolvedAccountId, userId: user.id },
          select: { name: true },
        })
        if (linkedAccount) {
          body.company = linkedAccount.name
        }
      }
    } else if (company && company !== existingProspect.company) {
      // Company changed — try to auto-match to an account
      const matchedAccount = await findMatchingAccount(user.id, company)
      resolvedAccountId = matchedAccount?.id || null
    }

    // Update prospect
    const updatedProspect = await prisma.prospect.update({
      where: { id: params.id },
      data: {
        name,
        email,
        phone: phone || null,
        title: title || null,
        company: body.company || company || null,
        location: location || null,
        linkedin: linkedin || null,
        status: status || existingProspect.status,
        accountId: resolvedAccountId,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ prospect: updatedProspect })
  } catch (error: any) {
    console.error("Error updating prospect:", error)
    return NextResponse.json(
      {
        error: "Failed to update prospect",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// DELETE /api/prospects/[id] - Delete prospect
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    })

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prospect = await prisma.prospect.findFirst({
      where: {
        id: params.id,
        userId: user.id, // Verify ownership
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    await prisma.prospect.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting prospect:", error)
    return NextResponse.json({ error: "Failed to delete prospect" }, { status: 500 })
  }
}
