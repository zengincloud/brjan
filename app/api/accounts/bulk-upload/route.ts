import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"
import { checkCredits, deductCredits } from "@/lib/credits"
import Papa from "papaparse"

export const dynamic = 'force-dynamic'

export const POST = withAuth(async (request: NextRequest, userId: string) => {
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

    const accounts = []
    const errors: string[] = []

    for (const [index, row] of (results.data as any[]).entries()) {
      const name = row.name || row.Name
      const industry = row.industry || row.Industry || null
      const location = row.location || row.Location || null
      const website = row.website || row.Website || null
      const employeesStr = row.employees || row.Employees || null
      const employees = employeesStr ? parseInt(employeesStr) : null

      if (!name) {
        errors.push(`Row ${index + 1}: Missing required field (name)`)
        continue
      }

      accounts.push({
        name,
        industry,
        location,
        website,
        employees: employees && !isNaN(employees) ? employees : null,
        userId,
      })
    }

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "No valid accounts found in CSV", details: errors },
        { status: 400 }
      )
    }

    // Check initial credits
    const creditCheck = await checkCredits(userId)
    if (!creditCheck.allowed) {
      return NextResponse.json({ error: creditCheck.error }, { status: 403 })
    }

    // Insert accounts in batch, checking credits before each
    let created = 0
    const duplicates: string[] = []
    let creditsExhausted = false

    for (const account of accounts) {
      // Check if user still has credits
      const check = await checkCredits(userId)
      if (!check.allowed) {
        creditsExhausted = true
        break
      }

      try {
        await prisma.account.create({
          data: account,
        })
        await deductCredits(userId)
        created++
      } catch (error: any) {
        if (error.code === "P2002") {
          duplicates.push(account.name)
        } else {
          console.error("Error creating account:", error)
        }
      }
    }

    return NextResponse.json({
      count: created,
      total: accounts.length,
      duplicates: duplicates.length,
      errors: errors.length,
      creditsExhausted,
      message: creditsExhausted
        ? `Created ${created} of ${accounts.length} accounts before running out of credits. Upgrade your plan for more.`
        : `Successfully created ${created} accounts. ${duplicates.length} duplicates skipped. ${errors.length} rows had errors.`,
    })
  } catch (error) {
    console.error("Error processing bulk upload:", error)
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 })
  }
})
