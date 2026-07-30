import { concertSec } from '@/lib/ConcertSections'
import Image from 'next/image'
import { MapPin, Calendar } from 'lucide-react'

const FeatConcert = () => {
  return (
    <div className='flex gap-3 flex-wrap'>
      {concertSec.map((concert) => (
        <div
          key={concert.id}
          className='group relative w-[160px] h-[240px] shrink-0 rounded-xl overflow-hidden cursor-pointer
            ring-1 ring-white/5 shadow-lg shadow-black/40
            transition-all duration-300 ease-out
            hover:scale-[1.07] hover:ring-2 hover:ring-pink-500/60 hover:shadow-pink-500/20 hover:shadow-xl
            hover:z-10'
        >
          {/* Poster image */}
          <Image
            src={concert.image}
            alt={concert.title}
            fill
            sizes='160px'
            className='object-cover transition-transform duration-300 group-hover:scale-105'
          />

          {/* Always-visible bottom gradient for readability */}
          <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />

          {/* LIVE badge — top-left */}
          <span className='absolute top-2 left-2 flex items-center gap-1 bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm'>
            <span className='w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block' />
            Live
          </span>

          {/* Bottom info — always visible */}
          <div className='absolute bottom-0 left-0 right-0 px-2.5 py-2'>
            <p className='text-white text-[11px] font-semibold leading-tight line-clamp-1 drop-shadow'>
              {concert.title}
            </p>
            <div className='flex items-center gap-2 mt-1 opacity-80 group-hover:opacity-100 transition-opacity'>
              <span className='flex items-center gap-0.5 text-pink-300 text-[9px]'>
                <Calendar className='w-2.5 h-2.5' />
                {concert.date}
              </span>
              <span className='flex items-center gap-0.5 text-slate-300 text-[9px]'>
                <MapPin className='w-2.5 h-2.5' />
                {concert.venue}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default FeatConcert
