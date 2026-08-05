import { NextResponse } from "next/server"
import { and, asc, eq, inArray, ne } from "drizzle-orm"
import { db } from "@/lib"
import {
  bookingTickets,
  bookings,
  categories,
  events,
  shows,
  ticketTypes,
  venueSeatLayouts,
  venues,
} from "@/db/schema"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params

    const [row] = await db
      .select({
        event: events,
        category: { id: categories.id, name: categories.name, slug: categories.slug },
        venue: {
          id: venues.id,
          name: venues.name,
          slug: venues.slug,
          description: venues.description,
          address: venues.address,
          city: venues.city,
          state: venues.state,
          country: venues.country,
          postalCode: venues.postalCode,
          capacity: venues.capacity,
        },
      })
      .from(events)
      .innerJoin(categories, eq(events.categoryId, categories.id))
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.slug, slug))
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const showList = await db
      .select({
        show: shows,
        layoutType: venueSeatLayouts.type,
      })
      .from(shows)
      .leftJoin(venueSeatLayouts, eq(venueSeatLayouts.id, shows.seatLayoutId))
      .where(eq(shows.eventId, row.event.id))
      .orderBy(asc(shows.showDate))

    const showIds = showList.map((s) => s.show.id)
    const allTicketTypes = showIds.length
      ? await db.select().from(ticketTypes).where(inArray(ticketTypes.showId, showIds))
      : []

    const occupied = new Map<string, string[]>()
    if (showIds.length) {
      const takenRows = await db
        .select({ seatNumber: bookingTickets.seatNumber, showId: bookings.showId })
        .from(bookingTickets)
        .innerJoin(bookings, eq(bookingTickets.bookingId, bookings.id))
        .where(and(inArray(bookings.showId, showIds), ne(bookings.bookingStatus, "CANCELLED")))
      for (const r of takenRows) {
        if (!r.seatNumber) continue
        const bucket = occupied.get(r.showId) ?? []
        bucket.push(r.seatNumber)
        occupied.set(r.showId, bucket)
      }
    }

    return NextResponse.json({
      event: {
        id: row.event.id,
        slug: row.event.slug,
        title: row.event.title,
        description: row.event.description,
        bannerUrl: row.event.bannerUrl,
        language: row.event.language,
        ageRestriction: row.event.ageRestriction,
        duration: row.event.duration,
        status: row.event.status,
        isFeatured: row.event.isFeatured,
        category: row.category.name,
        venue: row.venue,
      },
      shows: showList.map(({ show, layoutType }) => ({
        id: show.id,
        showDate: show.showDate,
        startTime: show.startTime,
        endTime: show.endTime,
        totalSeats: show.totalSeats,
        availableSeats: show.availableSeats,
        status: show.status,
        layoutType: layoutType ?? null,
        occupiedSeats: occupied.get(show.id) ?? [],
        ticketTypes: allTicketTypes
          .filter((t) => t.showId === show.id)
          .map((t) => ({
            id: t.id,
            name: t.name,
            price: t.price,
            quantity: t.quantity,
            remainingQuantity: t.remainingQuantity,
          })),
      })),
    })
  } catch (error) {
    console.error("GET /api/events/[slug] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
