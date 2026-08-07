import { NextResponse } from "next/server"
import Razorpay from "razorpay"
import { eq } from "drizzle-orm"
import { db } from "@/lib"
import { shows, ticketTypes } from "@/db/schema"
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

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Razorpay keys are not configured on server" }, { status: 500 })
    }

    const body = await req.json()
    const { showId, ticketTypeId, seatNumbers } = body

    if (!showId || !ticketTypeId) {
      return NextResponse.json({ error: "Show ID and Ticket Type ID are required" }, { status: 400 })
    }

    const [show] = await db.select().from(shows).where(eq(shows.id, showId)).limit(1)
    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 })
    }
    if (show.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Show is not accepting bookings" }, { status: 400 })
    }

    const [ticketType] = await db.select().from(ticketTypes).where(eq(ticketTypes.id, ticketTypeId)).limit(1)
    if (!ticketType || ticketType.showId !== showId) {
      return NextResponse.json({ error: "Invalid ticket type" }, { status: 400 })
    }

    const seatCount = Array.isArray(seatNumbers) && seatNumbers.length > 0 ? seatNumbers.length : 1
    const subtotal = ticketType.price * seatCount
    const taxAmount = Math.round(subtotal * 0.18)
    const totalAmount = subtotal + taxAmount

    // Amount in paise
    const amountInPaise = Math.round(totalAmount * 100)

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    const receipt = `rcpt_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 4)}`

    const order = await instance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        showId,
        ticketTypeId,
        seatCount: String(seatCount),
        userId: access.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      totalAmount,
      subtotal,
      taxAmount,
    })
  } catch (error: any) {
    console.error("POST /api/razorpay/create-order error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create Razorpay order" }, { status: 500 })
  }
}
