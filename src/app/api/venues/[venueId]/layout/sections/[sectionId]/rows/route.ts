import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib"
import {
  venueSeatLayouts,
  venueSeatRows,
  venueSeatSections,
  venueSeats,
  venues,
} from "@/db/schema"
import { requireRole } from "@/lib/authorization"
import type { seatCategoryEnum } from "@/db/schema"

export const dynamic = "force-dynamic"
export const revalidate = 0

type Category = (typeof seatCategoryEnum.enumValues)[number]
const VALID_CATEGORIES: Category[] = [
  "REGULAR",
  "PREMIUM",
  "RECLINER",
  "VIP",
  "GOLD",
  "SILVER",
  "WHEELCHAIR",
]

// POST /api/venues/[venueId]/layout/sections/[sectionId]/rows
// body: { label, seatCount, category? }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ venueId: string; sectionId: string }> }
) {
  try {
    const access = await requireRole("ORGANIZER", "ADMIN")
    if (access.status) {
      return NextResponse.json(
        { error: access.status === 401 ? "Authentication required" : "Organizer access required" },
        { status: access.status }
      )
    }

    const { venueId, sectionId } = await params

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

    const [section] = await db
      .select()
      .from(venueSeatSections)
      .where(inArray(venueSeatSections.id, [sectionId]))
      .limit(1)
    if (!section || section.seatLayoutId !== layout.id) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 })
    }

    const body = (await req.json()) as {
      label?: string
      seatCount?: number
      category?: Category
    }
    const label = body.label?.trim()
    if (!label) return NextResponse.json({ error: "Row label is required" }, { status: 400 })
    const seatCount = Number(body.seatCount)
    if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 100) {
      return NextResponse.json({ error: "seatCount must be 1-100" }, { status: 400 })
    }
    const category = body.category ?? "REGULAR"
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid seat category" }, { status: 400 })
    }

    const top = await db
      .select({ sortOrder: venueSeatRows.sortOrder })
      .from(venueSeatRows)
      .where(eq(venueSeatRows.sectionId, sectionId))
      .orderBy(desc(venueSeatRows.sortOrder))
      .limit(1)

    const rowId = randomUUID()
    const sortOrder = top[0]?.sortOrder ?? 0

    await db.insert(venueSeatRows).values({
      id: rowId,
      seatLayoutId: layout.id,
      sectionId,
      label,
      seatCount,
      sortOrder: sortOrder + 1,
      category,
    })

    await db.insert(venueSeats).values(
      Array.from({ length: seatCount }, (_, i) => ({
        id: randomUUID(),
        seatLayoutId: layout.id,
        rowId,
        seatNumber: i + 1,
        category,
        isWheelchair: false,
        isBlocked: false,
        isAisle: false,
        sortOrder: i,
      }))
    )

    return NextResponse.json({ success: true, rowId, label, seatCount }, { status: 201 })
  } catch (error) {
    console.error("POST row error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}