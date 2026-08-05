import { NextResponse } from "next/server"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/lib"
import {
  shows,
  showSeats,
  ticketTypes,
  venueSeatLayouts,
  venueSeatRows,
  venueSeatSections,
  venueSeats,
} from "@/db/schema"
import { releaseExpiredHolds } from "@/lib/seatLock"

export const dynamic = "force-dynamic"
export const revalidate = 0

// GET /api/shows/[showId]/seats
// Public seat map: layout geometry + per-seat live state.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ showId: string }> }
) {
  try {
    const { showId } = await params

    const [show] = await db.select().from(shows).where(eq(shows.id, showId)).limit(1)
    if (!show) return NextResponse.json({ error: "Show not found" }, { status: 404 })

    // Tidy stale holds on read so the map is accurate.
    await releaseExpiredHolds(showId)

    const ticketList = await db
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.showId, showId))

    if (!show.seatLayoutId) {
      // GA / seatless show: expose ticket types only.
      return NextResponse.json({
        showId,
        type: "GENERAL_ADMISSION",
        show: {
          totalSeats: show.totalSeats,
          availableSeats: show.availableSeats,
          status: show.status,
        },
        ticketTypes: ticketList.map((t) => ({
          id: t.id,
          name: t.name,
          seatCategory: t.seatCategory,
          price: t.price,
          remainingQuantity: t.remainingQuantity,
        })),
        sections: [],
      })
    }

    const layoutId = show.seatLayoutId

    const [layoutRow] = await db
      .select()
      .from(venueSeatLayouts)
      .where(eq(venueSeatLayouts.id, layoutId))
      .limit(1)
    if (!layoutRow) return NextResponse.json({ error: "Show layout not found" }, { status: 404 })

    const sections = await db
      .select()
      .from(venueSeatSections)
      .where(eq(venueSeatSections.seatLayoutId, layoutId))
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

    // Live seat state joined with the physical venue seat to get row + wheelchair info.
    const liveRows = rowIds.length
      ? await db
          .select({
            id: showSeats.id,
            venueSeatId: showSeats.venueSeatId,
            rowId: venueSeats.rowId,
            seatNumber: venueSeats.seatNumber,
            label: showSeats.label,
            category: showSeats.category,
            price: showSeats.price,
            status: showSeats.status,
            isWheelchair: venueSeats.isWheelchair,
            isAisle: venueSeats.isAisle,
            heldUntil: showSeats.heldUntil,
          })
          .from(showSeats)
          .innerJoin(venueSeats, eq(venueSeats.id, showSeats.venueSeatId))
          .where(inArray(showSeats.showId, [showId]))
      : []

    return NextResponse.json({
      showId,
      type: layoutRow.type,
      show: {
        totalSeats: show.totalSeats,
        availableSeats: show.availableSeats,
        status: show.status,
      },
      sections: sections.map((section) => ({
        id: section.id,
        name: section.name,
        hasSeats: section.hasSeats,
        capacity: section.capacity,
        rows: rows
          .filter((r) => r.sectionId === section.id)
          .map((row) => ({
            id: row.id,
            label: row.label,
            category: row.category,
            seats: liveRows
              .filter((s) => s.rowId === row.id)
              .sort((a, b) => a.seatNumber - b.seatNumber)
              .map((s) => ({
                id: s.id,
                venueSeatId: s.venueSeatId,
                label: s.label,
                category: s.category,
                price: s.price,
                status: s.status,
                isWheelchair: s.isWheelchair,
                isAisle: s.isAisle,
                heldUntil: s.heldUntil,
              })),
          })),
      })),
      ticketTypes: ticketList.map((t) => ({
        id: t.id,
        name: t.name,
        seatCategory: t.seatCategory,
        price: t.price,
        remainingQuantity: t.remainingQuantity,
      })),
    })
  } catch (error) {
    console.error("GET /api/shows/[showId]/seats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}