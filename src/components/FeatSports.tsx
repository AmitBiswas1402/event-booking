import { sportsSec } from "@/lib/SportsSections";
import Image from "next/image";
import { Calendar, MapPin } from "lucide-react";

const FeatSports = () => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none [&::-webkit-scrollbar]:hidden">
      {sportsSec.map((sport) => (
        <div
          key={sport.id}
          className="group relative h-67 w-48 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10 shadow-xl shadow-black/35 transition-all duration-300 ease-out hover:-translate-y-1 hover:ring-pink-400/70"
        >
          <Image
            src={sport.image}
            alt={sport.title}
            fill
            sizes="188px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/15 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-3 py-3">
            <p className="line-clamp-1 text-sm font-semibold leading-tight text-white drop-shadow">
              {sport.title}
            </p>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-300">
              <span className="flex items-center gap-1 text-pink-200">
                <Calendar className="size-3" />
                {sport.date}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {sport.venue}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FeatSports;
