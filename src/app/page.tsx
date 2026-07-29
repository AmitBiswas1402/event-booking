import FeatMovies from "@/components/FeatMovies";
import HeroSectionBanners from "@/components/HeroSectionBanner";
import Navbar from "@/components/Navbar";

const HomePage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-zinc-950 font-sans">
      <Navbar />

      <main className="flex-1 w-full">
        {/* BookMyShow Hero Banner Carousel Section */}
        <section className="w-full bg-[#ebebeb] dark:bg-zinc-900 py-4 overflow-hidden">
          <HeroSectionBanners />
        </section>

        {/* Content Section (Recommended Movies, etc.) */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              Recommended Movies
            </h2>
            <a href="#" className="text-xs md:text-sm font-semibold text-[#f84464] hover:underline">
              See All &rsaquo;
            </a>
          </div>
          <FeatMovies />
        </section>
      </main>
    </div>
  );
};

export default HomePage;

