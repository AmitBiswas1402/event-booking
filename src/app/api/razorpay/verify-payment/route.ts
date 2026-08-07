import { NextResponse } from "next/server"
import crypto from "crypto"
import { and, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib"
import {
  bookingTickets,
  bookings,
  events,
  payments,
  shows,
  ticketTypes,
} from "@/db/schema"
import { requireRole } from "@/lib/authorization"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const access = await requireRole("AUDIENCE", "ADMIN")
    if (access.status) {
      return NextResponse.json(
        { error: access.status === 401 ? "Authentication required" : "Audience access required" },
        { status: access.status }
      )
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keySecret) {
      return NextResponse.json({ error: "Razorpay secret key is missing" }, { status: 500 })
    }

    const body = await req.json()
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      showId,
      ticketTypeId,
      seatNumbers,
    } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing Razorpay payment parameters" }, { status: 400 })
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature verification failed" }, { status: 400 })
    }

    // Payment is valid! Now create booking record
    const [show] = await db.select().from(shows).where(eq(shows.id, showId)).limit(1)
    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 })
    }

    const [ticketType] = await db
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.id, ticketTypeId))
      .limit(1)
    if (!ticketType) {
      return NextResponse.json({ error: "Ticket type not found" }, { status: 404 })
    }

    const requestedSeats: string[] = Array.isArray(seatNumbers) && seatNumbers.length > 0
      ? seatNumbers.map((s: string) => String(s).trim())
      : []

    if (requestedSeats.length === 0) {
      return NextResponse.json({ error: "Seat numbers required" }, { status: 400 })
    }

    // Double check taken seats
    const takenSeats = await db
      .select({ seatNumber: bookingTickets.seatNumber })
      .from(bookingTickets)
      .innerJoin(bookings, eq(bookingTickets.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.showId, show.id),
          inArray(bookingTickets.seatNumber, requestedSeats),
          sql`${bookings.bookingStatus} != 'CANCELLED'`
        )
      )

    if (takenSeats.length > 0) {
      const takenList = takenSeats.map((t) => t.seatNumber).join(", ")
      return NextResponse.json(
        { error: `Seat(s) ${takenList} were taken right before payment. Please contact support for refund.` },
        { status: 409 }
      )
    }

    const count = requestedSeats.length
    const unitPrice = ticketType.price
    const subtotal = unitPrice * count
    const taxAmount = Math.round(subtotal * 0.18)
    const totalAmount = subtotal + taxAmount

    const bookingId = crypto.randomUUID()
    const bookingNumber = `BK-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`

    // Insert booking
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

    // Insert booking tickets
    const ticketInserts = requestedSeats.map((seatNum: string) =>
      db
        .insert(bookingTickets)
        .values({
          id: crypto.randomUUID(),
          bookingId,
          ticketTypeId: ticketType.id,
          ticketTypeName: ticketType.name,
          unitPrice,
          ticketNumber: `TKT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          seatNumber: seatNum,
          attendeeName: null,
        })
        .returning({ id: bookingTickets.id })
    )

    // Insert payment log
    const paymentInsert = db
      .insert(payments)
      .values({
        id: crypto.randomUUID(),
        bookingId,
        provider: "RAZORPAY",
        providerPaymentId: razorpay_payment_id,
        providerOrderId: razorpay_order_id,
        amount: totalAmount,
        status: "PAID",
      })

    // Update capacity
    const decrementSeats = db
      .update(shows)
      .set({ availableSeats: sql`${shows.availableSeats} - ${count}` })
      .where(eq(shows.id, show.id))

    const decrementQuantity = db
      .update(ticketTypes)
      .set({ remainingQuantity: sql`${ticketTypes.remainingQuantity} - ${count}` })
      .where(eq(ticketTypes.id, ticketType.id))

    await db.batch([
      bookingInsert,
      ...ticketInserts,
      paymentInsert,
      decrementSeats,
      decrementQuantity,
    ])

    // Get event title
    const [eventRow] = await db
      .select({ title: events.title })
      .from(events)
      .innerJoin(shows, eq(shows.eventId, events.id))
      .where(eq(shows.id, show.id))
      .limit(1)

    return NextResponse.json(
      {
        success: true,
        booking: {
          id: bookingId,
          bookingNumber,
          seatNumber: requestedSeats.join(", "),
          ticketNumber: `TKT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          ticketTypeName: ticketType.name,
          eventTitle: eventRow?.title ?? "Event",
          subtotal,
          taxAmount,
          totalAmount,
          paymentId: razorpay_payment_id,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("POST /api/razorpay/verify-payment error:", error)
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 })
  }
}
