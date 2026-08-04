import { currentUser } from "@clerk/nextjs/server"
import { eq, or } from "drizzle-orm"
import { users } from "@/db/schema"
import { db } from "@/lib"

export const ADMIN_EMAIL = "amit.142biswas@gmail.com"
export type UserRole = "AUDIENCE" | "ORGANIZER" | "ADMIN"

export type CurrentDbUser = {
  id: string
  clerkId: string
  email: string
  role: UserRole | null
}

export async function getCurrentDbUser(): Promise<CurrentDbUser | null> {
  const clerkUser = await currentUser()
  if (!clerkUser) return null
  const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase().trim()

  const [user] = await db
    .select({ id: users.id, clerkId: users.clerkId, email: users.email, role: users.role })
    .from(users)
    .where(
      email
        ? or(eq(users.clerkId, clerkUser.id), eq(users.email, email))
        : eq(users.clerkId, clerkUser.id)
    )
    .limit(1)

  return user ?? null
}

export async function requireCurrentUser() {
  return getCurrentDbUser()
}

export async function requireRole(...roles: UserRole[]) {
  const user = await getCurrentDbUser()
  if (!user) return { user: null, status: 401 as const }
  if (!user.role || !roles.includes(user.role)) return { user: null, status: 403 as const }
  return { user, status: null }
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
