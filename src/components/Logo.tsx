import React from 'react'
import Link from 'next/link'

const Logo = () => {
  return (
    <Link href="/" className="flex shrink-0 select-none items-center text-xl font-bold tracking-tight md:text-2xl">
      <span className="font-extrabold text-white">Book</span>
      <span className="mx-1 inline-flex items-center justify-center rounded-md bg-pink-500 px-2 py-1 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-pink-950/30 md:text-sm">
        Events
      </span>
    </Link>
  )
}

export default Logo
