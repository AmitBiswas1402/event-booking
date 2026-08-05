import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib"
import { venueSeatLayouts, venueSeatSections, venues } from "@/db/schema"
import { requireRole } from "@/lib/authorization"

export const dynamic = "force-dynamic"
export const revalidate = 0

// POST /api/venues/[venueId]/layout/sections
// body: { name, hasSeats?, capacity? }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const access = await requireRole("ORGANIZER", "ADMIN")
    if (access.status) {
      return NextResponse.json(
        { error: access.status === 401 ? "Authentication required" : "Organizer access required" },
        { status: access.status }
      )
    }

    const { venueId } = await params

    const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1)
    if (!venue || venue.organizerId !== access.user.id) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 })
    }

    const [layout] = await db
      .select()
      .from(venueSeatLayouts)
      .where(eq(venueSeatLayouts.venueId, venueId))
      .limit(1)
    if (!layout) return NextResponse.json({ error: "Venue has no layout yet" }, { status: 409 })

    const body = (await req.json()) as {
      name?: string
      hasSeats?: boolean
      capacity?: number
    }
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Section name is required" }, { status: 400 })
    }

    const top = await db
      .select({ sortOrder: venueSeatSections.sortOrder })
      .from(venueSeatSections)
      .where(eq(venueSeatSections.seatLayoutId, layout.id))
      .orderBy(desc(venueSeatSections.sortOrder))
      .limit(1)

    const [section] = await db
      .insert(venueSeatSections)
      .values({
        id: randomUUID(),
        seatLayoutId: layout.id,
        name: body.name.trim(),
        description: null,
        sortOrder: (top[0]?.sortOrder ?? 0) + 1,
        hasSeats: body.hasSeats ?? false,
        capacity: body.capacity ?? null,
      })
      .returning({ id: venueSeatSections.id })

    return NextResponse.json({ success: true, sectionId: section.id }, { status: 201 })
  } catch (error) {
    console.error("POST sections error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}