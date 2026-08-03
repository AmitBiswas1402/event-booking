import { currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { desc, eq, or } from "drizzle-orm"
import { db } from "@/lib"
import { users } from "@/db/schema"
import { ADMIN_EMAIL, errorMessage, getCurrentDbUser, requireRole, type UserRole } from "@/lib/authorization"

export const dynamic = 'force-dynamic'
export const revalidate = 0

type RolePayload = { role?: unknown }

async function syncUserInDb(clerkUser: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase().trim()
  if (!email) return null

  const isAdmin = email === ADMIN_EMAIL

  const [existing] = await db
    .select()
    .from(users)
    .where(or(eq(users.clerkId, clerkUser.id), eq(users.email, email)))
    .limit(1)

  const profile = {
    clerkId: clerkUser.id,
    email,
    firstName: clerkUser.firstName || null,
    lastName: clerkUser.lastName || null,
    imageUrl: clerkUser.imageUrl || null,
    updatedAt: new Date(),
  }

  if (!existing) {
    await db.insert(users).values({ ...profile, role: isAdmin ? "ADMIN" : "AUDIENCE" })
  } else {
    const newRole = isAdmin ? "ADMIN" : existing.role
    await db
      .update(users)
      .set({ ...profile, role: newRole })
      .where(eq(users.id, existing.id))
  }

  const [saved] = await db
    .select()
    .from(users)
    .where(or(eq(users.clerkId, clerkUser.id), eq(users.email, email)))
    .limit(1)

  return saved
}

// Returns the signed-in user's own profile. Listing users is admin-only.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role")
    const current = await getCurrentDbUser()
    if (!current) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

    if (!role) return NextResponse.json(current)
    const access = await requireRole("ADMIN")
    if (access.status) return NextResponse.json({ error: "Admin access required" }, { status: access.status })
    if (!(["AUDIENCE", "ORGANIZER", "ADMIN"] as const).includes(role as UserRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }
    const list = await db.select().from(users).where(eq(users.role, role as UserRole)).orderBy(desc(users.createdAt))
    return NextResponse.json(list)
  } catch (error) {
    console.error("GET /api/users error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Sync the authenticated Clerk profile. The browser never chooses its Clerk ID or admin status.
export async function POST() {
  try {
    const clerkUser = await currentUser()
    if (!clerkUser) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    const saved = await syncUserInDb(clerkUser)
    if (!saved) return NextResponse.json({ error: "An email address is required" }, { status: 400 })
    return NextResponse.json(saved)
  } catch (error) {
    console.error("POST /api/users error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// One-time role selection for the current authenticated user.
export async function PATCH(req: Request) {
  try {
    const clerkUser = await currentUser()
    if (!clerkUser) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

    const dbUser = await syncUserInDb(clerkUser)
    if (!dbUser) return NextResponse.json({ error: "An email address is required" }, { status: 400 })

    // If role already assigned, treat as success
    if (dbUser.role) return NextResponse.json({ success: true, role: dbUser.role, alreadyAssigned: true })

    const body = (await req.json()) as RolePayload
    if (body.role !== "AUDIENCE" && body.role !== "ORGANIZER") {
      return NextResponse.json({ error: "Role must be AUDIENCE or ORGANIZER" }, { status: 400 })
    }

    await db.update(users).set({ role: body.role, updatedAt: new Date() }).where(eq(users.id, dbUser.id))

    // Send Welcome Email via Resend in the background
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress
    if (userEmail) {
      fetch(`${req.headers.get("origin") || "http://localhost:3000"}/api/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "WELCOME",
          to: userEmail,
          customerName: clerkUser.firstName || "Friend",
        }),
      }).catch((err) => console.error("Welcome email dispatch error:", err))
    }

    return NextResponse.json({ success: true, role: body.role })
  } catch (error) {
    console.error("PATCH /api/users error:", error)
    return NextResponse.json({ error: errorMessage(error, "Internal server error") }, { status: 500 })
  }
}
