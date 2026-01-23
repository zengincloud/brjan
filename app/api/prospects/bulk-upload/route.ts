import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Papa from "papaparse"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()

    const results = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    })

    if (results.errors.length > 0) {
      return NextResponse.json(
        { error: "Failed to parse CSV", details: results.errors },
        { status: 400 }
      )
    }

    const prospects = []
    const errors: string[] = []

    for (const [index, row] of (results.data as any[]).entries()) {
      const name = row.name || row.Name
      const email = row.email || row.Email
      const title = row.title || row.Title || null
      const company = row.company || row.Company || null
      const phone = row.phone || row.Phone || null

      if (!name || !email) {
        errors.push(`Row ${index + 1}: Missing required fields (name, email)`)
        continue
      }

      prospects.push({
        name,
        email,
        title,
        company,
        phone,
      })
    }

    if (prospects.length === 0) {
      return NextResponse.json(
        { error: "No valid prospects found in CSV", details: errors },
        { status: 400 }
      )
    }

    // Insert prospects in batch
    let created = 0
    const duplicates: string[] = []

    for (const prospect of prospects) {
      try {
        await prisma.prospect.create({
          data: prospect,
        })
        created++
      } catch (error: any) {
        if (error.code === "P2002") {
          duplicates.push(prospect.email)
        } else {
          console.error("Error creating prospect:", error)
        }
      }
    }

    return NextResponse.json({
      count: created,
      total: prospects.length,
      duplicates: duplicates.length,
      errors: errors.length,
      message: `Successfully created ${created} prospects. ${duplicates.length} duplicates skipped. ${errors.length} rows had errors.`,
    })
  } catch (error) {
    console.error("Error processing bulk upload:", error)
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 })
  }
}
