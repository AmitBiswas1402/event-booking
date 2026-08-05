import { NextResponse } from "next/server"
import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib"
import {
  bookingTickets,
  bookings,
  events,
  shows,
  ticketTypes,
  venues,
} from "@/db/schema"
import { requireRole } from "@/lib/authorization"
import { consumeHeldSeats } from "@/lib/seatLock"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const access = await requireRole("AUDIENCE", "ORGANIZER", "ADMIN")
    if (access.status) {
      return NextResponse.json(
        { error: access.status === 401 ? "Authentication required" : "Access denied" },
        { status: access.status }
      )
    }

    const list = await db
      .select({
        booking: bookings,
        ticket: bookingTickets,
        event: { id: events.id, slug: events.slug, title: events.title },
        show: {
          id: shows.id,
          showDate: shows.showDate,
          startTime: shows.startTime,
          totalSeats: shows.totalSeats,
        },
        venue: { name: venues.name, city: venues.city },
      })
      .from(bookings)
      .innerJoin(bookingTickets, eq(bookingTickets.bookingId, bookings.id))
      .innerJoin(shows, eq(bookings.showId, shows.id))
      .innerJoin(events, eq(shows.eventId, events.id))
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(eq(bookings.audienceId, access.user.id))
      .orderBy(desc(bookings.createdAt))

    const grouped = new Map<
      string,
      {
        booking: typeof bookings.$inferSelect
        event: { id: string; slug: string; title: string }
        show: { id: string; showDate: Date; startTime: Date; totalSeats: number }
        venue: { name: string; city: string }
        tickets: (typeof bookingTickets.$inferSelect)[]
      }
    >()

    for (const row of list) {
      const entry = grouped.get(row.booking.id)
      if (entry) {
        entry.tickets.push(row.ticket)
      } else {
        grouped.set(row.booking.id, {
          booking: row.booking,
          event: row.event,
          show: row.show,
          venue: row.venue,
          tickets: [row.ticket],
        })
      }
    }

    return NextResponse.json({
      bookings: Array.from(grouped.values()).map((entry) => ({
        id: entry.booking.id,
        bookingNumber: entry.booking.bookingNumber,
        status: entry.booking.bookingStatus,
        paymentStatus: entry.booking.paymentStatus,
        subtotal: entry.booking.subtotal,
        taxAmount: entry.booking.taxAmount,
        totalAmount: entry.booking.totalAmount,
        createdAt: entry.booking.createdAt,
        event: entry.event,
        show: entry.show,
        venue: entry.venue,
        tickets: entry.tickets.map((t) => ({
          id: t.id,
          ticketTypeName: t.ticketTypeName,
          ticketNumber: t.ticketNumber,
          seatNumber: t.seatNumber,
          unitPrice: t.unitPrice,
        })),
      })),
    })
  } catch (error) {
    console.error("GET /api/bookings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

type BookingInput = {
  showId: string
  ticketTypeId?: string
  seatNumber?: string
  seatIds?: string[]
  token?: string
}

export async function POST(req: Request) {
  try {
    const access = await requireRole("AUDIENCE", "ADMIN")
    if (access.status) {
      return NextResponse.json(
        { error: access.status === 401 ? "Authentication required" : "Audience access required" },
        { status: access.status }
      )
    }

    const body = (await req.json()) as BookingInput

    if (!body.showId) {
      return NextResponse.json({ error: "Show is required" }, { status: 400 })
    }
    if (body.seatIds && body.seatIds.length > 0 && !body.ticketTypeId) {
      return NextResponse.json({ error: "A ticket type is required for these seats" }, { status: 400 })
    }

    const [show] = await db.select().from(shows).where(eq(shows.id, body.showId)).limit(1)
    if (!show) return NextResponse.json({ error: "Show not found" }, { status: 404 })
    if (show.status !== "SCHEDULED") {
      return NextResponse.json({ error: "This show is no longer accepting bookings" }, { status: 400 })
    }
    if (show.availableSeats <= 0) {
      return NextResponse.json({ error: "This show is sold out" }, { status: 400 })
    }

    const [ticketType] = body.ticketTypeId
      ? await db
          .select()
          .from(ticketTypes)
          .where(eq(ticketTypes.id, body.ticketTypeId))
          .limit(1)
      : [null]
    if (body.ticketTypeId && (!ticketType || ticketType.showId !== show.id)) {
      return NextResponse.json({ error: "Invalid ticket type for this show" }, { status: 400 })
    }
    if (ticketType && ticketType.remainingQuantity <= 0) {
      return NextResponse.json({ error: "This ticket type is sold out" }, { status: 400 })
    }

    const hasHeldSeats = Array.isArray(body.seatIds) && body.seatIds.length > 0
    if (hasHeldSeats) {
      // ---------------- SEAT-SELECTION flow (contents of HELD seats) ----------------
      const heldSeats = await consumeHeldSeats(show.id, access.user.id, body.seatIds!, body.token)
      if (heldSeats.length === 0) {
        return NextResponse.json(
          { error: "The selected seats are no longer held for you. Please reselect them." },
          { status: 409 }
        )
      }

      const subtotal = heldSeats.reduce((sum, s) => sum + s.price, 0)
      const taxAmount = Math.round(subtotal * 0.18)
      const totalAmount = subtotal + taxAmount
      const bookingId = crypto.randomUUID()
      const bookingNumber = `BK-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`

      const bookingInsert = db
        .insert(bookings)
        .values({
          id: bookingId,
          bookingNumber,
          audienceId: access.user.id,
          showId: show.id,
          bookingStatus: "CONFIRMED",
          paymentStatus: "PAID",
          subtotal,
          discountAmount: 0,
          taxAmount,
          totalAmount,
        })
        .returning({ id: bookings.id })

      const ticketInserts = heldSeats.map((seat) =>
        db
          .insert(bookingTickets)
          .values({
            id: crypto.randomUUID(),
            bookingId,
            ticketTypeId: ticketType!.id,
            ticketTypeName: ticketType!.name,
            unitPrice: seat.price,
            ticketNumber: `TKT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            seatNumber: seat.label,
            attendeeName: null,
          })
          .returning({ id: bookingTickets.id })
      )

      const decrementSeats = db
        .update(shows)
        .set({ availableSeats: sql`${shows.availableSeats} - ${heldSeats.length}` })
        .where(eq(shows.id, show.id))

      await db.batch([bookingInsert, ...ticketInserts, decrementSeats])

      return NextResponse.json(
        {
          success: true,
          booking: {
            id: bookingId,
            bookingNumber,
            seats: heldSeats.map((s) => s.label),
            ticketCount: heldSeats.length,
            ticketTypeName: ticketType!.name,
            eventTitle: await getEventTitle(show.id),
            subtotal,
            taxAmount,
            totalAmount,
          },
        },
        { status: 201 }
      )
    }

    // ---------------- General Admission / single numeric seat flow ----------------
    if (!body.ticketTypeId || !body.seatNumber?.trim()) {
      return NextResponse.json(
        { error: "Ticket type and seat number are required" },
        { status: 400 }
      )
    }

    const seatNum = body.seatNumber.trim()
    const seatIndex = Number(seatNum)
    if (!Number.isInteger(seatIndex) || seatIndex < 1 || seatIndex > show.totalSeats) {
      return NextResponse.json({ error: `Seat must be a number between 1 and ${show.totalSeats}` }, { status: 400 })
    }

    const [existingSeat] = await db
      .select({ id: bookingTickets.id })
      .from(bookingTickets)
      .innerJoin(bookings, eq(bookingTickets.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.showId, show.id),
          eq(bookingTickets.seatNumber, seatNum),
          sql`${bookings.bookingStatus} != 'CANCELLED'`
        )
      )
      .limit(1)
    if (existingSeat) {
      return NextResponse.json({ error: `Seat ${seatNum} is already taken for this show` }, { status: 409 })
    }

    const subtotal = ticketType!.price
    const taxAmount = Math.round(subtotal * 0.18)
    const totalAmount = subtotal + taxAmount
    const bookingId = crypto.randomUUID()
    const ticketId = crypto.randomUUID()
    const bookingNumber = `BK-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
    const ticketNumber = `TKT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

    const bookingInsert = db
      .insert(bookings)
      .values({
        id: bookingId,
        bookingNumber,
        audienceId: access.user.id,
        showId: show.id,
        bookingStatus: "CONFIRMED",
        paymentStatus: "PAID",
        subtotal,
        discountAmount: 0,
        taxAmount,
        totalAmount,
      })
      .returning({ id: bookings.id })

    const ticketInsert = db
      .insert(bookingTickets)
      .values({
        id: ticketId,
        bookingId,
        ticketTypeId: ticketType!.id,
        ticketTypeName: ticketType!.name,
        unitPrice: ticketType!.price,
        ticketNumber,
        seatNumber: seatNum,
        attendeeName: null,
      })
      .returning({ id: bookingTickets.id })

    const decrementSeats = db
      .update(shows)
      .set({ availableSeats: sql`${shows.availableSeats} - 1` })
      .where(eq(shows.id, show.id))

    const decrementQuantity = db
      .update(ticketTypes)
      .set({ remainingQuantity: sql`${ticketTypes.remainingQuantity} - 1` })
      .where(eq(ticketTypes.id, ticketType!.id))

    await db.batch([bookingInsert, ticketInsert, decrementSeats, decrementQuantity])

    return NextResponse.json(
      {
        success: true,
        booking: {
          id: bookingId,
          bookingNumber,
          seatNumber: seatNum,
          ticketNumber,
          ticketTypeName: ticketType!.name,
          eventTitle: (await getEventTitle(show.id)),
          subtotal,
          taxAmount,
          totalAmount,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/bookings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function getEventTitle(showId: string): Promise<string | null> {
  const [row] = await db
    .select({ title: events.title })
    .from(events)
    .innerJoin(shows, eq(shows.eventId, events.id))
    .where(eq(shows.id, showId))
    .limit(1)
  return row?.title ?? null
}
