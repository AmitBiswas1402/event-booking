"use client"

import { useState } from "react"
import Link from "next/link"
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  Plus,
  Store,
  Ticket,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDateTime } from "@/lib/format"

type CategoryOption = { id: string; name: string }

type TicketTypeForm = {
  id: string
  name: string
  price: string
  quantity: string
}

type ShowForm = {
  id: string
  showDate: string
  startTime: string
  endTime: string
  totalSeats: string
  ticketTypes: TicketTypeForm[]
}

type InitialEvent = {
  id: string
  slug: string
  title: string
  status: string
  description: string | null
  venue: string
  createdAt: Date
  showCount: number
}

interface OrganizerDashboardProps {
  categories: CategoryOption[]
  initialEvents: InitialEvent[]
}

const newId = () => Math.random().toString(36).slice(2, 10)

const emptyTicketType = (): TicketTypeForm => ({ id: newId(), name: "", price: "", quantity: "" })

const emptyShow = (): ShowForm => ({
  id: newId(),
  showDate: "",
  startTime: "",
  endTime: "",
  totalSeats: "",
  ticketTypes: [emptyTicketType()],
})

export default function OrganizerDashboard({ categories, initialEvents }: OrganizerDashboardProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [bannerUrl, setBannerUrl] = useState("")
  const [language, setLanguage] = useState("")
  const [ageRestriction, setAgeRestriction] = useState("")
  const [duration, setDuration] = useState("")
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "")

  const [venueName, setVenueName] = useState("")
  const [venueAddress, setVenueAddress] = useState("")
  const [venueCity, setVenueCity] = useState("")
  const [venueState, setVenueState] = useState("")
  const [venuePostalCode, setVenuePostalCode] = useState("")

  const [shows, setShows] = useState<ShowForm[]>([emptyShow()])
  const [events, setEvents] = useState<InitialEvent[]>(initialEvents)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const updateShow = (showId: string, patch: Partial<ShowForm>) => {
    setShows((prev) => prev.map((s) => (s.id === showId ? { ...s, ...patch } : s)))
  }

  const updateTicket = (showId: string, ticketId: string, patch: Partial<TicketTypeForm>) => {
    setShows((prev) =>
      prev.map((s) =>
        s.id === showId
          ? {
              ...s,
              ticketTypes: s.ticketTypes.map((t) => (t.id === ticketId ? { ...t, ...patch } : t)),
            }
          : s
      )
    )
  }

  const handleSubmit = async () => {
    setErrorMsg(null)
    setSuccessMsg(null)

    const cleanShows = shows
      .filter((s) => s.showDate && s.startTime && s.totalSeats)
      .map((s) => ({
        showDate: s.showDate,
        startTime: s.startTime,
        endTime: s.endTime || null,
        totalSeats: Number(s.totalSeats),
        ticketTypes: s.ticketTypes
          .filter((t) => t.name && t.price && t.quantity)
          .map((t) => ({
            name: t.name,
            price: Math.round(parseFloat(t.price) * 100),
            quantity: Number(t.quantity),
          })),
      }))
      .filter((s) => s.ticketTypes.length > 0)

    if (!title.trim()) return setErrorMsg("Please enter an event title.")
    if (!categoryId) return setErrorMsg("Please select a category.")
    if (!venueName || !venueAddress || !venueCity || !venueState) {
      return setErrorMsg("Please complete the venue details (name, address, city and state).")
    }
    if (cleanShows.length === 0) {
      return setErrorMsg("Add at least one show with a date, start time, capacity and a ticket type.")
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          bannerUrl: bannerUrl || undefined,
          language: language || undefined,
          ageRestriction: ageRestriction || undefined,
          duration: duration ? Number(duration) : undefined,
          categoryId,
          venue: {
            name: venueName,
            address: venueAddress,
            city: venueCity,
            state: venueState,
            postalCode: venuePostalCode || undefined,
          },
          shows: cleanShows,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to create event")

      setSuccessMsg(`"${title}" is now live. Audience can book seats for it!`)
      setTitle("")
      setDescription("")
      setBannerUrl("")
      setLanguage("")
      setAgeRestriction("")
      setDuration("")
      setVenueName("")
      setVenueAddress("")
      setVenueCity("")
      setVenueState("")
      setVenuePostalCode("")
      setShows([emptyShow()])
      refreshEvents()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const refreshEvents = async () => {
    try {
      const res = await fetch("/api/events")
      if (res.ok) {
        const data = await res.json()
        setEvents(
          (data.events ?? []).map((e: InitialEvent & { venue: string; shows: unknown[] }) => ({
            id: e.id,
            slug: e.slug,
            title: e.title,
            status: e.status,
            description: e.description ?? null,
            venue: e.venue,
            createdAt: e.createdAt,
            showCount: (e.shows ?? []).length,
          }))
        )
      }
    } catch {
      // ignore refresh errors
    }
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#10121a]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
              <Store className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight">Organizer Dashboard</h1>
              <p className="text-[11px] text-slate-400">Create events, set capacity and ticket prices</p>
            </div>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-pink-400/50 hover:text-white"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:px-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-6">
          <div>
            <h2 className="text-base font-bold">Create a new event</h2>
            <p className="text-xs text-slate-400">
              Fill in the details below — the event goes live immediately.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-xs font-semibold text-rose-300">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0" />
              {successMsg}
            </div>
          )}

          <div className="space-y-5 rounded-2xl border border-white/10 bg-[#16161d] p-5">
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <span className="flex size-5 items-center justify-center rounded-md bg-pink-500/20 text-[10px] text-pink-300">1</span>
                Event details
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Event title *">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Arijit Singh Live in Concert"
                      className="h-9 bg-white/5 text-sm"
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Description">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Tell your audience what to expect..."
                      className="w-full rounded-lg border border-input bg-white/5 px-3 py-2 text-sm outline-none focus-visible:border-ring"
                    />
                  </Field>
                </div>
                <Field label="Category *">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-input bg-[#16161d] px-2.5 text-sm outline-none focus-visible:border-ring"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Banner image URL">
                  <Input
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-9 bg-white/5 text-sm"
                  />
                </Field>
                <Field label="Language">
                  <Input
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="e.g. Hindi"
                    className="h-9 bg-white/5 text-sm"
                  />
                </Field>
                <Field label="Age restriction">
                  <Input
                    value={ageRestriction}
                    onChange={(e) => setAgeRestriction(e.target.value)}
                    placeholder="e.g. 18+"
                    className="h-9 bg-white/5 text-sm"
                  />
                </Field>
                <Field label="Duration (minutes)">
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 180"
                    className="h-9 bg-white/5 text-sm"
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-white/10 bg-[#16161d] p-5">
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <span className="flex size-5 items-center justify-center rounded-md bg-pink-500/20 text-[10px] text-pink-300">2</span>
                Venue
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Venue name *">
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
                      <Input
                        value={venueName}
                        onChange={(e) => setVenueName(e.target.value)}
                        placeholder="e.g. Netaji Indoor Stadium"
                        className="h-9 bg-white/5 pl-8 text-sm"
                      />
                    </div>
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Address *">
                    <Input
                      value={venueAddress}
                      onChange={(e) => setVenueAddress(e.target.value)}
                      placeholder="e.g. Eden Gardens Road"
                      className="h-9 bg-white/5 text-sm"
                    />
                  </Field>
                </div>
                <Field label="City *">
                  <Input
                    value={venueCity}
                    onChange={(e) => setVenueCity(e.target.value)}
                    placeholder="e.g. Kolkata"
                    className="h-9 bg-white/5 text-sm"
                  />
                </Field>
                <Field label="State *">
                  <Input
                    value={venueState}
                    onChange={(e) => setVenueState(e.target.value)}
                    placeholder="e.g. West Bengal"
                    className="h-9 bg-white/5 text-sm"
                  />
                </Field>
                <Field label="Postal code">
                  <Input
                    value={venuePostalCode}
                    onChange={(e) => setVenuePostalCode(e.target.value)}
                    placeholder="e.g. 700021"
                    className="h-9 bg-white/5 text-sm"
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-white/10 bg-[#16161d] p-5">
            <div>
              <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <span className="flex size-5 items-center justify-center rounded-md bg-pink-500/20 text-[10px] text-pink-300">3</span>
                Shows & capacity
              </h3>
              <p className="mb-4 text-[11px] text-slate-500">
                Each show has an audience capacity (total seats) and its own ticket types.
              </p>

              <div className="space-y-4">
                {shows.map((show) => (
                  <div key={show.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                        <CalendarDays className="size-3.5 text-pink-400" />
                        Show
                      </span>
                      {shows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setShows((prev) => prev.filter((s) => s.id !== show.id))}
                          className="text-slate-500 transition-colors hover:text-rose-400"
                          aria-label="Remove show"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Show date *">
                        <Input
                          type="date"
                          value={show.showDate}
                          onChange={(e) => updateShow(show.id, { showDate: e.target.value })}
                          className="h-9 bg-white/5 text-sm"
                        />
                      </Field>
                      <Field label="Start time *">
                        <Input
                          type="datetime-local"
                          value={show.startTime}
                          onChange={(e) => updateShow(show.id, { startTime: e.target.value })}
                          className="h-9 bg-white/5 text-sm"
                        />
                      </Field>
                      <Field label="End time">
                        <Input
                          type="datetime-local"
                          value={show.endTime}
                          onChange={(e) => updateShow(show.id, { endTime: e.target.value })}
                          className="h-9 bg-white/5 text-sm"
                        />
                      </Field>
                      <Field label="Audience capacity *">
                        <Input
                          type="number"
                          min={1}
                          value={show.totalSeats}
                          onChange={(e) => updateShow(show.id, { totalSeats: e.target.value })}
                          placeholder="Total seats"
                          className="h-9 bg-white/5 text-sm"
                        />
                      </Field>
                    </div>

                    <div className="mt-4">
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <Ticket className="size-3.5" />
                        Ticket types
                      </p>
                      <div className="space-y-2.5">
                        {show.ticketTypes.map((ticket) => (
                          <div key={ticket.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                            <Input
                              value={ticket.name}
                              onChange={(e) => updateTicket(show.id, ticket.id, { name: e.target.value })}
                              placeholder="e.g. Silver"
                              className="h-9 bg-white/5 text-sm"
                            />
                            <Input
                              type="number"
                              min={0}
                              value={ticket.price}
                              onChange={(e) => updateTicket(show.id, ticket.id, { price: e.target.value })}
                              placeholder="Price in ₹"
                              className="h-9 bg-white/5 text-sm"
                            />
                            <Input
                              type="number"
                              min={1}
                              value={ticket.quantity}
                              onChange={(e) => updateTicket(show.id, ticket.id, { quantity: e.target.value })}
                              placeholder="Qty"
                              className="h-9 bg-white/5 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateShow(show.id, {
                                  ticketTypes: show.ticketTypes.filter((t) => t.id !== ticket.id),
                                })
                              }
                              className="flex size-9 items-center justify-center self-end rounded-lg border border-white/10 text-slate-500 transition-colors hover:border-rose-500/40 hover:text-rose-400"
                              aria-label="Remove ticket type"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateShow(show.id, { ticketTypes: [...show.ticketTypes, emptyTicketType()] })
                        }
                        className="mt-2.5 text-xs"
                      >
                        <Plus className="size-3.5" />
                        Add ticket type
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShows((prev) => [...prev, emptyShow()])}
                className="mt-3 text-xs"
              >
                <Plus className="size-3.5" />
                Add another show
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 py-3 text-xs font-bold text-white shadow-lg transition-all hover:from-pink-400 hover:to-violet-500"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Publishing event...
              </span>
            ) : (
              "Publish Event"
            )}
          </Button>
        </section>

        <aside className="space-y-4">
          <div>
            <h2 className="text-base font-bold">My events</h2>
            <p className="text-xs text-slate-400">{events.length} event(s) published</p>
          </div>

          {events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#16161d] p-8 text-center">
              <CalendarDays className="mx-auto mb-3 size-8 text-slate-500" />
              <p className="text-sm font-semibold">No events yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Create your first event and set its audience capacity to go live.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-white/10 bg-[#16161d] p-4 ring-1 ring-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{event.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">{event.venue}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        event.status === "PUBLISHED"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{event.showCount} show(s)</span>
                    <Link
                      href={`/events/${event.slug}`}
                      className="font-semibold text-pink-300 transition-colors hover:text-pink-200"
                    >
                      View page →
                    </Link>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">Added {formatDateTime(event.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-400">{label}</span>
      {children}
    </label>
  )
}
