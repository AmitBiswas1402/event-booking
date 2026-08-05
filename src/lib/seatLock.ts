import { and, eq, gte, inArray, lt, sql } from "drizzle-orm"
import { db } from "@/lib"
import { showSeats } from "@/db/schema"

// How long a seat stays "HELD" before returning to AVAILABLE.
// This is the audience countdown deadline.
export const HOLD_DURATION_MS = 10 * 60 * 1000 // 10 minutes

// ============================================================
// Expire stale holds. Called before every fresh hold and by a
// periodic sweeper job. Expired seats revert to AVAILABLE.
// ============================================================

export async function releaseExpiredHolds(showId?: string) {
  const now = new Date()
  const where = showId
    ? and(
        eq(showSeats.showId, showId),
        eq(showSeats.status, "HELD"),
        lt(showSeats.heldUntil, now)
      )
    : and(eq(showSeats.status, "HELD"), lt(showSeats.heldUntil, now))

  const res = await db
    .update(showSeats)
    .set({ status: "AVAILABLE", heldBy: null, heldUntil: null, heldToken: null })
    .where(where)
    .returning({ id: showSeats.id })

  return res.length
}

// ============================================================
// Atomically HOLD a set of seats. Only AVAILABLE seats can be
// claimed via a single guarded UPDATE, so concurrent users can
// never double-hold the same seat.
// ============================================================

export type HoldOutcome = {
  claimed: { seatId: string; token: string; heldUntil: Date }[]
  conflicts: { seatId: string; reason: string }[]
  missing: string[]
}

export async function holdSeats(
  showId: string,
  userId: string,
  requestedSeats: string[]
): Promise<HoldOutcome> {
  await releaseExpiredHolds(showId)

  const heldUntil = new Date(Date.now() + HOLD_DURATION_MS)

  const claimed = await db
    .update(showSeats)
    .set({
      status: "HELD",
      heldBy: userId,
      heldUntil,
      // gen_random_uuid() is evaluated PER ROW, so every claimed seat
      // gets its own unique token (required by the unique index).
      heldToken: sql`gen_random_uuid()::text`,
    })
    .where(
      and(
        eq(showSeats.showId, showId),
        inArray(showSeats.id, requestedSeats),
        eq(showSeats.status, "AVAILABLE")
      )
    )
    .returning({ id: showSeats.id, heldToken: showSeats.heldToken, heldUntil: showSeats.heldUntil })

  const claimedIds = new Set(claimed.map((c) => c.id))
  const unclaimed = requestedSeats.filter((id) => !claimedIds.has(id))

  const conflicts: HoldOutcome["conflicts"] = []
  const missing: string[] = []

  if (unclaimed.length) {
    const existing = await db
      .select({ id: showSeats.id, status: showSeats.status })
      .from(showSeats)
      .where(and(eq(showSeats.showId, showId), inArray(showSeats.id, unclaimed)))

    const foundIds = new Set(existing.map((e) => e.id))
    const statusById = new Map(existing.map((e) => [e.id, e.status]))
    for (const id of unclaimed) {
      if (!foundIds.has(id)) missing.push(id)
      else conflicts.push({ seatId: id, reason: statusById.get(id) ?? "UNAVAILABLE" })
    }
  }

  return {
    claimed: claimed.map((c) => ({
      seatId: c.id,
      token: c.heldToken as string,
      heldUntil: c.heldUntil as Date,
    })),
    conflicts,
    missing,
  }
}

// ============================================================
// Release a hold back to AVAILABLE (owner-only, token-gated).
// ============================================================

export async function releaseSeats(
  showId: string,
  userId: string,
  seatIds: string[],
  token?: string
): Promise<number> {
  const conditions = and(
    eq(showSeats.showId, showId),
    inArray(showSeats.id, seatIds),
    eq(showSeats.heldBy, userId),
    token ? eq(showSeats.heldToken, token) : undefined,
    eq(showSeats.status, "HELD")
  )
  const res = await db
    .update(showSeats)
    .set({ status: "AVAILABLE", heldBy: null, heldUntil: null, heldToken: null })
    .where(conditions)
    .returning({ id: showSeats.id })
  return res.length
}

// ============================================================
// Turn HELD seats into BOOKED (booking confirmation, token-gated
// and time-gated so an expired hold cannot be confirmed).
// Returns the affected seat rows for the booking / QR snapshot.
// ============================================================

export async function consumeHeldSeats(
  showId: string,
  userId: string,
  seatIds: string[],
  token?: string
) {
  const res = await db
    .update(showSeats)
    .set({ status: "BOOKED", heldBy: null, heldUntil: null, heldToken: null })
    .where(
      and(
        eq(showSeats.showId, showId),
        inArray(showSeats.id, seatIds),
        eq(showSeats.heldBy, userId),
        token ? eq(showSeats.heldToken, token) : undefined,
        eq(showSeats.status, "HELD"),
        gte(showSeats.heldUntil, new Date())
      )
    )
    .returning({ id: showSeats.id, label: showSeats.label, price: showSeats.price })

  return res
}