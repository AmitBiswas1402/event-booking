import Link from "next/link"
import { Store } from "lucide-react"
import { asc, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib"
import { categories, events, shows, venues } from "@/db/schema"
import { requireRole } from "@/lib/authorization"
import OrganizerDashboard from "@/components/OrganizerDashboard"

export const dynamic = "force-dynamic"

export default async function OrganizerPage() {
  const access = await requireRole("ORGANIZER", "ADMIN")

  if (access.status) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#090a0f] p-6 text-white">
        <Store className="size-10 text-amber-400" />
        <h1 className="text-lg font-bold">Organizer access required</h1>
        <p className="text-sm text-slate-400">
          {access.status === 401
            ? "Please sign in to access the organizer dashboard."
            : "Only organizer accounts can create events."}
        </p>
        <Link
          href="/"
          className="rounded-full bg-pink-500 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-pink-400"
        >
          Back to home
        </Link>
      </div>
    )
  }

  const [categoryList, organizerEvents] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.name)),
    db
      .select({
        event: events,
        venue: { name: venues.name, city: venues.city },
      })
      .from(events)
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.organizerId, access.user.id))
      .orderBy(desc(events.createdAt)),
  ])

  const eventIds = organizerEvents.map((r) => r.event.id)
  const allShows = eventIds.length
    ? await db.select().from(shows).where(inArray(shows.eventId, eventIds))
    : []

  return (
    <OrganizerDashboard
      categories={categoryList.map((c) => ({ id: c.id, name: c.name }))}
      initialEvents={organizerEvents.map(({ event, venue }) => ({
        id: event.id,
        slug: event.slug,
        title: event.title,
        status: event.status,
        description: event.description,
        venue: `${venue.name}, ${venue.city}`,
        createdAt: event.createdAt,
        showCount: allShows.filter((s) => s.eventId === event.id).length,
      }))}
    />
  )
}
