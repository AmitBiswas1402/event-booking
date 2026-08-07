"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useUser } from "@clerk/nextjs"
import {
  Armchair,
  CalendarDays,
  CheckCircle2,
  Clock,
  LayoutTemplate,
  Loader2,
  MapPin,
  Maximize2,
  Signpost,
  Ticket,
  Users,
} from "lucide-react"
import Navbar from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { SignInButton } from "@clerk/nextjs"
import SeatMap, { type SeatBookingConfirmation } from "@/components/SeatMap"
import { getZoneTheme } from "@/components/SeatSectionGrid"
import SeatSelectionModal from "@/components/SeatSelectionModal"
import BookingSetupModal from "@/components/BookingSetupModal"
import LayoutLightboxModal from "@/components/LayoutLightboxModal"
import { formatDateTime, formatPrice } from "@/lib/format"

type TicketType = {
  id: string
  name: string
  price: number
  quantity: number
  remainingQuantity: number
}

type Show = {
  id: string
  showDate: string
  startTime: string
  endTime: string | null
  totalSeats: number
  availableSeats: number
  status: string
  layoutType: string | null
  occupiedSeats: string[]
  ticketTypes: TicketType[]
}

type EventDetail = {
  id: string
  slug: string
  title: string
  description: string | null
  bannerUrl: string | null
  language: string | null
  ageRestriction: string | null
  duration: number | null
  category: string
  venue: {
    name: string
    address: string
    city: string
    state: string
    country: string
    postalCode: string | null
    capacity: number | null
    layoutImageUrl?: string | null
  }
}

type BookingConfirmation = {
  id: string
  bookingNumber: string
  seatNumber: string
  ticketNumber: string
  ticketTypeName: string
  eventTitle: string | null
  subtotal: number
  taxAmount: number
  totalAmount: number
}

// Zone color pill for the layout image overlay
function ZonePill({ name, badge, emoji }: { name: string; badge: string; emoji: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge}`}>
      {emoji} {name}
    </span>
  )
}

export default function EventDetailPage({ slug }: { slug: string }) {
  const { isLoaded, isSignedIn } = useUser()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [shows, setShows] = useState<Show[]>([])
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const [selectedShowId, setSelectedShowId] = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [ticketCount, setTicketCount] = useState<number>(2)
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false)
  const [isLayoutLightboxOpen, setIsLayoutLightboxOpen] = useState(false)
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [isBooking, setIsBooking] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null)
  const [seatBooking, setSeatBooking] = useState<SeatBookingConfirmation | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/events/${slug}`)
        if (res.status === 404) {
          if (!cancelled) setNotFound(true)
          return
        }
        const data = await res.json()
        if (!cancelled) {
          setEvent(data.event)
          setShows(data.shows ?? [])
          const firstAvailable = (data.shows ?? []).find(
            (s: Show) => s.status === "SCHEDULED" && s.availableSeats > 0
          )
          setSelectedShowId(firstAvailable?.id ?? null)
        }
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  const selectedShow = shows.find((s) => s.id === selectedShowId) ?? null
  const selectedTicket = selectedShow?.ticketTypes.find((t) => t.id === selectedTicketId) ?? null
  const isSeatShow =
    selectedShow?.layoutType === "SEAT_SELECTION" ||
    selectedShow?.layoutType === "SECTION_BASED"

  const selectShow = (showId: string) => {
    setSelectedShowId(showId)
    setSelectedTicketId(null)
    setSelectedSeats([])
    setSeatBooking(null)
    setIsSetupModalOpen(true)
  }

  const selectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId)
    setSelectedSeats([])
  }

  // Build per-ticket-type occupied seat sets from the show's occupiedSeats
  // Occupied seats are labeled with the prefix e.g. "G1", "V2" etc.
  const getTicketOccupied = (ticket: TicketType): string[] => {
    if (!selectedShow) return []
    const theme = getZoneTheme(ticket.name)
    const prefix = theme.prefix
    return selectedShow.occupiedSeats.filter((s) => s.startsWith(prefix))
  }

  const toggleSeat = (seat: string) => {
    if (!selectedShow) return
    const theme = getZoneTheme(selectedTicket?.name ?? "")
    const occupied = new Set(getTicketOccupied(selectedTicket!))
    if (occupied.has(seat)) return
    setSelectedSeats((prev) => {
      if (prev.includes(seat)) {
        return prev.filter((s) => s !== seat)
      }
      if (prev.length < ticketCount) {
        return [...prev, seat]
      }
      return [...prev.slice(1), seat]
    })
  }

  const subtotal = selectedTicket ? selectedTicket.price * ticketCount : 0
  const taxAmount = selectedTicket ? Math.round(subtotal * 0.18) : 0
  const totalAmount = subtotal + taxAmount

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true)
        return
      }
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handleConfirm = async () => {
    if (!selectedShowId || !selectedTicketId || selectedSeats.length === 0) return
    setBookingError(null)
    setIsBooking(true)

    try {
      // 1. Ensure Razorpay checkout script is loaded
      const resScript = await loadRazorpayScript()
      if (!resScript) {
        throw new Error("Razorpay SDK failed to load. Please check your internet connection.")
      }

      // 2. Create Razorpay order on server
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showId: selectedShowId,
          ticketTypeId: selectedTicketId,
          seatNumbers: selectedSeats,
        }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        throw new Error(orderData?.error || "Failed to initiate payment")
      }

      // 3. Open Razorpay Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "BookEvents",
        description: `${event?.title} — ${selectedTicket?.name || "Tickets"} (${selectedSeats.join(", ")})`,
        image: event?.bannerUrl || undefined,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            setIsBooking(true)
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                showId: selectedShowId,
                ticketTypeId: selectedTicketId,
                seatNumbers: selectedSeats,
              }),
            })

            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) {
              throw new Error(verifyData?.error || "Payment verification failed")
            }

            setConfirmation(verifyData.booking)
          } catch (err) {
            setBookingError(err instanceof Error ? err.message : "Payment verification failed")
          } finally {
            setIsBooking(false)
          }
        },
        modal: {
          ondismiss: function () {
            setIsBooking(false)
          },
        },
        theme: {
          color: "#ec4899",
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.on("payment.failed", function (response: any) {
        setBookingError(response.error?.description || "Payment failed. Please try again.")
        setIsBooking(false)
      })

      rzp.open()
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Something went wrong.")
      setIsBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-white">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-pink-400" />
        </div>
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-white">
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
          <Signpost className="size-9 text-slate-500" />
          <p className="text-sm font-semibold">Event not found</p>
          <Link
            href="/events"
            className="rounded-full bg-pink-500 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-pink-400"
          >
            Browse events
          </Link>
        </div>
      </div>
    )
  }

  if (confirmation) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-white">
        <Navbar />
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 ring-8 ring-emerald-500/10">
            <CheckCircle2 className="size-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-black">Booking confirmed!</h1>
          <p className="text-sm text-slate-400">
            Your seats are locked in. Show this ticket at the venue entrance.
          </p>

          <div className="w-full space-y-3 rounded-2xl border border-white/10 bg-[#16161d] p-6 text-left ring-1 ring-white/5">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Event</p>
              <p className="text-sm font-bold">{confirmation.eventTitle ?? event.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Booking no.</p>
                <p className="font-mono text-xs font-bold text-pink-300">{confirmation.bookingNumber}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Ticket no.</p>
                <p className="font-mono text-xs font-bold">{confirmation.ticketNumber}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Ticket type</p>
                <p className="text-xs font-semibold">{confirmation.ticketTypeName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Seats</p>
                <p className="text-xs font-semibold">{confirmation.seatNumber}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-xs text-slate-400">Total paid</span>
              <span className="text-base font-black text-pink-300">
                {formatPrice(confirmation.totalAmount)}
              </span>
            </div>
          </div>

          <Link
            href="/events"
            className="rounded-full bg-pink-500 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-pink-400"
          >
            Book another event
          </Link>
        </div>
      </div>
    )
  }

  if (seatBooking) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-white">
        <Navbar />
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 ring-8 ring-emerald-500/10">
            <CheckCircle2 className="size-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-black">Booking confirmed!</h1>
          <p className="text-sm text-slate-400">
            Your seats are locked in. Show this ticket at the venue entrance.
          </p>

          <div className="w-full space-y-3 rounded-2xl border border-white/10 bg-[#16161d] p-6 text-left ring-1 ring-white/5">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Event</p>
              <p className="text-sm font-bold">{seatBooking.eventTitle ?? event.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Booking no.</p>
                <p className="font-mono text-xs font-bold text-pink-300">{seatBooking.bookingNumber}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Seats</p>
                <p className="text-xs font-semibold">{seatBooking.seats.join(", ")}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Ticket type</p>
                <p className="text-xs font-semibold">{seatBooking.ticketTypeName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Tickets</p>
                <p className="text-xs font-semibold">{seatBooking.ticketCount}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-xs text-slate-400">Total paid</span>
              <span className="text-base font-black text-pink-300">
                {formatPrice(seatBooking.totalAmount)}
              </span>
            </div>
          </div>

          <Link
            href="/events"
            className="rounded-full bg-pink-500 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-pink-400"
          >
            Book another event
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-white">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <div className="mb-6">
          <Link
            href="/events"
            className="text-xs font-semibold text-slate-400 transition-colors hover:text-pink-300"
          >
            ← All events
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {/* Event Header Banner */}
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#16161d]">
              <div className="relative h-64 w-full md:h-80">
                {event.bannerUrl ? (
                  <Image
                    src={event.bannerUrl}
                    alt={event.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-600/30 to-violet-600/30">
                    <Ticket className="size-14 text-white/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <span className="mb-2 inline-block rounded-full bg-pink-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    {event.category}
                  </span>
                  <h1 className="text-2xl font-black tracking-tight">{event.title}</h1>
                </div>
              </div>

              <div className="grid gap-3 p-6 sm:grid-cols-3">
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
                    <MapPin className="size-3" /> Venue
                  </p>
                  <p className="mt-1 text-xs font-semibold">{event.venue.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {event.venue.address}, {event.venue.city}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
                    <CalendarDays className="size-3" /> Language
                  </p>
                  <p className="mt-1 text-xs font-semibold">{event.language ?? "—"}</p>
                  {event.ageRestriction && (
                    <p className="text-[11px] text-slate-400">Age: {event.ageRestriction}</p>
                  )}
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
                    <Clock className="size-3" /> Duration
                  </p>
                  <p className="mt-1 text-xs font-semibold">
                    {event.duration ? `${event.duration} mins` : "—"}
                  </p>
                </div>
              </div>

              {event.description && (
                <div className="border-t border-white/10 px-6 py-4">
                  <p className="text-sm leading-relaxed text-slate-300">{event.description}</p>
                </div>
              )}
            </section>

            {/* ── Venue Seating Layout Map (Organizer-Uploaded) ── */}
            {event.venue.layoutImageUrl && (
              <section className="overflow-hidden rounded-2xl border border-violet-500/25 bg-[#141622] shadow-lg ring-1 ring-violet-500/10">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-violet-500/15 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="size-4 text-violet-400" />
                    <h3 className="text-sm font-bold text-white">Venue Seating Plan</h3>
                    <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-300">
                      Reference Map
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLayoutLightboxOpen(true)}
                    className="h-7 gap-1.5 border-violet-500/30 bg-violet-500/10 text-[10px] font-bold text-violet-300 hover:bg-violet-500/20"
                  >
                    <Maximize2 className="size-3" /> Full View
                  </Button>
                </div>

                {/* Zone Legend Pills */}
                {selectedShow && selectedShow.ticketTypes.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 border-b border-violet-500/10 px-5 py-3">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Zones:</span>
                    {selectedShow.ticketTypes.map((tt) => {
                      const theme = getZoneTheme(tt.name)
                      return (
                        <button
                          key={tt.id}
                          type="button"
                          onClick={() => {
                            selectTicket(tt.id)
                          }}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                            selectedTicketId === tt.id
                              ? theme.badge + " ring-2 " + theme.ring + " scale-105"
                              : theme.badge + " opacity-60 hover:opacity-100"
                          }`}
                        >
                          {theme.emoji} {tt.name}
                          <span className="ml-1.5 opacity-60">{formatPrice(tt.price)}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Layout Image with zone overlay */}
                <div
                  onClick={() => setIsLayoutLightboxOpen(true)}
                  className="group relative cursor-pointer overflow-hidden"
                >
                  <div className="relative w-full" style={{ paddingTop: "50%" }}>
                    <Image
                      src={event.venue.layoutImageUrl}
                      alt="Venue seating layout map"
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      className="object-contain p-3"
                      unoptimized
                    />
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-end justify-center pb-4 bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                    <span className="flex items-center gap-1.5 rounded-full bg-violet-900/90 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
                      <Maximize2 className="size-3.5" /> Click to Zoom
                    </span>
                  </div>
                </div>

                <p className="px-5 py-2.5 text-[11px] text-slate-500">
                  👆 Tap a zone above to jump directly to seat selection for that area.
                </p>
              </section>
            )}

            {/* Step 1: Choose a show */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-bold">1 · Choose a show</h2>
                {selectedShow && selectedTicket && (
                  <button
                    type="button"
                    onClick={() => setIsSetupModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-bold text-pink-300 hover:bg-pink-500/20"
                  >
                    <Users className="size-3.5" />
                    {ticketCount} × {selectedTicket.name} (Change)
                  </button>
                )}
              </div>

              {shows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-[#16161d] p-8 text-center text-sm text-slate-400">
                  No shows scheduled yet.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {shows.map((show) => {
                    const disabled = show.status !== "SCHEDULED" || show.availableSeats <= 0
                    const isSelected = selectedShowId === show.id
                    return (
                      <button
                        key={show.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => selectShow(show.id)}
                        className={`rounded-xl border p-4 text-left transition-all ${
                          disabled
                            ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-50"
                            : isSelected
                              ? "border-pink-400 bg-pink-500/10 ring-2 ring-pink-500/20"
                              : "border-white/10 bg-[#16161d] hover:border-white/25"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">
                            {formatDateTime(show.startTime)}
                          </span>
                          {show.availableSeats <= 20 && !disabled && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                              Only {show.availableSeats} left
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {show.availableSeats} of {show.totalSeats} seats available
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {show.ticketTypes.length} ticket type(s)
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Step 2 (SeatMap view): Select your seats */}
            {selectedShow && isSeatShow && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold">2 · Select your seats</h2>
                  <button
                    type="button"
                    onClick={() => setIsSetupModalOpen(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-pink-300 hover:underline"
                  >
                    <Users className="size-3.5" /> {ticketCount} Tickets
                  </button>
                </div>
                <SeatMap showId={selectedShow.id} onBooking={setSeatBooking} />
              </section>
            )}

            {/* Step 2 (GA/Numeric): Selected zone summary + seat pick CTA */}
            {selectedShow && !isSeatShow && (
              <section className="space-y-3">
                <h2 className="text-base font-bold">2 · Your ticket selection</h2>

                {!selectedTicket ? (
                  /* Prompt to open setup modal */
                  <button
                    type="button"
                    onClick={() => setIsSetupModalOpen(true)}
                    className="flex w-full items-center justify-between rounded-2xl border border-dashed border-pink-500/30 bg-pink-500/5 p-5 text-left transition-all hover:border-pink-400/50 hover:bg-pink-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-pink-500/20 text-xl">
                        🎟️
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Choose zone &amp; quantity</p>
                        <p className="mt-0.5 text-xs text-slate-400">Tap to select your ticket type and seats</p>
                      </div>
                    </div>
                    <span className="flex size-8 items-center justify-center rounded-xl bg-pink-500/20 text-pink-300">
                      →
                    </span>
                  </button>
                ) : (
                  /* Zone + qty summary card, clickable to change */
                  (() => {
                    const theme = getZoneTheme(selectedTicket.name)
                    return (
                      <div className="space-y-3">
                        {/* Selected zone info bar */}
                        <div className={`flex items-center justify-between rounded-2xl border p-4 ${theme.border} bg-gradient-to-r from-[#14141f] to-[#0d0d1a]`}>
                          <div className="flex items-center gap-3">
                            <span className={`flex size-9 items-center justify-center rounded-xl text-lg ${theme.badge}`}>
                              {theme.emoji}
                            </span>
                            <div>
                              <p className="text-sm font-bold text-white">{selectedTicket.name}</p>
                              <p className={`text-[11px] font-semibold ${theme.text}`}>
                                {formatPrice(selectedTicket.price)} × {ticketCount} ticket{ticketCount > 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsSetupModalOpen(true)}
                            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
                          >
                            Change
                          </button>
                        </div>

                        {/* Pick seats CTA */}
                        <button
                          type="button"
                          onClick={() => setIsSeatModalOpen(true)}
                          className={`group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all ${theme.border} bg-gradient-to-br from-[#14141f] to-[#0d0d1a] hover:brightness-110`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`flex size-10 items-center justify-center rounded-xl text-xl ${theme.badge}`}>
                                🪑
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">Pick your seats</p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {selectedSeats.length > 0
                                    ? `${selectedSeats.length}/${ticketCount} selected: ${selectedSeats.join(", ")}`
                                    : `Choose ${ticketCount} seat${ticketCount > 1 ? "s" : ""} from the interactive map`
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedSeats.length > 0 && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.badge}`}>
                                  {selectedSeats.length}/{ticketCount} ✓
                                </span>
                              )}
                              <span className="flex size-8 items-center justify-center rounded-xl bg-white/10 text-white group-hover:bg-white/15">
                                →
                              </span>
                            </div>
                          </div>
                        </button>
                      </div>
                    )
                  })()
                )}
              </section>
            )}
          </div>

          {/* Right sidebar: Booking summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-white/10 bg-[#16161d] p-6 ring-1 ring-white/5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
                <Armchair className="size-4 text-pink-300" />
                Booking summary
              </h2>

              {isSeatShow ? (
                <p className="rounded-xl bg-white/[0.04] px-4 py-3 text-xs text-slate-400">
                  Select your seats on the map above, then hold &amp; confirm your booking there.
                </p>
              ) : !selectedTicket || selectedSeats.length === 0 || !selectedShow ? (
                <div className="space-y-2 rounded-xl bg-white/[0.04] p-4 text-xs text-slate-400">
                  <p>Select a show, zone and seat(s) to see your total.</p>
                  {selectedShow && !selectedTicket && (
                    <p className="text-pink-300/70">👆 Pick a zone from the map or step 2.</p>
                  )}
                  {selectedTicket && selectedSeats.length === 0 && (
                    <p className="text-amber-300/70">
                      Now pick {ticketCount} seat{ticketCount > 1 ? "s" : ""} from the grid.
                    </p>
                  )}
                  {selectedTicket && (
                    <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-white">
                      <span>{ticketCount} Ticket(s) selected</span>
                      <button
                        type="button"
                        onClick={() => setIsSetupModalOpen(true)}
                        className="text-xs text-pink-400 hover:underline"
                      >
                        Change ({ticketCount})
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatDateTime(selectedShow.startTime)} · {selectedTicket.name}
                      </p>
                    </div>
                  </div>

                  {/* Selected seat chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSeats.map((s) => {
                      const theme = getZoneTheme(selectedTicket.name)
                      return (
                        <span
                          key={s}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.badge}`}
                        >
                          {s}
                        </span>
                      )
                    })}
                  </div>

                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Quantity</span>
                    <span className="font-bold text-white">{ticketCount} ticket(s)</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Ticket price ({ticketCount} × {formatPrice(selectedTicket.price)})</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Taxes (18%)</span>
                    <span>{formatPrice(taxAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="text-xs font-semibold text-slate-300">Total</span>
                    <span className="text-lg font-black text-pink-300">{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              )}

              {bookingError && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-xs font-semibold text-rose-300">
                  {bookingError}
                </div>
              )}

              <div className="mt-4">
                {!isSignedIn ? (
                  <SignInButton mode="modal">
                    <Button className="w-full bg-gradient-to-r from-pink-500 to-violet-600 py-3 text-xs font-bold text-white">
                      Sign in to book
                    </Button>
                  </SignInButton>
                ) : !isSeatShow ? (
                  <Button
                    onClick={handleConfirm}
                    disabled={!selectedTicket || selectedSeats.length < ticketCount || isBooking}
                    className="w-full bg-gradient-to-r from-pink-500 to-violet-600 py-3 text-xs font-bold text-white shadow-lg disabled:opacity-40"
                  >
                    {isBooking ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Processing Payment...
                      </span>
                    ) : (
                      selectedSeats.length >= ticketCount
                        ? `Pay ${formatPrice(totalAmount)} & Confirm`
                        : `Pick ${ticketCount - selectedSeats.length} more seat(s)`
                    )}
                  </Button>
                ) : null}
              </div>

              {!isLoaded && (
                <p className="mt-3 text-center text-[10px] text-slate-500">Checking session...</p>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* ── Booking Setup Modal (zone + qty, 2-step) ── */}
      {selectedShow && (
        <BookingSetupModal
          isOpen={isSetupModalOpen}
          onClose={() => setIsSetupModalOpen(false)}
          eventTitle={event.title}
          showDate={selectedShow.startTime}
          ticketTypes={selectedShow.ticketTypes}
          initialTicketTypeId={selectedTicketId}
          initialQuantity={ticketCount}
          onConfirm={(ticketTypeId, qty) => {
            setSelectedTicketId(ticketTypeId)
            setTicketCount(qty)
            setSelectedSeats([])
          }}
        />
      )}

      {/* ── Venue Seating Layout Lightbox Modal ── */}
      {event.venue.layoutImageUrl && (
        <LayoutLightboxModal
          isOpen={isLayoutLightboxOpen}
          onClose={() => setIsLayoutLightboxOpen(false)}
          imageUrl={event.venue.layoutImageUrl}
          venueName={event.venue.name}
        />
      )}

      {/* ── Seat Selection Modal (full-screen, zoomable) ── */}
      {selectedTicket && selectedShow && (
        <SeatSelectionModal
          isOpen={isSeatModalOpen}
          onClose={() => setIsSeatModalOpen(false)}
          ticketTypeName={selectedTicket.name}
          ticketPrice={selectedTicket.price}
          totalSeats={selectedTicket.quantity}
          occupiedSeats={getTicketOccupied(selectedTicket)}
          initialSelected={selectedSeats}
          maxSelect={ticketCount}
          onConfirm={(seats) => setSelectedSeats(seats)}
          layoutImageUrl={event.venue.layoutImageUrl}
          venueName={event.venue.name}
        />
      )}
    </div>
  )
}