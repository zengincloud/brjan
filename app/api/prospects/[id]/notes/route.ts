import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

type NoteEntry = {
  id: string
  text: string
  date: string
  initials: string
  userId: string
}

function parseNotes(notes: string | null): NoteEntry[] {
  if (!notes) return []
  try {
    const parsed = JSON.parse(notes)
    if (Array.isArray(parsed)) return parsed
    // Legacy single string — convert to entry
    return [{ id: crypto.randomUUID(), text: parsed, date: new Date().toISOString(), initials: '??', userId: '' }]
  } catch {
    // Legacy plain text note — convert to entry
    if (notes.trim()) {
      return [{ id: crypto.randomUUID(), text: notes, date: new Date().toISOString(), initials: '??', userId: '' }]
    }
    return []
  }
}

// GET /api/prospects/[id]/notes — Get prospect notes
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
      where: { id: params.id, userId: user.id },
      select: { notes: true },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    return NextResponse.json({ notes: parseNotes(prospect.notes) })
  } catch (error: any) {
    console.error("Error fetching prospect notes:", error)
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 })
  }
}

// POST /api/prospects/[id]/notes — Add a new note entry
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    const { text } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: "Note text is required" }, { status: 400 })
    }

    const prospect = await prisma.prospect.findFirst({
      where: { id: params.id, userId: user.id },
      select: { notes: true },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    const initials = [user.firstName, user.lastName]
      .filter(Boolean)
      .map(n => n!.charAt(0).toUpperCase())
      .join('') || user.email.substring(0, 2).toUpperCase()

    const existingNotes = parseNotes(prospect.notes)
    const newNote: NoteEntry = {
      id: crypto.randomUUID(),
      text: text.trim(),
      date: new Date().toISOString(),
      initials,
      userId: user.id,
    }

    const updatedNotes = [newNote, ...existingNotes]

    await prisma.prospect.updateMany({
      where: { id: params.id, userId: user.id },
      data: { notes: JSON.stringify(updatedNotes) },
    })

    return NextResponse.json({ success: true, note: newNote, notes: updatedNotes })
  } catch (error: any) {
    console.error("Error adding prospect note:", error)
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 })
  }
}

// DELETE /api/prospects/[id]/notes — Delete a note entry
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

    const { noteId } = await request.json()

    const prospect = await prisma.prospect.findFirst({
      where: { id: params.id, userId: user.id },
      select: { notes: true },
    })

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
    }

    const existingNotes = parseNotes(prospect.notes)
    const updatedNotes = existingNotes.filter(n => n.id !== noteId)

    await prisma.prospect.updateMany({
      where: { id: params.id, userId: user.id },
      data: { notes: updatedNotes.length > 0 ? JSON.stringify(updatedNotes) : null },
    })

    return NextResponse.json({ success: true, notes: updatedNotes })
  } catch (error: any) {
    console.error("Error deleting prospect note:", error)
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 })
  }
}

// PATCH /api/prospects/[id]/notes — Legacy: set notes as plain string (used by dialer/extension)
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

    // If it's a plain text note (from extension/dialer), convert to structured format
    if (notes && typeof notes === 'string') {
      const prospect = await prisma.prospect.findFirst({
        where: { id: params.id, userId: user.id },
        select: { notes: true },
      })

      if (!prospect) {
        return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
      }

      const initials = [user.firstName, user.lastName]
        .filter(Boolean)
        .map(n => n!.charAt(0).toUpperCase())
        .join('') || user.email.substring(0, 2).toUpperCase()

      // Check if the incoming note is already JSON
      let isJson = false
      try { JSON.parse(notes); isJson = true } catch {}

      if (!isJson) {
        const existingNotes = parseNotes(prospect.notes)
        const newNote: NoteEntry = {
          id: crypto.randomUUID(),
          text: notes.trim(),
          date: new Date().toISOString(),
          initials,
          userId: user.id,
        }
        const updatedNotes = [newNote, ...existingNotes]

        await prisma.prospect.updateMany({
          where: { id: params.id, userId: user.id },
          data: { notes: JSON.stringify(updatedNotes) },
        })
      } else {
        await prisma.prospect.updateMany({
          where: { id: params.id, userId: user.id },
          data: { notes },
        })
      }
    } else {
      await prisma.prospect.updateMany({
        where: { id: params.id, userId: user.id },
        data: { notes: notes || null },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error updating prospect notes:", error)
    return NextResponse.json({ error: "Failed to update notes" }, { status: 500 })
  }
}
