import FeatMovies from "@/components/FeatMovies";
import FeatConcert from "@/components/FeaturedConcert";
import HeroSectionBanners from "@/components/HeroSectionBanner";
import Navbar from "@/components/Navbar";

const HomePage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#0d0e12] font-sans">
      <Navbar />

      <main className="flex-1 w-full">
        {/* Hero Banner Carousel */}
        <section className="w-full bg-[#0d0e12] py-4 overflow-hidden">
          <HeroSectionBanners />
        </section>

        {/* Recommended Movies */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">
                Recommended Movies
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Handpicked just for you</p>
            </div>
            <a
              href="#"
              className="text-xs md:text-sm font-semibold text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1"
            >
              See All <span className="text-base leading-none">›</span>
            </a>
          </div>
          <FeatMovies />
        </section>

        {/* Featured Concerts & Events */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">
                Featured Concerts & Events
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Live shows near you</p>
            </div>
            <a
              href="#"
              className="text-xs md:text-sm font-semibold text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1"
            >
              See All <span className="text-base leading-none">›</span>
            </a>
          </div>
          <FeatConcert />
        </section>
      </main>
    </div>
  );
};

export default HomePage;
