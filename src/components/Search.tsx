'use client'

import React, { useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'

const Search = () => {
  const [query, setQuery] = useState('')

  return (
    <div className="relative flex items-center w-full max-w-xl">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <SearchIcon className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for Movies, Events, Plays, Sports and Activities"
        className="w-full bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 text-xs md:text-sm pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all shadow-2xs"
      />
    </div>
  )
}

export default Search