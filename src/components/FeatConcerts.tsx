import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, Music } from "lucide-react";
import type { HomeEvent } from "@/lib/home";
import { formatEventDate } from "@/lib/home";
import { formatPrice } from "@/lib/format";

const FeatConcert = ({ events }: { events: HomeEvent[] }) => {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-[#16161d] p-10 text-center">
        <Music className="size-7 text-slate-500" />
        <p className="text-sm font-semibold">No concerts yet</p>
        <p className="text-xs text-slate-400">Concerts will appear here once organizers publish them.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none [&::-webkit-scrollbar]:hidden">
      {events.map((event) => (
        <Link
          key={event.id}
          href={`/events/${event.slug}`}
          className="group relative h-67 w-48 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10 shadow-xl shadow-black/35 transition-all duration-300 ease-out hover:-translate-y-1 hover:ring-pink-400/70"
        >
          {event.bannerUrl ? (
            <Image
              src={event.bannerUrl}
              alt={event.title}
              fill
              sizes="188px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-600/30 to-violet-600/30">
              <Music className="size-10 text-white/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/15 to-transparent" />
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-pink-500 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
            <span className="inline-block size-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
          <div className="absolute bottom-0 left-0 right-0 px-3 py-3">
            <p className="line-clamp-1 text-sm font-semibold leading-tight text-white drop-shadow">
              {event.title}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-300">
              {event.showDate && (
                <span className="flex items-center gap-1 text-pink-200">
                  <Calendar className="size-3" />
                  {formatEventDate(event.showDate)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {event.city || event.venue}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-bold text-white">
              {event.lowestPrice !== null ? `From ${formatPrice(event.lowestPrice)}` : ""}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default FeatConcert;
