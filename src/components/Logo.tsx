import React from 'react'
import Link from 'next/link'

const Logo = () => {
  return (
    <Link href="/" className="flex items-center select-none font-bold text-xl md:text-2xl tracking-tight shrink-0">
      <span className="text-slate-900 dark:text-white font-extrabold">Book</span>
      <span className="bg-[#f84464] text-white px-1.5 py-0.5 rounded text-xs md:text-sm font-black uppercase tracking-wider mx-0.5 inline-flex items-center justify-center shadow-xs">
        Events
      </span>
    </Link>
  )
}

export default Logo
