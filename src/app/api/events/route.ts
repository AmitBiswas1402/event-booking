import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { desc, eq, gte, inArray } from "drizzle-orm"
import { db } from "@/lib"
import {
  categories,
  events,
  shows,
  ticketTypes,
  venues,
} from "@/db/schema"
import { requireRole } from "@/lib/authorization"
import { slugify } from "@/lib/format"

export const dynamic = "force-dynamic"
export const revalidate = 0

type TicketTypeInput = {
  name: string
  price: number
  quantity: number
}

type ShowInput = {
  showDate: string
  startTime: string
  endTime?: string | null
  totalSeats: number
  ticketTypes: TicketTypeInput[]
}

type VenueInput = {
  name: string
  address: string
  city: string
  state: string
  country?: string
  postalCode?: string
  description?: string
}

type EventInput = {
  title: string
  description?: string
  bannerUrl?: string
  language?: string
  ageRestriction?: string
  duration?: number
  categoryId: string
  venue: VenueInput
  shows: ShowInput[]
}

async function buildUniqueSlug(title: string) {
  const base = slugify(title) || "event"
  let slug = base
  let attempt = 0
  while (attempt < 10) {
    const [existing] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.slug, slug))
      .limit(1)
    if (!existing) return slug
    attempt += 1
    slug = `${base}-${randomUUID().slice(0, 6)}`
  }
  return `${base}-${randomUUID().slice(0, 6)}`
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status")

    const list = await db
      .select({
        event: events,
        category: { id: categories.id, name: categories.name, slug: categories.slug },
        venue: {
          id: venues.id,
          name: venues.name,
          city: venues.city,
          state: venues.state,
          address: venues.address,
        },
      })
      .from(events)
      .innerJoin(categories, eq(events.categoryId, categories.id))
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(
        statusFilter === "PUBLISHED"
          ? eq(events.status, "PUBLISHED")
          : statusFilter === "DRAFT"
            ? eq(events.status, "DRAFT")
            : gte(events.createdAt, new Date(0))
      )
      .orderBy(desc(events.createdAt))

    const eventIds = list.map((r) => r.event.id)
    const allShows = eventIds.length
      ? await db.select().from(shows).where(inArray(shows.eventId, eventIds))
      : []
    const showIds = allShows.map((s) => s.id)
    const allTicketTypes = showIds.length
      ? await db.select().from(ticketTypes).where(inArray(ticketTypes.showId, showIds))
      : []

    const grouped = {
      shows: groupBy(allShows, (s) => s.eventId),
      tickets: groupBy(allTicketTypes, (t) => t.showId),
    }

    return NextResponse.json({
      events: list.map(({ event, category, venue }) => ({
        id: event.id,
        slug: event.slug,
        title: event.title,
        description: event.description,
        bannerUrl: event.bannerUrl,
        language: event.language,
        ageRestriction: event.ageRestriction,
        duration: event.duration,
        status: event.status,
        isFeatured: event.isFeatured,
        category: category.name,
        venue: venue.name,
        venueCity: venue.city,
        venueState: venue.state,
        shows: (grouped.shows.get(event.id) ?? []).map((show) => ({
          id: show.id,
          showDate: show.showDate,
          startTime: show.startTime,
          endTime: show.endTime,
          totalSeats: show.totalSeats,
          availableSeats: show.availableSeats,
          status: show.status,
          ticketTypes: (grouped.tickets.get(show.id) ?? []).map((t) => ({
            id: t.id,
            name: t.name,
            price: t.price,
            quantity: t.quantity,
            remainingQuantity: t.remainingQuantity,
          })),
        })),
      })),
    })
  } catch (error) {
    console.error("GET /api/events error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireRole("ORGANIZER", "ADMIN")
    if (access.status) {
      return NextResponse.json(
        { error: access.status === 401 ? "Authentication required" : "Organizer access required" },
        { status: access.status }
      )
    }

    const body = (await req.json()) as EventInput

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Event title is required" }, { status: 400 })
    }
    if (!body.categoryId) {
      return NextResponse.json({ error: "A category is required" }, { status: 400 })
    }
    if (!body.venue?.name || !body.venue?.address || !body.venue?.city || !body.venue?.state) {
      return NextResponse.json({ error: "Venue details are incomplete" }, { status: 400 })
    }
    if (!Array.isArray(body.shows) || body.shows.length === 0) {
      return NextResponse.json({ error: "At least one show is required" }, { status: 400 })
    }

    for (const show of body.shows) {
      if (!show.showDate || !show.startTime) {
        return NextResponse.json({ error: "Every show needs a date and start time" }, { status: 400 })
      }
      if (!Number.isInteger(show.totalSeats) || show.totalSeats <= 0) {
        return NextResponse.json(
          { error: `Show capacity must be a positive number (${show.totalSeats})` },
          { status: 400 }
        )
      }
      if (!Array.isArray(show.ticketTypes) || show.ticketTypes.length === 0) {
        return NextResponse.json({ error: "Every show needs at least one ticket type" }, { status: 400 })
      }
      for (const tt of show.ticketTypes) {
        if (!tt.name?.trim()) return NextResponse.json({ error: "Ticket type needs a name" }, { status: 400 })
        if (!Number.isInteger(tt.price) || tt.price < 0) {
          return NextResponse.json({ error: `Ticket price must be a valid amount` }, { status: 400 })
        }
        if (!Number.isInteger(tt.quantity) || tt.quantity <= 0) {
          return NextResponse.json({ error: "Ticket quantity must be positive" }, { status: 400 })
        }
      }
    }

    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, body.categoryId))
      .limit(1)
    if (!category) {
      return NextResponse.json({ error: "Selected category does not exist" }, { status: 400 })
    }

    const slug = await buildUniqueSlug(body.title)

    const venueId = randomUUID()
    const eventId = randomUUID()
    const showIds = body.shows.map(() => randomUUID())

    const venueInsert = db
      .insert(venues)
      .values({
        id: venueId,
        organizerId: access.user.id,
        name: body.venue.name,
        slug: `${slugify(body.venue.name)}-${randomUUID().slice(0, 6)}`,
        description: body.venue.description ?? null,
        address: body.venue.address,
        city: body.venue.city,
        state: body.venue.state,
        country: body.venue.country ?? "India",
        postalCode: body.venue.postalCode ?? null,
        capacity: body.shows.reduce((sum, s) => sum + s.totalSeats, 0),
      })
      .returning({ id: venues.id })

    const eventInsert = db
      .insert(events)
      .values({
        id: eventId,
        organizerId: access.user.id,
        categoryId: body.categoryId,
        venueId,
        title: body.title,
        slug,
        description: body.description ?? null,
        bannerUrl: body.bannerUrl ?? null,
        language: body.language ?? null,
        duration: body.duration ?? null,
        ageRestriction: body.ageRestriction ?? null,
        status: "PUBLISHED",
      })
      .returning({ id: events.id })

    const showInsert = db
      .insert(shows)
      .values(
        body.shows.map((show, index) => ({
          id: showIds[index],
          eventId,
          showDate: new Date(show.showDate),
          startTime: new Date(show.startTime),
          endTime: show.endTime ? new Date(show.endTime) : null,
          totalSeats: show.totalSeats,
          availableSeats: show.totalSeats,
        }))
      )
      .returning({ id: shows.id })

    const ticketInsert = db
      .insert(ticketTypes)
      .values(
        body.shows.flatMap((show, showIndex) =>
          show.ticketTypes.map((tt) => ({
            id: randomUUID(),
            showId: showIds[showIndex],
            name: tt.name,
            description: null,
            price: tt.price,
            quantity: tt.quantity,
            remainingQuantity: tt.quantity,
          }))
        )
      )
      .returning({ id: ticketTypes.id })

    await db.batch([venueInsert, eventInsert, showInsert, ticketInsert])

    return NextResponse.json(
      { success: true, slug, eventId, message: "Event created and published successfully" },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/events error:", error)
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
