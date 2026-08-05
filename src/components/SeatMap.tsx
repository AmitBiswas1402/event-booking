"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Timer, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"

type SeatStatus = "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED"

type Seat = {
  id: string
  label: string
  category: string
  price: number
  status: SeatStatus
  isWheelchair: boolean
  isAisle: boolean
  heldUntil: string | null
}

type SeatRow = {
  id: string
  label: string
  seats: Seat[]
}

type SeatSection = {
  id: string
  name: string
  hasSeats: boolean
  capacity: number | null
  rows: SeatRow[]
}

type TicketType = {
  id: string
  name: string
  seatCategory: string | null
  price: number
  remainingQuantity: number
}

type SeatMapData = {
  showId: string
  type: string
  show: { totalSeats: number; availableSeats: number; status: string }
  sections: SeatSection[]
  ticketTypes: TicketType[]
}

type HoldClaim = { seatId: string; token: string; heldUntil: string }

export type SeatBookingConfirmation = {
  id: string
  bookingNumber: string
  seats: string[]
  ticketCount: number
  ticketTypeName: string
  eventTitle: string | null
  subtotal: number
  taxAmount: number
  totalAmount: number
}

interface SeatMapProps {
  showId: string
  onBooking?: (confirmation: SeatBookingConfirmation) => void
}

// Seat coloring by status (see Step 9 of the architecture).
const STATUS_CLASS: Record<SeatStatus, string> = {
  AVAILABLE: "bg-white/10 text-slate-300 hover:bg-pink-500/50 hover:text-white cursor-pointer",
  HELD: "bg-violet-500/60 text-white cursor-not-allowed",
  BOOKED: "bg-white/[0.04] text-slate-600 cursor-not-allowed",
  BLOCKED: "bg-white/[0.02] text-slate-700 cursor-not-allowed",
}

const STATUS_LABEL: Record<SeatStatus, string> = {
  AVAILABLE: "Available",
  HELD: "Held",
  BOOKED: "Booked",
  BLOCKED: "Blocked",
}

export default function SeatMap({ showId, onBooking }: SeatMapProps) {
  const [data, setData] = useState<SeatMapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set())
  const [holds, setHolds] = useState<Map<string, HoldClaim>>(new Map())

  const [isBooking, setIsBooking] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<SeatBookingConfirmation | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/shows/${showId}/seats`)
      if (!res.ok) return null
      return (await res.json()) as SeatMapData
    } catch {
      return null
    }
  }, [showId])

  useEffect(() => {
    let active = true
    fetch(`/api/shows/${showId}/seats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (active && json) setData(json as SeatMapData)
        if (active && !json) setError("Could not load the seat map.")
      })
      .catch(() => {
        if (active) setError("Could not load the seat map.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [showId])

  // Poll every 20s so holds/expirations from other users stay visible.
  useEffect(() => {
    if (!data) return
    const id = window.setInterval(() => {
      refresh().then((json) => {
        if (json) setData(json)
      })
    }, 20000)
    return () => window.clearInterval(id)
  }, [data, refresh])

  const seatById = useMemo(() => {
    const m = new Map<string, Seat>()
    for (const section of data?.sections ?? []) {
      for (const row of section.rows) {
        for (const seat of row.seats) m.set(seat.id, seat)
      }
    }
    return m
  }, [data])

  const selectedList = useMemo(
    () => Array.from(selectedSeats).map((id) => seatById.get(id)!),
    [selectedSeats, seatById]
  )

  const isGAShow = data?.type === "GENERAL_ADMISSION"
  const subtotal = selectedList.reduce((sum, s) => sum + s.price, 0)
  const taxAmount = Math.round(subtotal * 0.18)
  const totalAmount = subtotal + taxAmount

  const toggleSeat = (seat: Seat) => {
    if (seat.status !== "AVAILABLE") return
    setSelectedSeats((prev) => {
      const next = new Set(prev)
      if (next.has(seat.id)) next.delete(seat.id)
      else if (next.size < 10) next.add(seat.id)
      return next
    })
  }

  const ticketTypeFor = (seat: Seat) =>
    data?.ticketTypes.find((t) => t.seatCategory === seat.category) ?? data?.ticketTypes[0]

  const handleBook = async () => {
    if (selectedSeats.size === 0) return
    setBookingError(null)
    setIsBooking(true)
    try {
      const ids = Array.from(selectedSeats)

      // 1) Atomically hold the seats (starts the 10 min countdown).
      const holdRes = await fetch(`/api/shows/${showId}/seats/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatIds: ids }),
      })
      const holdData = await holdRes.json()
      if (!holdRes.ok) throw new Error(holdData.error || "Could not hold seats.")
      if (holdData.claimed?.length !== ids.length) {
        throw new Error("Some seats were just taken. Please reselect them.")
      }

      const holdsMap = new Map<string, HoldClaim>()
      for (const claim of holdData.claimed as HoldClaim[]) holdsMap.set(claim.seatId, claim)
      setHolds(holdsMap)

      // 2) Confirm the booking against the held seats (consume the hold).
      const firstSeat = seatById.get(ids[0])!
      const ticketType = ticketTypeFor(firstSeat)
      if (!ticketType) throw new Error("No ticket type configured for this seat category.")

      const bookRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showId,
          ticketTypeId: ticketType.id,
          seatIds: ids,
          token: holdsMap.get(ids[0])?.token,
        }),
      })
      const bookData = await bookRes.json()
      if (!bookRes.ok) throw new Error(bookData.error || "Booking could not be confirmed.")

      setConfirmed(bookData.booking as SeatBookingConfirmation)
      onBooking?.(bookData.booking as SeatBookingConfirmation)
      setSelectedSeats(new Set())
      setHolds(new Map())
      refresh().then((json) => {
        if (json) setData(json)
      })
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Booking failed.")
      setHolds(new Map())
      refresh().then((json) => {
        if (json) setData(json)
      })
    } finally {
      setIsBooking(false)
    }
  }

  const releaseHolds = async () => {
    const ids = Array.from(holds.keys())
    const token = holds.values().next().value?.token
    if (ids.length === 0) return
    try {
      await fetch(`/api/shows/${showId}/seats/hold`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatIds: ids, token }),
      })
    } catch {
      // ignore
    }
    setHolds(new Map())
    setSelectedSeats(new Set())
    refresh().then((json) => {
      if (json) setData(json)
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-pink-400" />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-xs font-semibold text-rose-300">
        {error ?? "Seat map unavailable."}
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center">
        <p className="text-base font-black text-emerald-300">Booking confirmed!</p>
        <p className="mt-1 text-xs text-slate-300">
          {confirmed.seats.join(", ")} · {confirmed.bookingNumber}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#16161d] p-6">
      {isGAShow ? (
        <GeneralAdmission ticketTypes={data.ticketTypes} />
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <Legend />
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500">
                {data.show.availableSeats} of {data.show.totalSeats} available
              </span>
              {holds.size > 0 && (
                <Countdown heldUntil={holds.values().next().value?.heldUntil ?? null} />
              )}
            </div>
          </div>

          <div className="mb-6 flex items-center justify-center">
            <div className="w-3/4 rounded-t-2xl bg-white/10 py-2 text-center text-[10px] uppercase tracking-[0.3em] text-slate-400">
              Stage / Screen
            </div>
          </div>

          {data.sections.map((section) => (
            <div key={section.id} className="mb-8 last:mb-0">
              <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {section.name}
              </p>

              {section.hasSeats ? (
                <div className="space-y-2">
                  {section.rows.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-center text-[10px] font-bold text-slate-500">
                        {row.label}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {row.seats.map((seat) => {
                          const isSelected = selectedSeats.has(seat.id)
                          return (
                            <button
                              key={seat.id}
                              type="button"
                              disabled={seat.status !== "AVAILABLE"}
                              onClick={() => toggleSeat(seat)}
                              aria-label={`Seat ${seat.label} (${STATUS_LABEL[seat.status]})`}
                              className={`flex h-7 min-w-7 items-center justify-center rounded-md px-1 text-[9px] font-bold transition-all ${
                                isSelected
                                  ? "bg-pink-500 text-white shadow-lg shadow-pink-950/40 ring-2 ring-pink-400/40"
                                  : STATUS_CLASS[seat.status]
                              } ${seat.isAisle && "mr-2"} ${seat.isWheelchair && "rounded-full border border-violet-400/60"}`}
                            >
                              {seat.label.replace(row.label, "")}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-[10px] text-slate-500">
                  {section.capacity
                    ? `${section.capacity} seat capacity`
                    : "Seats not mapped — choose a ticket type."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!isGAShow && (
        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              {selectedList.length > 0 ? (
                <span className="font-semibold text-white">
                  {selectedList.map((s) => s.label).join(", ")}
                </span>
              ) : (
                "No seats selected"
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">
                {selectedList.length} seat{selectedList.length === 1 ? "" : "s"} · Taxes (18%)
              </p>
              <p className="text-lg font-black text-pink-300">{formatPrice(totalAmount)}</p>
            </div>
          </div>

          {holds.size > 0 && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-amber-300">
              <Timer className="size-3.5" />
              Seats are released automatically if you don&apos;t complete the booking.
              <button
                type="button"
                onClick={releaseHolds}
                className="inline-flex items-center gap-1 font-semibold text-slate-300 hover:text-rose-300"
              >
                <X className="size-3" /> Cancel hold
              </button>
            </div>
          )}

          {bookingError && (
            <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
              {bookingError}
            </p>
          )}

          <Button
            onClick={handleBook}
            disabled={selectedSeats.size === 0 || isBooking}
            className="mt-4 w-full bg-gradient-to-r from-pink-500 to-violet-600 py-3 text-xs font-bold text-white disabled:opacity-40"
          >
            {isBooking ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Booking...
              </span>
            ) : (
              "Hold & confirm booking"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

function Countdown({ heldUntil }: { heldUntil: string | null }) {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (!heldUntil) return
    const deadline = new Date(heldUntil).getTime()
    const tick = () => setLeft(Math.max(0, deadline - Date.now()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [heldUntil])
  if (left <= 0) return null
  const s = Math.floor(left / 1000)
  const mm = String(Math.floor(s / 60)).padStart(2, "0")
  const ss = String(s % 60).padStart(2, "0")
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-300">
      <Timer className="size-3.5" /> {mm}:{ss}
    </span>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-pink-500" /> Selected
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-white/10" /> Available
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-violet-500/60" /> Held
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-white/[0.04]" /> Booked
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded border border-violet-400/60" /> Wheelchair
      </span>
    </div>
  )
}

function GeneralAdmission({ ticketTypes }: { ticketTypes: TicketType[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">Choose your ticket</p>
      {ticketTypes.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3"
        >
          <span className="text-xs font-semibold">{t.name}</span>
          <span className="text-xs text-slate-400">{formatPrice(t.price)}</span>
        </div>
      ))}
    </div>
  )
}