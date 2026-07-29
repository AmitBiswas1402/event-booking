import { movieSec } from '@/lib/MovieSections'
import Image from 'next/image'

const FeatMovies = () => {
  return (
    <div className='flex gap-3 flex-wrap'>
      {movieSec.map((movie, id) => (
        <div
          key={id}
          className='group relative w-[160px] h-[240px] shrink-0 rounded-xl overflow-hidden cursor-pointer
            ring-1 ring-white/5 shadow-lg shadow-black/40
            transition-all duration-300 ease-out
            hover:scale-[1.07] hover:ring-2 hover:ring-pink-500/60 hover:shadow-pink-500/20 hover:shadow-xl
            hover:z-10'
        >
          <Image
            src={movie.image}
            alt='movie poster'
            fill
            sizes='160px'
            className='object-cover transition-transform duration-300 group-hover:scale-105'
          />
          {/* Subtle dark gradient at bottom for depth */}
          <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
        </div>
      ))}
    </div>
  )
}

export default FeatMovies