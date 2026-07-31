import { movieSec } from "@/lib/MovieSections";
import Image from "next/image";

const FeatMovies = () => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none [&::-webkit-scrollbar]:hidden">
      {movieSec.map((movie) => (
        <div
          key={movie.id}
          className="group relative h-67 w-48 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10 shadow-xl shadow-black/35 transition-all duration-300 ease-out hover:-translate-y-1 hover:ring-pink-400/70"
        >
          <Image
            src={movie.image}
            alt="movie poster"
            fill
            sizes="168px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/75 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
      ))}
    </div>
  );
};

export default FeatMovies;
