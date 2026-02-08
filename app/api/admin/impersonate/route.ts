import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/auth/api-middleware"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// POST /api/admin/impersonate - Start impersonating a user
export const POST = withSuperAdmin(async (request: NextRequest, admin) => {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Don't allow impersonating yourself
    if (targetUser.id === admin.id) {
      return NextResponse.json({ error: "Cannot impersonate yourself" }, { status: 400 })
    }

    const response = NextResponse.json({
      message: "Impersonation started",
      user: targetUser,
    })

    // Set impersonation cookie (httpOnly so it can't be tampered with client-side)
    response.cookies.set("impersonating_user_id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 4, // 4 hours max
    })

    return response
  } catch (error) {
    console.error("Error starting impersonation:", error)
    return NextResponse.json({ error: "Failed to start impersonation" }, { status: 500 })
  }
})

// DELETE /api/admin/impersonate - Stop impersonating
export const DELETE = withSuperAdmin(async () => {
  const response = NextResponse.json({ message: "Impersonation stopped" })

  response.cookies.set("impersonating_user_id", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // Delete immediately
  })

  return response
})
