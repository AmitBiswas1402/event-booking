import FeatMovies from "@/components/FeatMovies";
import FeatConcert from "@/components/FeatConcerts";
import HeroSectionBanners from "@/components/HeroSectionBanner";
import Navbar from "@/components/Navbar";
import FeatSports from "@/components/FeatSports";

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
    <a
      href="#"
      className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-pink-400/60 hover:text-pink-200"
    >
      See all
    </a>
  </div>
);

const HomePage = () => {
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
          <FeatMovies />
        </section>

        <section className="mx-auto max-w-7xl px-4 py-7 md:px-8">
          <SectionHeader
            title="Featured concerts and events"
            subtitle="Live shows, parties, and weekend plans worth booking."
          />
          <FeatConcert />
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 pt-7 md:px-8">
          <SectionHeader
            title="Featured sports"
            subtitle="Matches, tournaments, and active weekends around town."
          />
          <FeatSports />
        </section>
      </main>
    </div>
  );
};

export default HomePage;
