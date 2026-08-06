"use client"

import { useState } from "react"
import { Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TicketQuantityModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectQuantity: (quantity: number) => void
  initialQuantity?: number
  maxQuantity?: number
}

const QUANTITY_OPTIONS = [
  { count: 1, label: "Single", icon: "🛵" },
  { count: 2, label: "Couple", icon: "🚲" },
  { count: 3, label: "Trio", icon: "🚗" },
  { count: 4, label: "Quartet", icon: "🚗" },
  { count: 5, label: "Friends", icon: "🚙" },
  { count: 6, label: "Group", icon: "🚌" },
  { count: 7, label: "Party", icon: "🚌" },
  { count: 8, label: "Squad", icon: "🚌" },
  { count: 9, label: "Crew", icon: "🚌" },
  { count: 10, label: "Gang", icon: "🚌" },
]

export default function TicketQuantityModal({
  isOpen,
  onClose,
  onSelectQuantity,
  initialQuantity = 2,
  maxQuantity = 10,
}: TicketQuantityModalProps) {
  const [selected, setSelected] = useState(initialQuantity)

  if (!isOpen) return null

  const handleConfirm = () => {
    onSelectQuantity(selected)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-4">
        <div className="overflow-hidden rounded-3xl border border-white/15 bg-[#141620] shadow-2xl ring-1 ring-white/10">
          {/* Header */}
          <div className="relative border-b border-white/10 bg-[#1a1d2b] px-6 py-5 text-center">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-pink-500/20 text-pink-400">
              <Users className="size-6" />
            </div>
            <h2 className="text-lg font-black text-white">How many tickets?</h2>
            <p className="mt-1 text-xs text-slate-400">Select number of seats before picking your location</p>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Number grid (1-10) */}
            <div className="grid grid-cols-5 gap-2.5">
              {QUANTITY_OPTIONS.slice(0, maxQuantity).map((opt) => {
                const isSelected = selected === opt.count
                return (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => setSelected(opt.count)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-3 transition-all ${
                      isSelected
                        ? "border-pink-500 bg-gradient-to-b from-pink-500/25 to-pink-600/10 ring-2 ring-pink-500/30 scale-[1.03]"
                        : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <span className={`text-sm font-black ${isSelected ? "text-pink-300" : "text-white"}`}>
                      {opt.count}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">{opt.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Confirm button */}
            <Button
              type="button"
              onClick={handleConfirm}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-pink-950/40 hover:from-pink-400 hover:to-violet-500"
            >
              Select {selected} {selected === 1 ? "Seat" : "Seats"} →
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
