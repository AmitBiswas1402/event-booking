import { NextResponse } from "next/server"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/lib"
import {
  seatTemplates,
  venueSeatLayouts,
  venueSeatRows,
  venueSeatSections,
  venueSeats,
  venues,
} from "@/db/schema"
import { requireRole } from "@/lib/authorization"
import { cloneTemplateToVenue } from "@/lib/seatLayout"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function loadOwnedVenue(venueId: string, organizerId: string) {
  const [venue] = await db
    .select()
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1)
  if (!venue) return null
  if (venue.organizerId !== organizerId) return null
  return venue
}

export async function GET(
  _req: Request,
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
    const venue = await loadOwnedVenue(venueId, access.user.id)
    if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 })

    const [layout] = await db
      .select({
        layout: venueSeatLayouts,
        template: { id: seatTemplates.id, name: seatTemplates.name },
      })
      .from(venueSeatLayouts)
      .innerJoin(seatTemplates, eq(seatTemplates.id, venueSeatLayouts.sourceTemplateId))
      .where(eq(venueSeatLayouts.venueId, venueId))
      .limit(1)

    if (!layout) {
      return NextResponse.json({ venue, layout: null })
    }

    const sections = await db
      .select()
      .from(venueSeatSections)
      .where(eq(venueSeatSections.seatLayoutId, layout.layout.id))
      .orderBy(venueSeatSections.sortOrder)

    const sectionIds = sections.map((s) => s.id)
    const rows = sectionIds.length
      ? await db
          .select()
          .from(venueSeatRows)
          .where(inArray(venueSeatRows.sectionId, sectionIds))
          .orderBy(venueSeatRows.sortOrder)
      : []

    const rowIds = rows.map((r) => r.id)
    const seatList = rowIds.length
      ? await db
          .select()
          .from(venueSeats)
          .where(inArray(venueSeats.rowId, rowIds))
          .orderBy(venueSeats.sortOrder)
      : []

    const rowsBySection = groupBy(rows, (r) => r.sectionId)
    const seatsByRow = groupBy(seatList, (s) => s.rowId)

    return NextResponse.json({
      venue,
      layout: {
        id: layout.layout.id,
        type: layout.layout.type,
        template: layout.template.name,
        sections: sections.map((section) => ({
          id: section.id,
          name: section.name,
          hasSeats: section.hasSeats,
          capacity: section.capacity,
          rows: (rowsBySection.get(section.id) ?? []).map((row) => ({
            id: row.id,
            label: row.label,
            seatCount: row.seatCount,
            category: row.category,
            seats: (seatsByRow.get(row.id) ?? []).map((seat) => ({
              id: seat.id,
              seatNumber: seat.seatNumber,
              category: seat.category,
              isWheelchair: seat.isWheelchair,
              isBlocked: seat.isBlocked,
              isAisle: seat.isAisle,
              sortOrder: seat.sortOrder,
            })),
          })),
        })),
      },
    })
  } catch (error) {
    console.error("GET /api/venues/[venueId]/layout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ==========================================================
// POST : attach a template to the venue (clone its geometry)
// ==========================================================

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
    const venue = await loadOwnedVenue(venueId, access.user.id)
    if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 })

    const body = (await req.json()) as { templateId?: string }
    if (!body.templateId?.trim()) {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 })
    }

    const [template] = await db
      .select()
      .from(seatTemplates)
      .where(eq(seatTemplates.id, body.templateId))
      .limit(1)
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 })

    const [existing] = await db
      .select({ id: venueSeatLayouts.id })
      .from(venueSeatLayouts)
      .where(eq(venueSeatLayouts.venueId, venueId))
      .limit(1)
    if (existing) {
      return NextResponse.json(
        { error: "This venue already has a seat layout" },
        { status: 409 }
      )
    }

    const cloned = await cloneTemplateToVenue(venueId, template.id)

    await db.update(venues).set({ capacity: cloned.capacity }).where(eq(venues.id, venueId))

    return NextResponse.json(
      {
        success: true,
        layout: {
          id: cloned.layoutId,
          type: cloned.type,
          capacity: cloned.capacity,
          sectionCount: cloned.sectionCount,
          rowCount: cloned.rowCount,
          seatCount: cloned.seatCount,
        },
        message: `Layout applied from "${template.name}"`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/venues/[venueId]/layout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    const bucket = map.get(key)
    if (bucket) bucket.push(item)
    else map.set(key, [item])
  }
  return map
}