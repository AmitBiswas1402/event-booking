import { db } from "../lib"
import { users } from "../db/schema"
import { eq, ne } from "drizzle-orm"

async function resetNonAdminsToNull() {
  console.log("Setting non-admin accounts role to NULL (blank)...")

  // Set admin account
  await db.update(users).set({ role: "ADMIN" }).where(eq(users.email, "amit.142biswas@gmail.com"))

  // Set all other accounts role to NULL
  await db.update(users).set({ role: null }).where(ne(users.email, "amit.142biswas@gmail.com"))

  const all = await db.select().from(users)
  console.log("Current DB Users state:")
  console.log(JSON.stringify(all.map(u => ({ email: u.email, role: u.role })), null, 2))
  process.exit(0)
}

resetNonAdminsToNull().catch(err => {
  console.error(err)
  process.exit(1)
})
