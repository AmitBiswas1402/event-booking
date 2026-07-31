'use client'

import React, { useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'

const Search = () => {
  const [query, setQuery] = useState('')

  return (
    <div className="relative flex w-full max-w-2xl items-center">
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
        <SearchIcon className="size-4" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for Movies, Events, Plays, Sports and Activities"
        className="w-full rounded-full border border-white/10 bg-white/[0.06] py-2.5 pl-10 pr-4 text-xs text-white shadow-inner shadow-black/20 transition-all placeholder:text-slate-500 focus:border-pink-400/60 focus:bg-white/[0.08] focus:outline-none focus:ring-4 focus:ring-pink-500/10 md:text-sm"
      />
    </div>
  )
}

export default Search
