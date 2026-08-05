import { desc, eq, inArray } from "drizzle-orm"
import Link from "next/link"
import { db } from "@/lib"
import { categories, events, shows, ticketTypes, venues } from "@/db/schema"
import FeatMovies from "@/components/FeatMovies";
import FeatConcert from "@/components/FeatConcerts";
import HeroSectionBanners from "@/components/HeroSectionBanner";
import Navbar from "@/components/Navbar";
import FeatSports from "@/components/FeatSports";
import type { HomeEvent } from "@/lib/home";

export const dynamic = "force-dynamic"

const SectionHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <div className="mb-4 flex items-end justify-between gap-4">
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pink-300/80">
        Curated picks
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-white md:text-2xl">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
    </div>
    <Link
      href="/events"
      className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-pink-400/60 hover:text-pink-200"
    >
      See all
    </Link>
  </div>
);

async function loadHomeData() {
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
    .orderBy(desc(events.createdAt));

  const eventIds = rows.map((r) => r.event.id);
  const allShows = eventIds.length
    ? await db.select().from(shows).where(inArray(shows.eventId, eventIds))
    : [];
  const showIds = allShows.map((s) => s.id);
  const allTickets = showIds.length
    ? await db.select().from(ticketTypes).where(inArray(ticketTypes.showId, showIds))
    : [];

  const showsByEvent = new Map<string, typeof allShows>();
  for (const show of allShows) {
    const bucket = showsByEvent.get(show.eventId) ?? [];
    bucket.push(show);
    showsByEvent.set(show.eventId, bucket);
  }
  const ticketsByShow = new Map<string, typeof allTickets>();
  for (const ticket of allTickets) {
    const bucket = ticketsByShow.get(ticket.showId) ?? [];
    bucket.push(ticket);
    ticketsByShow.set(ticket.showId, bucket);
  }

  const now = new Date();
  const homeEvents: HomeEvent[] = rows.map(({ event, category, venue }) => {
    const eventShows = (showsByEvent.get(event.id) ?? []).sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );
    const nextShow =
      eventShows.find((s) => s.status === "SCHEDULED" && s.startTime >= now) ??
      eventShows.find((s) => s.status === "SCHEDULED") ??
      null;
    const prices = nextShow
      ? (ticketsByShow.get(nextShow.id) ?? []).map((t) => t.price)
      : [];
    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      bannerUrl: event.bannerUrl,
      isFeatured: event.isFeatured,
      category: category.name,
      venue: venue.name,
      city: venue.city,
      showDate: nextShow ? nextShow.startTime : null,
      lowestPrice: prices.length ? Math.min(...prices) : null,
    };
  });

  return {
    movies: homeEvents.filter((e) => e.category === "Movies"),
    concerts: homeEvents.filter((e) => e.category === "Concerts" || e.category === "Events"),
    sports: homeEvents.filter((e) => e.category === "Sports"),
  };
}

const HomePage = async () => {
  const { movies, concerts, sports } = await loadHomeData();

  return (
    <div className="flex min-h-screen flex-col bg-[#090a0f] font-sans text-white">
      <Navbar />

      <main className="flex-1 overflow-hidden">
        <section className="relative border-b border-white/5 bg-[radial-gradient(circle_at_top_left,rgba(248,68,100,0.16),transparent_34%),linear-gradient(180deg,#11131d_0%,#090a0f_100%)] py-6 md:py-8">
          <HeroSectionBanners />
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-4 pt-9 md:px-8">
          <SectionHeader
            title="Recommended movies"
            subtitle="Fresh releases and audience favourites near you."
          />
          <FeatMovies events={movies} />
        </section>

        <section className="mx-auto max-w-7xl px-4 py-7 md:px-8">
          <SectionHeader
            title="Featured concerts and events"
            subtitle="Live shows, parties, and weekend plans worth booking."
          />
          <FeatConcert events={concerts} />
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 pt-7 md:px-8">
          <SectionHeader
            title="Featured sports"
            subtitle="Matches, tournaments, and active weekends around town."
          />
          <FeatSports events={sports} />
        </section>
      </main>
    </div>
  );
};

export default HomePage;
