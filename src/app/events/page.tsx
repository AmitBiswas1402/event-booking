import Link from "next/link"
import Image from "next/image"
import { CalendarDays, MapPin, Ticket } from "lucide-react"
import { and, desc, eq, gte, inArray } from "drizzle-orm"
import { db } from "@/lib"
import { categories, events, shows, ticketTypes, venues } from "@/db/schema"
import Navbar from "@/components/Navbar"
import { formatPrice } from "@/lib/format"

export const dynamic = "force-dynamic"

async function loadEvents() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000

  const rows = await db
    .select({
      event: events,
      category: { name: categories.name },
      venue: { name: venues.name, city: venues.city },
    })
    .from(events)
    .innerJoin(categories, eq(events.categoryId, categories.id))
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.status, "PUBLISHED"))
    .orderBy(desc(events.createdAt))

  const eventIds = rows.map((r) => r.event.id)
  const upcomingShows = eventIds.length
    ? await db
        .select()
        .from(shows)
        .where(and(inArray(shows.eventId, eventIds), gte(shows.showDate, new Date(cutoff))))
    : []
  const showIds = upcomingShows.map((s) => s.id)
  const allTicketTypes = showIds.length
    ? await db.select().from(ticketTypes).where(inArray(ticketTypes.showId, showIds))
    : []

  const showsByEvent = new Map<string, typeof upcomingShows>()
  for (const show of upcomingShows) {
    const bucket = showsByEvent.get(show.eventId) ?? []
    bucket.push(show)
    showsByEvent.set(show.eventId, bucket)
  }
  const ticketsByShow = new Map<string, typeof allTicketTypes>()
  for (const ticket of allTicketTypes) {
    const bucket = ticketsByShow.get(ticket.showId) ?? []
    bucket.push(ticket)
    ticketsByShow.set(ticket.showId, bucket)
  }

  return { rows, showsByEvent, ticketsByShow }
}

export default async function EventsPage() {
  const { rows, showsByEvent, ticketsByShow } = await loadEvents()

  return (
    <div className="flex min-h-screen flex-col bg-[#090a0f] font-sans text-white">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-300/80">
            Book your seats
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">All Events</h1>
          <p className="mt-1 text-sm text-slate-400">
            Pick a show, choose your ticket type and select your seat.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-[#16161d] p-14 text-center">
            <Ticket className="mx-auto mb-3 size-9 text-slate-500" />
            <p className="text-sm font-semibold">No events available yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Organizers are busy setting up. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map(({ event, category, venue }) => {
              const showList = showsByEvent.get(event.id) ?? []
              const firstShow = showList[0]
              const lowestPrice = showList.reduce<number | null>((min, s) => {
                const prices = (ticketsByShow.get(s.id) ?? []).map((t) => t.price)
                const showMin = prices.length ? Math.min(...prices) : null
                return min === null ? showMin : showMin === null ? min : Math.min(min, showMin)
              }, null)

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="group relative overflow-hidden rounded-2xl bg-[#16161d] ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:ring-pink-400/60"
                >
                  <div className="relative h-44 w-full overflow-hidden">
                    {event.bannerUrl ? (
                      <Image
                        src={event.bannerUrl}
                        alt={event.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-600/30 to-violet-600/30">
                        <Ticket className="size-10 text-white/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full bg-pink-500 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow">
                      {category.name}
                    </span>
                  </div>

                  <div className="space-y-2.5 p-4">
                    <h2 className="line-clamp-1 text-sm font-bold leading-tight">{event.title}</h2>

                    <div className="space-y-1.5 text-[11px] text-slate-400">
                      {firstShow && (
                        <p className="flex items-center gap-1.5">
                          <CalendarDays className="size-3 text-pink-300" />
                          {firstShow.showDate.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          · {showList.length} show(s)
                        </p>
                      )}
                      <p className="flex items-center gap-1.5">
                        <MapPin className="size-3 text-pink-300" />
                        {venue.name}, {venue.city}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">
                        {firstShow?.availableSeats ?? 0} seats left
                      </span>
                      <span className="text-sm font-black text-pink-300">
                        {lowestPrice !== null ? `From ${formatPrice(lowestPrice)}` : "Book"}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
