import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib"
import { shows } from "@/db/schema"
import { requireRole } from "@/lib/authorization"
import { holdSeats, releaseSeats } from "@/lib/seatLock"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST(
  req: Request,
  { params }: { params: Promise<{ showId: string }> }
) {
  try {
    const access = await requireRole("AUDIENCE", "ADMIN")
    if (access.status) {
      return NextResponse.json(
        { error: access.status === 401 ? "Authentication required" : "Audience access required" },
        { status: access.status }
      )
    }

    const { showId } = await params

    const [show] = await db.select().from(shows).where(eq(shows.id, showId)).limit(1)
    if (!show) return NextResponse.json({ error: "Show not found" }, { status: 404 })
    if (show.status !== "SCHEDULED") {
      return NextResponse.json({ error: "This show is not accepting bookings" }, { status: 400 })
    }
    if ((show.availableSeats ?? 0) <= 0) {
      return NextResponse.json({ error: "This show is sold out" }, { status: 400 })
    }

    const body = (await req.json()) as { seatIds?: string[] }
    if (!Array.isArray(body.seatIds) || body.seatIds.length === 0) {
      return NextResponse.json({ error: "seatIds are required" }, { status: 400 })
    }
    if (body.seatIds.length > 10) {
      return NextResponse.json({ error: "You can hold at most 10 seats at once" }, { status: 400 })
    }

    const outcome = await holdSeats(showId, access.user.id, body.seatIds)

    return NextResponse.json({
      success: outcome.claimed.length > 0,
      claimed: outcome.claimed,
      conflicts: outcome.conflicts,
      missing: outcome.missing,
      expiresInMs: 10 * 60 * 1000,
    })
  } catch (error) {
    console.error("POST /api/shows/[showId]/seats hold error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ showId: string }> }
) {
  try {
    const access = await requireRole("AUDIENCE", "ADMIN")
    if (access.status) {
      return NextResponse.json(
        { error: access.status === 401 ? "Authentication required" : "Audience access required" },
        { status: access.status }
      )
    }

    const { showId } = await params
    const body = (await req.json().catch(() => null)) as {
      seatIds?: string[]
      token?: string
    } | null

    if (!body || !Array.isArray(body.seatIds) || body.seatIds.length === 0) {
      return NextResponse.json({ error: "seatIds are required" }, { status: 400 })
    }

    const released = await releaseSeats(showId, access.user.id, body.seatIds, body.token)

    return NextResponse.json({ success: true, released })
  } catch (error) {
    console.error("DELETE hold error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}