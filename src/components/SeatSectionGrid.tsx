"use client"

import { useMemo } from "react"
import { Armchair } from "lucide-react"

export type ZoneTheme = {
  name: string
  color: string
  bgLight: string
  bgSelected: string
  bgOccupied: string
  ring: string
  border: string
  text: string
  badge: string
  emoji: string
  prefix: string
}

const ZONE_THEMES: Record<string, ZoneTheme> = {
  VIP: {
    name: "VIP",
    color: "purple",
    bgLight: "bg-purple-500/15 hover:bg-purple-400/40",
    bgSelected: "bg-purple-500 shadow-purple-900/50",
    bgOccupied: "bg-white/[0.04]",
    ring: "ring-purple-400",
    border: "border-purple-500/40",
    text: "text-purple-200",
    badge: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    emoji: "💜",
    prefix: "V",
  },
  GOLD: {
    name: "Gold",
    color: "amber",
    bgLight: "bg-amber-500/15 hover:bg-amber-400/40",
    bgSelected: "bg-amber-500 shadow-amber-900/50",
    bgOccupied: "bg-white/[0.04]",
    ring: "ring-amber-400",
    border: "border-amber-500/40",
    text: "text-amber-200",
    badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    emoji: "🥇",
    prefix: "G",
  },
  PLATINUM: {
    name: "Platinum",
    color: "blue",
    bgLight: "bg-blue-500/15 hover:bg-blue-400/40",
    bgSelected: "bg-blue-500 shadow-blue-900/50",
    bgOccupied: "bg-white/[0.04]",
    ring: "ring-blue-400",
    border: "border-blue-500/40",
    text: "text-blue-200",
    badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    emoji: "💎",
    prefix: "P",
  },
  SILVER: {
    name: "Silver",
    color: "slate",
    bgLight: "bg-slate-500/20 hover:bg-slate-400/40",
    bgSelected: "bg-slate-400 shadow-slate-900/50",
    bgOccupied: "bg-white/[0.04]",
    ring: "ring-slate-300",
    border: "border-slate-500/40",
    text: "text-slate-200",
    badge: "bg-slate-500/20 text-slate-300 border border-slate-400/30",
    emoji: "🥈",
    prefix: "S",
  },
  PREMIUM: {
    name: "Premium",
    color: "pink",
    bgLight: "bg-pink-500/15 hover:bg-pink-400/40",
    bgSelected: "bg-pink-500 shadow-pink-900/50",
    bgOccupied: "bg-white/[0.04]",
    ring: "ring-pink-400",
    border: "border-pink-500/40",
    text: "text-pink-200",
    badge: "bg-pink-500/20 text-pink-300 border border-pink-500/30",
    emoji: "✨",
    prefix: "PR",
  },
  GENERAL: {
    name: "General",
    color: "emerald",
    bgLight: "bg-emerald-500/15 hover:bg-emerald-400/40",
    bgSelected: "bg-emerald-500 shadow-emerald-900/50",
    bgOccupied: "bg-white/[0.04]",
    ring: "ring-emerald-400",
    border: "border-emerald-500/40",
    text: "text-emerald-200",
    badge: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    emoji: "🎫",
    prefix: "GA",
  },
  "VIP MEET": {
    name: "VIP Meet",
    color: "fuchsia",
    bgLight: "bg-fuchsia-500/15 hover:bg-fuchsia-400/40",
    bgSelected: "bg-fuchsia-500 shadow-fuchsia-900/50",
    bgOccupied: "bg-white/[0.04]",
    ring: "ring-fuchsia-400",
    border: "border-fuchsia-500/40",
    text: "text-fuchsia-200",
    badge: "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30",
    emoji: "🌟",
    prefix: "VM",
  },
}

const DEFAULT_THEME: ZoneTheme = {
  name: "Ticket",
  color: "violet",
  bgLight: "bg-violet-500/15 hover:bg-violet-400/40",
  bgSelected: "bg-violet-500 shadow-violet-900/50",
  bgOccupied: "bg-white/[0.04]",
  ring: "ring-violet-400",
  border: "border-violet-500/40",
  text: "text-violet-200",
  badge: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  emoji: "🎟️",
  prefix: "T",
}

export function getZoneTheme(ticketTypeName: string): ZoneTheme {
  const upper = ticketTypeName.toUpperCase()
  // Check for longer/more-specific keys first
  const sortedKeys = Object.keys(ZONE_THEMES).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (upper.includes(key)) return ZONE_THEMES[key]
  }
  return DEFAULT_THEME
}

export type ZoneSummary = {
  ticketTypeId: string
  name: string
  price: number
  remaining: number
  total: number
  theme: ZoneTheme
}

type Props = {
  ticketTypeName: string
  totalSeats: number
  occupiedSeats: string[]
  selectedSeats: string[]
  onToggle: (seat: string) => void
  maxSelect: number
  seatPrefix?: string
}

export default function SeatSectionGrid({
  ticketTypeName,
  totalSeats,
  occupiedSeats,
  selectedSeats,
  onToggle,
  maxSelect,
  seatPrefix,
}: Props) {
  const theme = getZoneTheme(ticketTypeName)
  const prefix = seatPrefix ?? theme.prefix

  const seats = useMemo(() => {
    return Array.from({ length: totalSeats }, (_, i) => `${prefix}${i + 1}`)
  }, [totalSeats, prefix])

  const occupiedSet = useMemo(() => new Set(occupiedSeats), [occupiedSeats])

  // Calculate cols: try to make it somewhat "stadium shaped" — wider for large venues
  const cols = totalSeats <= 20 ? 5 : totalSeats <= 50 ? 8 : totalSeats <= 100 ? 10 : 12

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${theme.badge}`}>
          {theme.emoji} {ticketTypeName} Zone
        </span>
        <span className="text-xs text-slate-400">
          {selectedSeats.length}/{maxSelect} selected · {seats.length - occupiedSeats.length} available
        </span>
      </div>

      {/* Seat grid */}
      <div
        className="mx-auto grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {seats.map((seat) => {
          const occupied = occupiedSet.has(seat)
          const isSelected = selectedSeats.includes(seat)
          return (
            <button
              key={seat}
              type="button"
              disabled={occupied}
              onClick={() => onToggle(seat)}
              aria-label={`Seat ${seat}`}
              className={`group relative flex aspect-square flex-col items-center justify-center rounded-lg text-[9px] font-bold transition-all duration-150 ${
                occupied
                  ? `cursor-not-allowed opacity-30 ${theme.bgOccupied}`
                  : isSelected
                    ? `${theme.bgSelected} shadow-lg text-white ring-2 ${theme.ring} scale-105`
                    : `${theme.bgLight} ${theme.text} border ${theme.border}`
              }`}
            >
              <Armchair className="mb-0.5 size-2.5 opacity-70" />
              {seat}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className={`size-3 rounded ${theme.bgSelected.split(" ")[0]}`} />
          Selected ({selectedSeats.length}/{maxSelect})
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`size-3 rounded border ${theme.border}`} />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-white/[0.04]" />
          Taken
        </span>
      </div>
    </div>
  )
}
