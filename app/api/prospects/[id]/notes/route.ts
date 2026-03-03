import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

// PATCH /api/prospects/[id]/notes — Update prospect notes
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

    const { notes } = await request.json()

    await prisma.prospect.updateMany({
      where: { id: params.id, userId: user.id },
      data: { notes: notes || null },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error updating prospect notes:", error)
    return NextResponse.json({ error: "Failed to update notes" }, { status: 500 })
  }
}
