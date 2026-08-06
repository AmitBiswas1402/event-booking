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
import { requireRole } from "@/lib/authorization"

export const dynamic = "force-dynamic"
export const revalidate = 0

// ─── GET /api/events/[slug] ───────────────────────────────────────────────────
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
          layoutImageUrl: venues.layoutImageUrl,
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
      .select({ show: shows, layoutType: venueSeatLayouts.type })
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
        categoryId: row.event.categoryId,
        category: row.category.name,
        venue: { ...row.venue, layoutImageUrl: row.venue.layoutImageUrl ?? null },
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
            seatCategory: t.seatCategory,
          })),
      })),
    })
  } catch (error) {
    console.error("GET /api/events/[slug] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── PATCH /api/events/[slug] — full event + venue update ────────────────────
type PatchBody = {
  title?: string
  description?: string | null
  bannerUrl?: string | null
  language?: string | null
  ageRestriction?: string | null
  duration?: number | null
  categoryId?: string
  status?: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED"
  venue?: {
    name?: string
    address?: string
    city?: string
    state?: string
    postalCode?: string | null
    description?: string | null
    layoutImageUrl?: string | null
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const access = await requireRole("ORGANIZER", "ADMIN")
    if (access.status) {
      return NextResponse.json(
        { error: access.status === 401 ? "Authentication required" : "Organizer access required" },
        { status: access.status }
      )
    }

    const { slug } = await params
    const body = (await req.json()) as PatchBody

    // Fetch event + venue and confirm ownership
    const [row] = await db
      .select({ event: events, venue: venues })
      .from(events)
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.slug, slug))
      .limit(1)

    if (!row) return NextResponse.json({ error: "Event not found" }, { status: 404 })
    if (row.event.organizerId !== access.user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    // Validate category if provided
    if (body.categoryId && body.categoryId !== row.event.categoryId) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, body.categoryId))
        .limit(1)
      if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 400 })
    }

    const now = new Date()

    // Update events table
    const eventPatch: Record<string, unknown> = { updatedAt: now }
    if (body.title !== undefined) eventPatch.title = body.title.trim()
    if (body.description !== undefined) eventPatch.description = body.description
    if (body.bannerUrl !== undefined) eventPatch.bannerUrl = body.bannerUrl
    if (body.language !== undefined) eventPatch.language = body.language
    if (body.ageRestriction !== undefined) eventPatch.ageRestriction = body.ageRestriction
    if (body.duration !== undefined) eventPatch.duration = body.duration
    if (body.categoryId !== undefined) eventPatch.categoryId = body.categoryId
    if (body.status !== undefined) eventPatch.status = body.status

    await db.update(events).set(eventPatch).where(eq(events.id, row.event.id))

    // Update venues table
    if (body.venue) {
      const venuePatch: Record<string, unknown> = { updatedAt: now }
      if (body.venue.name !== undefined) venuePatch.name = body.venue.name.trim()
      if (body.venue.address !== undefined) venuePatch.address = body.venue.address
      if (body.venue.city !== undefined) venuePatch.city = body.venue.city
      if (body.venue.state !== undefined) venuePatch.state = body.venue.state
      if (body.venue.postalCode !== undefined) venuePatch.postalCode = body.venue.postalCode
      if (body.venue.description !== undefined) venuePatch.description = body.venue.description
      if (body.venue.layoutImageUrl !== undefined) venuePatch.layoutImageUrl = body.venue.layoutImageUrl
      await db.update(venues).set(venuePatch).where(eq(venues.id, row.venue.id))
    }

    return NextResponse.json({ success: true, slug })
  } catch (error) {
    console.error("PATCH /api/events/[slug] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
