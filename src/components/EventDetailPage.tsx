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
  Loader2,
  MapPin,
  Signpost,
  Ticket,
} from "lucide-react"
import Navbar from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { SignInButton } from "@clerk/nextjs"
import SeatMap, { type SeatBookingConfirmation } from "@/components/SeatMap"
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

export default function EventDetailPage({ slug }: { slug: string }) {
  const { isLoaded, isSignedIn } = useUser()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [shows, setShows] = useState<Show[]>([])
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const [selectedShowId, setSelectedShowId] = useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null)
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
    setSelectedSeat(null)
    setSeatBooking(null)
  }

  const seats = useMemo(() => {
    if (!selectedShow) return []
    return Array.from({ length: selectedShow.totalSeats }, (_, i) => String(i + 1))
  }, [selectedShow])

  const occupiedSet = useMemo(
    () => new Set(selectedShow?.occupiedSeats ?? []),
    [selectedShow]
  )

  const taxAmount = selectedTicket ? Math.round(selectedTicket.price * 0.18) : 0
  const totalAmount = selectedTicket ? selectedTicket.price + taxAmount : 0

  const handleConfirm = async () => {
    if (!selectedShowId || !selectedTicketId || !selectedSeat) return
    setBookingError(null)
    setIsBooking(true)
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showId: selectedShowId,
          ticketTypeId: selectedTicketId,
          seatNumber: selectedSeat,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Booking failed. Please try again.")
      setConfirmation(data.booking)
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
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
            Your seat is locked in. Show this ticket at the venue entrance.
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
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Seat</p>
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

            <section>
              <h2 className="mb-3 text-base font-bold">1 · Choose a show</h2>
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

            {selectedShow && isSeatShow && (
              <section>
                <h2 className="mb-3 text-base font-bold">2 · Select your seats</h2>
                <SeatMap showId={selectedShow.id} onBooking={setSeatBooking} />
              </section>
            )}

            {selectedShow && !isSeatShow && (
              <section>
                <h2 className="mb-3 text-base font-bold">2 · Choose your ticket type</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedShow.ticketTypes.map((ticket) => {
                    const soldOut = ticket.remainingQuantity <= 0
                    const isSelected = selectedTicketId === ticket.id
                    return (
                      <button
                        key={ticket.id}
                        type="button"
                        disabled={soldOut}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                          soldOut
                            ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-50"
                            : isSelected
                              ? "border-pink-400 bg-pink-500/10 ring-2 ring-pink-500/20"
                              : "border-white/10 bg-[#16161d] hover:border-white/25"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-bold">{ticket.name}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {ticket.remainingQuantity} left
                          </p>
                        </div>
                        <span className="text-base font-black text-pink-300">
                          {formatPrice(ticket.price)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {selectedShow && selectedTicket && !isSeatShow && (
              <section>
                <h2 className="mb-3 text-base font-bold">3 · Select your seat</h2>
                <div className="rounded-2xl border border-white/10 bg-[#16161d] p-6">
                  <div className="mb-6 flex items-center justify-center">
                    <div className="w-3/4 rounded-t-2xl bg-white/10 py-2 text-center text-[10px] uppercase tracking-[0.3em] text-slate-400">
                      Screen
                    </div>
                  </div>
                  <div className="mx-auto grid max-w-lg grid-cols-8 gap-2">
                    {seats.map((seat) => {
                      const occupied = occupiedSet.has(seat)
                      const isSelected = selectedSeat === seat
                      return (
                        <button
                          key={seat}
                          type="button"
                          disabled={occupied}
                          onClick={() => setSelectedSeat(seat)}
                          aria-label={`Seat ${seat}`}
                          className={`flex aspect-square items-center justify-center rounded-md text-[9px] font-bold transition-all ${
                            occupied
                              ? "cursor-not-allowed bg-white/[0.04] text-slate-600"
                              : isSelected
                                ? "bg-pink-500 text-white shadow-lg shadow-pink-950/40"
                                : "bg-white/10 text-slate-300 hover:bg-pink-500/40 hover:text-white"
                          }`}
                        >
                          {seat}
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="size-3 rounded bg-pink-500" /> Selected
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-3 rounded bg-white/10" /> Available
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-3 rounded bg-white/[0.04]" /> Taken
                    </span>
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-white/10 bg-[#16161d] p-6 ring-1 ring-white/5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
                <Armchair className="size-4 text-pink-300" />
                Booking summary
              </h2>

              {isSeatShow ? (
                <p className="rounded-xl bg-white/[0.04] px-4 py-3 text-xs text-slate-400">
                  Select your seats on the map above, then hold & confirm your booking there.
                </p>
              ) : !selectedTicket || !selectedSeat || !selectedShow ? (
                <p className="rounded-xl bg-white/[0.04] px-4 py-3 text-xs text-slate-400">
                  Select a show, ticket type and seat to see your total.
                </p>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatDateTime(selectedShow.startTime)} · {selectedShow.ticketTypes.find((t) => t.id === selectedTicketId)?.name ?? selectedTicket.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Seat</span>
                    <span className="font-bold text-white">{selectedSeat}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Ticket</span>
                    <span>{formatPrice(selectedTicket.price)}</span>
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
                    disabled={!selectedTicket || !selectedSeat || isBooking}
                    className="w-full bg-gradient-to-r from-pink-500 to-violet-600 py-3 text-xs font-bold text-white shadow-lg disabled:opacity-40"
                  >
                    {isBooking ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Confirming...
                      </span>
                    ) : (
                      "Confirm booking"
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
    </div>
  )
}
